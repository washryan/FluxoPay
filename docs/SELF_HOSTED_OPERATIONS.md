# FluxoPay self-hosted staging

This staging installation is not the production source of truth. Supabase Cloud
and Vercel remain the rollback path until the final cutover is authorized.

## Runtime

- Web: `http://192.168.1.202:3110`
- Supabase API/Auth: `http://192.168.1.202:54331`
- PostgreSQL, Studio, and postgres-meta are Docker-internal only.
- Operational secrets live under `/data/atlas/secrets/fluxopay/` with mode 600.
- Persistent application state lives under `/data/atlas/apps/fluxopay/`.

The web image is built with the browser-facing Supabase URL and anon key. The
anon key is public by design; the service-role key must never be supplied to the
web image or container. Set `SUPABASE_INTERNAL_URL` in the runtime-only web env
to the Docker gateway (currently `http://fluxopay-api-gw:8000`). The Supabase
client still uses the browser-facing URL as its public identity and cookie
prefix; only server-side HTTP transport is rewritten to avoid host-port hairpin
routing.

## Health and logs

```bash
curl -fsS http://192.168.1.202:3110/api/health
docker ps --filter name=fluxopay-
docker logs --tail 100 fluxopay-web
docker inspect fluxopay-web --format '{{json .State.Health}}'
docker exec fluxopay-db pg_isready -U postgres
```

Container logs use Docker `json-file` rotation with a 10 MiB limit and three
files for the web service. The persistent Supabase override must apply the same
policy to its services.

## Encrypted backups

The encryption passphrase is stored separately at:

```text
/data/atlas/secrets/fluxopay/backup-passphrase
```

Create a backup:

```bash
scripts/self-hosted/backup.sh
```

Preview retention decisions without deleting anything:

```bash
scripts/self-hosted/retention.sh --dry-run
```

Validate an encrypted backup by restoring it into a new disposable database:

```bash
scripts/self-hosted/restore-check.sh \
  /data/atlas/apps/fluxopay/backups/encrypted/BACKUP.dump.gpg \
  fluxopay_restore_check \
  --cleanup
```

The restore script refuses database names without the `fluxopay_restore_`
prefix and refuses to overwrite an existing database.

Encrypted files prepared for future off-machine transfer belong in:

```text
/data/atlas/apps/fluxopay/backups/export/
```

No external destination is configured yet. A tested off-machine copy remains a
cutover blocker.

## SMTP

SMTP is intentionally not configured. Signup confirmation, password recovery,
and email changes are not production-ready until a domain and SMTP provider are
configured.
