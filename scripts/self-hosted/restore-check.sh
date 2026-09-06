#!/usr/bin/env bash
set -euo pipefail

umask 077

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 BACKUP.dump.gpg fluxopay_restore_NAME [--cleanup]" >&2
  exit 2
fi

encrypted_path=$1
restore_database=$2
cleanup_database=${3:-}
passphrase_file=${FLUXOPAY_BACKUP_PASSPHRASE_FILE:-/data/atlas/secrets/fluxopay/backup-passphrase}
db_container=${FLUXOPAY_DB_CONTAINER:-fluxopay-db}

if [[ ! "$restore_database" =~ ^fluxopay_restore_[a-zA-Z0-9_]+$ ]]; then
  echo "Restore database must start with fluxopay_restore_." >&2
  exit 2
fi

test -r "$encrypted_path"
test -r "${encrypted_path}.sha256"
test -r "$passphrase_file"

(
  cd "$(dirname "$encrypted_path")"
  sha256sum --check "$(basename "${encrypted_path}.sha256")"
)

exists=$(docker exec "$db_container" psql -U postgres -d postgres -Atqc \
  "select count(*) from pg_database where datname = '$restore_database'")
if [[ "$exists" != "0" ]]; then
  echo "Refusing to overwrite existing database: $restore_database" >&2
  exit 1
fi

plain_path=$(mktemp /tmp/fluxopay-restore.XXXXXX.dump)
cleanup() {
  rm -f -- "$plain_path"
}
trap cleanup EXIT

gpg --batch --quiet --yes \
  --pinentry-mode loopback \
  --passphrase-file "$passphrase_file" \
  --decrypt \
  --output "$plain_path" \
  "$encrypted_path"

docker exec "$db_container" createdb -U postgres -T template0 "$restore_database"
docker exec "$db_container" psql -U postgres -d "$restore_database" -v ON_ERROR_STOP=1 \
  -c 'drop schema public'
docker cp "$plain_path" "${db_container}:/tmp/fluxopay-restore.dump"

restore_failed=0
docker exec "$db_container" pg_restore \
  -U postgres \
  -d "$restore_database" \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  /tmp/fluxopay-restore.dump || restore_failed=1
docker exec "$db_container" rm -f /tmp/fluxopay-restore.dump

if [[ "$restore_failed" != "0" ]]; then
  echo "Restore failed; the disposable database was retained for inspection." >&2
  exit 1
fi

docker exec "$db_container" psql -U postgres -d "$restore_database" -v ON_ERROR_STOP=1 -Atqc \
  "select 'auth_users=' || count(*) from auth.users;
   select 'transactions=' || count(*) from public.transactions;
   select 'migrations=' || count(*) from supabase_migrations.schema_migrations;"

if [[ "$cleanup_database" == "--cleanup" ]]; then
  docker exec "$db_container" dropdb -U postgres "$restore_database"
  echo "Disposable restore database removed."
else
  echo "Restore check passed; disposable database retained: $restore_database"
fi
