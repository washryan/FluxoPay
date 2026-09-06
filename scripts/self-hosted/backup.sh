#!/usr/bin/env bash
set -euo pipefail

umask 077

backup_dir=${FLUXOPAY_BACKUP_DIR:-/data/atlas/apps/fluxopay/backups/encrypted}
export_dir=${FLUXOPAY_BACKUP_EXPORT_DIR:-/data/atlas/apps/fluxopay/backups/export}
passphrase_file=${FLUXOPAY_BACKUP_PASSPHRASE_FILE:-/data/atlas/secrets/fluxopay/backup-passphrase}
db_container=${FLUXOPAY_DB_CONTAINER:-fluxopay-db}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 700 "$backup_dir" "$export_dir"
plain_path=$(mktemp "${backup_dir}/.fluxopay-${timestamp}.XXXXXX.dump")
encrypted_temp=$(mktemp "${backup_dir}/.fluxopay-${timestamp}.XXXXXX.dump.gpg")
encrypted_path="${backup_dir}/fluxopay-${timestamp}.dump.gpg"
checksum_path="${encrypted_path}.sha256"

cleanup() {
  rm -f -- "$plain_path" "$encrypted_temp"
}
trap cleanup EXIT

test -r "$passphrase_file"
test ! -e "$encrypted_path"
test ! -e "$checksum_path"

docker exec "$db_container" pg_dump \
  -U postgres \
  -d postgres \
  -Fc \
  --no-owner \
  --schema=auth \
  --schema=public \
  --schema=supabase_migrations >"$plain_path"

test -s "$plain_path"

gpg --batch --quiet --yes \
  --pinentry-mode loopback \
  --passphrase-file "$passphrase_file" \
  --symmetric \
  --cipher-algo AES256 \
  --output "$encrypted_temp" \
  "$plain_path"

mv -- "$encrypted_temp" "$encrypted_path"
(
  cd "$backup_dir"
  sha256sum "$(basename "$encrypted_path")" >"$(basename "$checksum_path")"
)
chmod 600 "$encrypted_path" "$checksum_path"

printf 'Backup encrypted successfully: %s\n' "$encrypted_path"
