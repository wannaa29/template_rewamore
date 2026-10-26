"""Isolated real-HTTP smoke test; temporary SQLite database and generated login.

Run with the project virtualenv: python scripts/smoke_http.py
This does not touch existing invitations or deploy anything to the internet.
"""
import http.cookiejar
import json
import os
from pathlib import Path
import re
import secrets
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def main():
    with tempfile.TemporaryDirectory(prefix='rewamore-smoke-') as temp:
        env = dict(os.environ, DEBUG='True', SECRET_KEY=secrets.token_hex(48),
                   DATABASE_URL=f'sqlite:///{temp}/db.sqlite3',
                   ALLOWED_HOSTS='127.0.0.1,localhost', PUBLIC_BASE_URL='',
                   SECURE_SSL_REDIRECT='False', TRUST_PROXY='False')
        password = secrets.token_urlsafe(32)
        env['SMOKE_PASSWORD'] = password
        def manage(*args):
            subprocess.run([sys.executable, 'manage.py', *args], cwd=ROOT, env=env,
                           check=True, stdout=subprocess.DEVNULL)
        manage('migrate', '--noinput')
        manage('import_themes')
        manage('shell', '-c', "import os; from django.contrib.auth import get_user_model; get_user_model().objects.create_user(username='smoke',password=os.environ['SMOKE_PASSWORD'])")
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        origin = f'http://127.0.0.1:{port}'
        log = open(Path(temp) / 'server.log', 'w+')
        process = subprocess.Popen([sys.executable, '-m', 'gunicorn', 'config.wsgi:application',
                                    '--bind', f'127.0.0.1:{port}', '--workers', '1'],
                                   cwd=ROOT, env=env, stdout=log, stderr=log)
        try:
            jar = http.cookiejar.CookieJar()
            client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
            def get(path):
                return client.open(origin + path, timeout=10)
            def post(path, payload):
                token = next(c.value for c in jar if c.name == 'csrftoken')
                body = urllib.parse.urlencode(dict(payload, csrfmiddlewaretoken=token)).encode()
                return client.open(urllib.request.Request(origin + path, body,
                    {'Referer': origin + path, 'X-CSRFToken': token}), timeout=10)
            for attempt in range(100):
                try:
                    assert json.load(get('/health/'))['status'] == 'ok'
                    break
                except (urllib.error.URLError, ConnectionError):
                    if process.poll() is not None:
                        raise RuntimeError('Gunicorn stopped unexpectedly')
                    time.sleep(.1)
            else:
                raise RuntimeError('HTTP server did not become ready')
            login = get('/')
            assert '/accounts/login/' in login.url
            assert 'Content-Security-Policy' in login.headers
            post('/accounts/login/', {'username': 'smoke', 'password': password}).read()
            assert 'Koleksi' in get('/dashboard/themes/').read().decode()
            created = post('/dashboard/themes/1/create/', {
                'title': 'Pernikahan Riswan & Iin', 'groom_name': 'Riswan', 'bride_name': 'Iin',
                'slug': 'riswan-dan-iin', 'event_date': '2027-06-19T10:00',
            })
            match = re.search(r'/dashboard/(\d+)/edit/', created.url)
            assert match, created.url
            pk = match.group(1)
            # The draft cannot be reached through its public URL.
            try:
                get('/riswan-dan-iin/')
                raise AssertionError('Draft page unexpectedly public')
            except urllib.error.HTTPError as error:
                assert error.code == 404
            names = ['Adrian dan Pasangan', 'Iin Sinurat dan Pasangan'] + [f'Tamu {i}' for i in range(3, 11)]
            post(f'/dashboard/{pk}/guests/', {'names': '\n'.join(names)}).read()
            exported = get(f'/dashboard/{pk}/guests/export/').read().decode('utf-8-sig')
            assert len(exported.splitlines()) == 11
            assert '?to=Adrian%20dan%20Pasangan' in exported
            assert '?to=Iin%20Sinurat%20dan%20Pasangan' in exported
            post(f'/dashboard/{pk}/publish/', {'action': 'publish'}).read()
            public = get('/riswan-dan-iin/?to=Adrian%20dan%20Pasangan')
            html = public.read().decode()
            assert 'Adrian dan Pasangan' in html
            assert 'Riswan' in html and 'Iin' in html
            assert 'no-store' in public.headers['Cache-Control']
            response = post('/riswan-dan-iin/rsvp/', {
                'name': 'Adrian dan Pasangan', 'attendance': 'yes', 'party_size': '2',
                'message': 'Selamat menempuh hidup baru.', 'publish_message': 'true',
            })
            assert response.status == 201 and json.load(response)['ok']
            assert len(json.load(get('/riswan-dan-iin/wishes/'))['wishes']) == 1
            assert 'Adrian dan Pasangan' in get(f'/dashboard/{pk}/guests/').read().decode()
            print('HTTP smoke PASS: Gunicorn, root/login + CSRF, theme gallery, create, private draft, 10 guest links, CSV, publish, personalized page, stored RSVP.')
        except Exception:
            log.flush(); log.seek(0)
            print(log.read(), file=sys.stderr)
            raise
        finally:
            process.terminate()
            process.wait(timeout=10)
            log.close()


if __name__ == '__main__':
    main()
