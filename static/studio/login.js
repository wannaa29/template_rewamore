/* Refresh the browser's CSRF token before login; keep native POST as fallback. */
(() => {
  'use strict';
  const form = document.querySelector('[data-login-form]');
  if (!form || !window.fetch || !window.FormData || !window.AbortController) return;
  const button = form.querySelector('button[type="submit"]');
  const errorBox = document.querySelector('[data-login-error]');
  const buttonText = button.textContent;
  let submitting = false;

  function setBusy(busy) {
    submitting = busy;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
    button.textContent = busy ? 'Sedang masuk…' : buttonText;
  }

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        ...options, credentials: 'same-origin', mode: 'same-origin', cache: 'no-store',
        headers: { Accept: 'application/json' }, signal: controller.signal,
      });
      const json = response.headers.get('Content-Type')?.includes('application/json');
      const data = json ? await response.json() : null;
      return { response, data };
    } finally {
      window.clearTimeout(timer);
    }
  }

  function navigate(url) {
    const destination = new URL(url, window.location.href);
    if (destination.origin !== window.location.origin) {
      throw new Error('Alamat tujuan login tidak sesuai. Muat ulang halaman ini.');
    }
    form.elements.password.value = '';
    window.location.assign(destination.href);
  }

  window.addEventListener('pageshow', event => {
    if (event.persisted) setBusy(false);
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    setBusy(true);
    errorBox.hidden = true;
    errorBox.textContent = '';
    try {
      // Retry only a CSRF rejection: it happens before authentication. Never
      // automatically repeat invalid-password, rate-limit or network failures.
      for (let attempt = 0; attempt < 2; attempt++) {
        const fresh = await request(form.dataset.csrfUrl);
        if (!fresh.response.ok || !fresh.data?.csrfToken) {
          throw new Error('Halaman login belum dapat diperbarui. Silakan coba lagi.');
        }
        form.elements.csrfmiddlewaretoken.value = fresh.data.csrfToken;
        const { response, data } = await request(form.action, {
          method: 'POST', body: new FormData(form),
        });
        // Another tab may have completed login; LoginView then redirects.
        if (response.ok && response.redirected) {
          navigate(response.url);
          return;
        }
        if (response.ok && data?.redirect) {
          navigate(data.redirect);
          return;
        }
        if (attempt === 0 && response.status === 403 &&
            data?.code === 'csrf_failed' && data.retryable === true) continue;
        throw new Error(data?.message || 'Login belum berhasil. Silakan coba lagi.');
      }
    } catch (error) {
      errorBox.textContent = error instanceof TypeError || error.name === 'AbortError'
        ? 'Koneksi terputus atau terlalu lama. Periksa koneksi lalu coba masuk kembali.'
        : error.message;
      errorBox.hidden = false;
    } finally {
      setBusy(false);
    }
  });
})();
