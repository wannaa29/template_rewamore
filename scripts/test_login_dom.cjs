'use strict';
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');
const loginScript = readFileSync(resolve(__dirname, '../static/studio/login.js'), 'utf8');
const studioScript = readFileSync(resolve(__dirname, '../static/studio/studio.js'), 'utf8');

function response(status, data, extra = {}) {
  return { status, ok: status >= 200 && status < 300, redirected: false,
    headers: { get: () => 'application/json' }, json: async () => data, ...extra };
}

function setup(queue) {
  const dom = new JSDOM(`<div role="alert" data-login-error hidden></div>
    <form method="post" action="/accounts/login/" data-login-form data-csrf-url="/accounts/csrf/">
      <input name="csrfmiddlewaretoken" value="stale"><input name="next" value="/dashboard/themes/">
      <input name="username" value="operator"><input name="password" type="password" value="test-password">
      <button type="submit">Masuk ke studio</button>
    </form>`, { url: 'https://studio.example.com/accounts/login/', runScripts: 'outside-only' });
  const { window } = dom;
  const calls = [];
  window.fetch = async (url, options) => {
    calls.push({ url, options });
    assert.ok(queue.length, 'unexpected extra request');
    const next = queue.shift();
    return typeof next === 'function' ? next() : next;
  };
  window.eval(studioScript);
  window.eval(loginScript);
  const form = window.document.querySelector('form');
  const button = form.querySelector('button');
  const error = window.document.querySelector('[data-login-error]');
  return { dom, window, form, button, error, calls,
    submit() {
      form.dispatchEvent(new window.SubmitEvent('submit', {
        cancelable: true, bubbles: true, submitter: button,
      }));
    },
  };
}

async function settle() {
  for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve));
}

test('uses fresh CSRF token and preserves credentials/next; prevents duplicate submits', async t => {
  let release;
  const app = setup([
    () => new Promise(resolve => { release = resolve; }),
    response(200, { redirect: '/accounts/login/#done' }),
  ]);
  t.after(() => app.dom.window.close());
  await settle();
  app.submit(); app.submit();
  app.window.dispatchEvent(new app.window.PageTransitionEvent('pageshow', { persisted: false }));
  app.submit();
  assert.equal(app.calls.length, 1);
  assert.equal(app.button.disabled, true);
  release(response(200, { csrfToken: 'fresh-token' }));
  await settle();
  assert.equal(app.calls.length, 2);
  const post = app.calls[1].options;
  assert.equal(post.body.get('csrfmiddlewaretoken'), 'fresh-token');
  assert.equal(post.body.get('username'), 'operator');
  assert.equal(post.body.get('password'), 'test-password');
  assert.equal(post.body.get('next'), '/dashboard/themes/');
  assert.equal(post.credentials, 'same-origin');
  assert.equal(post.mode, 'same-origin');
  assert.equal(post.cache, 'no-store');
  assert.equal(app.window.location.hash, '#done');
  assert.equal(app.form.elements.password.value, '');
});

test('refreshes and retries exactly once after token rotation', async t => {
  const app = setup([
    response(200, { csrfToken: 'first' }),
    response(403, { code: 'csrf_failed', retryable: true }),
    response(200, { csrfToken: 'second' }),
    response(200, { redirect: '/accounts/login/#done' }),
  ]);
  t.after(() => app.dom.window.close());
  app.submit(); await settle();
  assert.equal(app.calls.length, 4);
  assert.equal(app.calls[3].options.body.get('csrfmiddlewaretoken'), 'second');
  assert.equal(app.window.location.hash, '#done');
});

test('does not loop when cookies stay unavailable', async t => {
  const app = setup([
    response(200, { csrfToken: 'first' }),
    response(403, { code: 'csrf_failed', retryable: true }),
    response(200, { csrfToken: 'second' }),
    response(403, { code: 'csrf_failed', retryable: true, message: 'Aktifkan cookie.' }),
  ]);
  t.after(() => app.dom.window.close());
  app.submit(); await settle();
  assert.equal(app.calls.length, 4);
  assert.equal(app.error.textContent, 'Aktifkan cookie.');
  assert.equal(app.button.disabled, false);
});

for (const [label, status, data] of [
  ['untrusted origin', 403, { code: 'csrf_failed', retryable: false, message: 'Alamat tidak sesuai.' }],
  ['invalid password', 400, { message: 'Kata sandi belum sesuai.' }],
  ['rate limit', 429, { message: 'Coba lagi dalam lima menit.' }],
]) {
  test(`does not automatically retry ${label}`, async t => {
    const app = setup([response(200, { csrfToken: 'fresh' }), response(status, data)]);
    t.after(() => app.dom.window.close());
    app.submit(); await settle();
    assert.equal(app.calls.length, 2);
    assert.equal(app.error.textContent, data.message);
    assert.equal(app.error.hidden, false);
    assert.equal(app.button.disabled, false);
  });
}

test('network failure unlocks the form for a manual retry', async t => {
  const app = setup([
    () => { throw new Error('Network failed'); },
    response(200, { csrfToken: 'fresh' }),
    response(200, { redirect: '/accounts/login/#done' }),
  ]);
  t.after(() => app.dom.window.close());
  app.submit(); await settle();
  assert.equal(app.calls.length, 1);
  assert.equal(app.button.disabled, false);
  assert.equal(app.error.hidden, false);
  app.submit(); await settle();
  assert.equal(app.window.location.hash, '#done');
});

test('handles login already completed in another tab', async t => {
  const app = setup([
    response(200, { csrfToken: 'fresh' }),
    response(200, null, { redirected: true, url: 'https://studio.example.com/accounts/login/#done' }),
  ]);
  t.after(() => app.dom.window.close());
  app.submit(); await settle();
  assert.equal(app.window.location.hash, '#done');
});

test('rejects an external redirect and displays text as text', async t => {
  const app = setup([
    response(200, { csrfToken: 'fresh' }), response(200, { redirect: 'https://attacker.example/' }),
  ]);
  t.after(() => app.dom.window.close());
  app.submit(); await settle();
  assert.equal(app.window.location.origin, 'https://studio.example.com');
  assert.match(app.error.textContent, /Alamat tujuan/);
  assert.equal(app.button.disabled, false);
});
