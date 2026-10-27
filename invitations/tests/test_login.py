"""Login regressions with real CSRF checks (Django's test default skips them)."""
import os
import runpy
from copy import deepcopy
from unittest.mock import patch

from bs4 import BeautifulSoup
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client, SimpleTestCase, TestCase, override_settings


@override_settings(
    PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'],
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}},
    ALLOWED_HOSTS=['testserver', 'studio.example.com'],
)
class LoginTests(TestCase):
    password = 'login-test-Only-92'

    @classmethod
    def setUpTestData(cls):
        cls.users = [get_user_model().objects.create_user(
            username=f'operator{i}', password=cls.password,
        ) for i in range(16)]

    def setUp(self):
        cache.clear()

    def browser(self):
        return Client(enforce_csrf_checks=True)

    def page_token(self, client):
        response = client.get('/accounts/login/')
        self.assertEqual(response.status_code, 200)
        return BeautifulSoup(response.content, 'html.parser').find(
            'input', {'name': 'csrfmiddlewaretoken'},
        )['value']

    def token(self, client):
        response = client.get('/accounts/csrf/')
        self.assertEqual(response.status_code, 200)
        return response.json()['csrfToken']

    def login(self, client, username='operator0', password=None, token=None, **extra):
        return client.post('/accounts/login/', {
            'username': username,
            'password': self.password if password is None else password,
            'csrfmiddlewaretoken': token or self.token(client),
        }, **extra)

    def test_more_than_ten_users_on_same_ip_can_login(self):
        sessions = set()
        for user in self.users:
            browser = self.browser()
            response = self.login(browser, username=user.username,
                                  token=self.page_token(browser))
            self.assertEqual(response.status_code, 302, user.username)
            self.assertEqual(browser.session['_auth_user_id'], str(user.pk))
            sessions.add(browser.cookies[settings.SESSION_COOKIE_NAME].value)
        self.assertEqual(len(sessions), len(self.users))

    def test_same_account_has_independent_sessions_on_many_devices(self):
        browsers = [self.browser() for _ in range(16)]
        for browser in browsers:
            self.assertEqual(self.login(browser).status_code, 302)
        sessions = {b.cookies[settings.SESSION_COOKIE_NAME].value for b in browsers}
        self.assertEqual(len(sessions), len(browsers))
        first = browsers[0]
        first.post('/accounts/logout/', {'csrfmiddlewaretoken': self.token(first)})
        for browser in browsers[1:]:
            self.assertEqual(browser.get('/dashboard/').status_code, 200)

    def test_token_endpoint_works_without_login_and_is_not_cached(self):
        browser = self.browser()
        first = browser.get('/accounts/csrf/')
        secret = browser.cookies[settings.CSRF_COOKIE_NAME].value
        second = browser.get('/accounts/csrf/')
        self.assertIn('no-store', first['Cache-Control'])
        self.assertIn('Cookie', first['Vary'])
        self.assertNotEqual(first.json()['csrfToken'], second.json()['csrfToken'])
        self.assertEqual(browser.cookies[settings.CSRF_COOKIE_NAME].value, secret)
        self.assertEqual(browser.post('/accounts/csrf/').status_code, 403)
        self.assertEqual(browser.post('/accounts/csrf/', {
            'csrfmiddlewaretoken': second.json()['csrfToken'],
        }).status_code, 405)

    def test_refresh_recovers_first_visit_cookie_race_between_tabs(self):
        first, second = self.browser(), self.browser()
        stale = self.page_token(first)
        self.page_token(second)
        # Two first visits start without cookies. The last response wins in the browser.
        first.cookies = deepcopy(second.cookies)
        rejected = self.login(first, token=stale, HTTP_ACCEPT='application/json')
        self.assertEqual(rejected.status_code, 403)
        self.assertTrue(rejected.json()['retryable'])
        self.assertNotIn('_auth_user_id', first.session)
        recovered = self.login(first, HTTP_ACCEPT='application/json')
        self.assertEqual(recovered.status_code, 200)
        self.assertEqual(recovered.json()['redirect'], '/dashboard/')

    def test_refresh_recovers_token_rotated_by_another_tab(self):
        browser = self.browser()
        stale = self.page_token(browser)
        self.assertEqual(self.login(browser, token=stale).status_code, 302)
        self.assertEqual(self.login(browser, token=stale,
                                    HTTP_ACCEPT='application/json').status_code, 403)
        # The other tab shares the authenticated browser cookie, so Django redirects.
        refreshed = self.login(browser)
        self.assertEqual(refreshed.status_code, 302)
        self.assertEqual(refreshed.url, '/dashboard/')

    def test_missing_cookie_token_and_other_browser_token_stay_rejected(self):
        first, second = self.browser(), self.browser()
        foreign_token = self.token(first)
        no_cookie = second.post('/accounts/login/', {
            'username': 'operator0', 'password': self.password,
            'csrfmiddlewaretoken': foreign_token,
        }, HTTP_ACCEPT='application/json')
        self.assertEqual(no_cookie.status_code, 403)
        self.token(second)
        for token in ('', foreign_token, 'malformed'):
            response = second.post('/accounts/login/', {
                'username': 'operator0', 'password': self.password,
                'csrfmiddlewaretoken': token,
            }, HTTP_ACCEPT='application/json')
            self.assertEqual(response.status_code, 403)
            self.assertNotIn('_auth_user_id', second.session)

    def test_untrusted_origin_is_not_retryable_even_with_valid_token(self):
        browser = self.browser()
        response = self.login(browser, HTTP_ORIGIN='https://attacker.example',
                              HTTP_ACCEPT='application/json')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(response.json()['retryable'])
        self.assertNotIn('_auth_user_id', browser.session)

    @override_settings(SECURE_PROXY_SSL_HEADER=('HTTP_X_FORWARDED_PROTO', 'https'))
    def test_https_proxy_login_and_secure_cookies(self):
        with override_settings(SESSION_COOKIE_SECURE=True, CSRF_COOKIE_SECURE=True):
            browser = self.browser()
            token = self.token(browser)
            response = self.login(browser, token=token,
                HTTP_HOST='studio.example.com', HTTP_ORIGIN='https://studio.example.com',
                HTTP_X_FORWARDED_PROTO='https')
            self.assertEqual(response.status_code, 302)
            self.assertTrue(response.cookies[settings.SESSION_COOKIE_NAME]['secure'])
            self.assertTrue(response.cookies[settings.CSRF_COOKIE_NAME]['secure'])

    def test_https_referer_without_origin_is_checked(self):
        browser = self.browser()
        bad = self.login(browser, secure=True, HTTP_REFERER='https://attacker.example/',
                         HTTP_ACCEPT='application/json')
        self.assertEqual(bad.status_code, 403)
        self.assertFalse(bad.json()['retryable'])
        good = self.login(browser, secure=True, HTTP_REFERER='https://testserver/accounts/login/')
        self.assertEqual(good.status_code, 302)

    def test_failed_attempts_only_block_same_account_and_ip(self):
        browser = self.browser()
        for _ in range(10):
            self.assertEqual(self.login(browser, password='wrong').status_code, 200)
        blocked = self.login(browser, HTTP_ACCEPT='application/json')
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(blocked['Retry-After'], '300')
        self.assertEqual(self.login(self.browser(), username='operator1').status_code, 302)
        self.assertEqual(self.login(self.browser(), REMOTE_ADDR='192.0.2.20').status_code, 302)

    def test_success_clears_previous_failures(self):
        for _ in range(12):
            browser = self.browser()
            self.assertEqual(self.login(browser, password='wrong').status_code, 200)
            self.assertEqual(self.login(browser).status_code, 302)

    @override_settings(TRUST_PROXY=True)
    def test_proxy_users_do_not_share_a_failure_bucket(self):
        browser = self.browser()
        for _ in range(10):
            self.login(browser, password='wrong', HTTP_X_FORWARDED_FOR='192.0.2.1')
        self.assertEqual(self.login(browser, HTTP_X_FORWARDED_FOR='192.0.2.1').status_code, 429)
        self.assertEqual(self.login(self.browser(), HTTP_X_FORWARDED_FOR='192.0.2.2').status_code, 302)

    @override_settings(TRUST_PROXY=False)
    def test_untrusted_forwarded_ip_cannot_bypass_failure_limit(self):
        browser = self.browser()
        for _ in range(10):
            self.login(browser, password='wrong', HTTP_X_FORWARDED_FOR='192.0.2.1')
        self.assertEqual(self.login(browser, HTTP_X_FORWARDED_FOR='192.0.2.2').status_code, 429)

    def test_json_authentication_and_safe_next_redirect(self):
        browser = self.browser()
        token = self.token(browser)
        invalid = self.login(browser, password='wrong', token=token, HTTP_ACCEPT='application/json')
        self.assertEqual(invalid.status_code, 400)
        self.assertNotIn(self.password, invalid.content.decode())
        response = browser.post('/accounts/login/', {
            'username': 'operator0', 'password': self.password,
            'csrfmiddlewaretoken': token, 'next': 'https://attacker.example/',
        }, HTTP_ACCEPT='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['redirect'], '/dashboard/')
        self.assertNotIn(self.password, response.content.decode())
        self.assertIn('no-store', response['Cache-Control'])

    def test_native_post_works_without_javascript_and_keeps_safe_next(self):
        browser = self.browser()
        response = browser.post('/accounts/login/', {
            'username': 'operator0', 'password': self.password,
            'csrfmiddlewaretoken': self.page_token(browser), 'next': '/dashboard/themes/',
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, '/dashboard/themes/')

    def test_native_csrf_failure_renders_fresh_form_without_password(self):
        browser = self.browser()
        response = browser.post('/accounts/login/', {
            'username': 'operator0', 'password': self.password,
            'next': '/dashboard/themes/',
        })
        self.assertEqual(response.status_code, 403)
        self.assertTemplateUsed(response, 'registration/login.html')
        self.assertContains(response, 'operator0', status_code=403)
        self.assertNotContains(response, self.password, status_code=403)
        self.assertIn('no-store', response['Cache-Control'])
        soup = BeautifulSoup(response.content, 'html.parser')
        token = soup.find('input', {'name': 'csrfmiddlewaretoken'})['value']
        self.assertEqual(self.login(browser, token=token).status_code, 302)


class LoginConfigurationTests(SimpleTestCase):
    def test_declared_public_origin_is_trusted_without_trusting_other_hosts(self):
        with patch.dict(os.environ, {
            'DEBUG': 'False', 'SECRET_KEY': 'test-key-' * 8,
            'PUBLIC_BASE_URL': 'https://studio.example.com:8443/',
            'CSRF_TRUSTED_ORIGINS': ' https://extra.example.com/ ',
            'ALLOWED_HOSTS': 'localhost',
        }, clear=True):
            config = runpy.run_path(str(settings.BASE_DIR / 'config/settings.py'))
        self.assertIn('https://studio.example.com:8443', config['CSRF_TRUSTED_ORIGINS'])
        self.assertIn('https://extra.example.com', config['CSRF_TRUSTED_ORIGINS'])
        self.assertIn('studio.example.com', config['ALLOWED_HOSTS'])
        self.assertNotIn('*', config['ALLOWED_HOSTS'])
        self.assertNotIn('https://attacker.example', config['CSRF_TRUSTED_ORIGINS'])
