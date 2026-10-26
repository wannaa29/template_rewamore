#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
if [ ! -f .env ]; then cp .env.example .env; fi
.venv/bin/python manage.py migrate
.venv/bin/python manage.py import_themes
echo "Tema siap. Buat akun: .venv/bin/python manage.py createsuperuser"
echo "Jalankan: .venv/bin/python manage.py runserver"
