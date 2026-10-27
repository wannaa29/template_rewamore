#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
target="${1:-./backups}"
mkdir -p "$target"
stamp="$(date +%Y%m%d-%H%M%S)"
umask 077
docker compose exec -T db pg_dump -U rewamore -d rewamore -Fc > "$target/database-$stamp.dump"
docker compose exec -T web tar -czf - -C /app/var media > "$target/media-$stamp.tar.gz"
echo "Backup tersimpan pada $target. Salin ke lokasi terpisah dari VPS."
