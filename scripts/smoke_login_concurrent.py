"""Real HTTP regression: 24 simultaneous clients against three Gunicorn workers.

Creates only temporary users/database/cache. Run: python scripts/smoke_login_concurrent.py
This checks correctness under concurrency, not a production capacity guarantee.
"""
from concurrent.futures import ThreadPoolExecutor
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
CLIENTS = 24


def main():
    with tempfile.TemporaryDirectory(prefix='rewamore-login-') as temp:
        password = secrets.token_urlsafe(32)
        env = dict(os.environ, DEBUG='True', SECRET_KEY=secrets.token_hex(48),
                   DATABASE_URL=f'sqlite:///{temp}/db.sqlite3',
                   CACHE_LOCATION=f'{temp}/cache', ALLOWED_HOSTS='127.0.0.1,localhost',
                   CSRF_TRUSTED_ORIGINS='', PUBLIC_BASE_URL='',
                   SECURE_SSL_REDIRECT='False', TRUST_PROXY='False',
                   SMOKE_PASSWORD=password)

        def manage(*args):
            subprocess.run([sys.executable, 'manage.py', *args], cwd=ROOT, env=env,
                           check=True, stdout=subprocess.DEVNULL)

        manage('migrate', '--noinput')
        manage('shell', '-c',
               'import os; from django.contrib.auth import get_user_model; '
               'from django.contrib.auth.hashers import make_password; '
               'User=get_user_model(); encoded=make_password(os.environ["SMOKE_PASSWORD"]); '
               f'User.objects.bulk_create([User(username=f"loaduser{{i}}", password=encoded) for i in range({CLIENTS})])')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        origin = f'http://127.0.0.1:{port}'
        with open(Path(temp) / 'server.log', 'w+') as log:
            process = subprocess.Popen([
                sys.executable, '-m', 'gunicorn', 'config.wsgi:application',
                '--bind', f'127.0.0.1:{port}', '--workers', '3', '--timeout', '60',
                '--access-logfile', '-',
            ], cwd=ROOT, env=env, stdout=log, stderr=log)

            def browser():
                jar = http.cookiejar.CookieJar()
                client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
                return client, jar

            def get(client, path):
                return client.open(origin + path, timeout=60)

            def token(client):
                with get(client, '/accounts/csrf/') as response:
                    assert 'no-store' in response.headers['Cache-Control']
                    return json.load(response)['csrfToken']

            def post(client, path, data):
                request = urllib.request.Request(origin + path,
                    urllib.parse.urlencode(data).encode(), {
                        'Origin': origin, 'Referer': origin + '/accounts/login/',
                        'Accept': 'application/json',
                    })
                return client.open(request, timeout=60)

            try:
                for _ in range(100):
                    try:
                        with urllib.request.urlopen(origin + '/health/', timeout=1) as response:
                            assert json.load(response)['status'] == 'ok'
                        break
                    except (urllib.error.URLError, ConnectionError):
                        if process.poll() is not None:
                            raise RuntimeError('Gunicorn stopped unexpectedly')
                        time.sleep(.1)
                else:
                    raise RuntimeError('Gunicorn did not become ready')

                def wave(same_account):
                    barrier = threading.Barrier(CLIENTS, timeout=60)

                    def login(index):
                        client, jar = browser()
                        current = token(client)
                        username = 'loaduser0' if same_account else f'loaduser{index}'
                        barrier.wait()
                        with post(client, '/accounts/login/', {
                            'username': username, 'password': password,
                            'csrfmiddlewaretoken': current,
                        }) as response:
                            assert response.status == 200
                            assert json.load(response)['redirect'] == '/dashboard/'
                        with get(client, '/dashboard/') as response:
                            page = BeautifulSoup(response.read(), 'html.parser')
                            account = page.select_one('.account-name')
                            assert account is not None, (
                                f'Missing account for {username}: HTTP {response.status}, '
                                f'URL {response.url}, title {page.title}, '
                                f'cookie names {[c.name for c in jar]}'
                            )
                            assert account.get_text(strip=True) == username
                        session = next(c.value for c in jar if c.name == 'sessionid')
                        return client, session

                    with ThreadPoolExecutor(max_workers=CLIENTS) as pool:
                        clients = list(pool.map(login, range(CLIENTS)))
                    assert len({session for _, session in clients}) == CLIENTS
                    return clients

                wave(same_account=False)
                clients = wave(same_account=True)
                first = clients[0][0]
                with post(first, '/accounts/logout/', {'csrfmiddlewaretoken': token(first)}):
                    pass
                for client, _ in clients[1:]:
                    with get(client, '/dashboard/') as response:
                        assert urllib.parse.urlsplit(response.url).path == '/dashboard/'
                print(f'PASS: {CLIENTS} different accounts and {CLIENTS} devices using one account; '
                      'same IP, simultaneous HTTP login, three Gunicorn workers, '
                      'CSRF enforced, independent sessions, logout isolated.')
            except Exception:
                log.flush()
                log.seek(0)
                print(log.read(), file=sys.stderr)
                raise
            finally:
                process.terminate()
                process.wait(timeout=15)


if __name__ == '__main__':
    main()
