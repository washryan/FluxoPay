# FluxoPay self-hosted staging

This staging installation is not the production source of truth. Supabase Cloud
and Vercel remain the rollback path until the final cutover is authorized.

## Project status — PAUSED AFTER F3.3

- Status: **PAUSED AFTER F3.3**.
- F3.3 completion commit: `1d51c9e6e70fd5eefd6cb16e0945e40af5f58beb`.
- Integration branch: `integration/self-hosted`.
- The self-hosted installation remains a read-only staging environment, not the
  production source of truth.
- Resume only with explicit authorization to begin F3.4.
- No cutover has been performed. Supabase Cloud and Vercel remain active as the
  production system and rollback path.
- Keep both staging write protections enabled: the application-level
  `FLUXOPAY_READ_ONLY=true` guard and the Cloudflare staging read-only WAF rule.
- Keep the Telegram bot and notification worker disconnected from real runtime
  operation until separately authorized.

### F3.4 blockers and resume checklist

1. Select an off-machine destination for encrypted backups, implement the
   transfer, and prove a restore from that copy.
2. Define the final synchronization procedure and maintenance/read-only window
   for the current Cloud/Vercel production environment.
3. Create and verify fresh encrypted backups immediately before synchronization.
4. Export production data read-only and preserve Auth users, identities,
   password hashes, UUIDs, ownership, timestamps, and financial relationships.
5. Compare Cloud and ATLAS counts, financial checksums, foreign-key integrity,
   Auth users, and identities after the final synchronization.
6. Re-run migrations as applicable, pgTAP, application tests, bot tests, builds,
   and authenticated route checks against the synchronized ATLAS database.
7. Prove login and read-only financial views before enabling any write path.
8. Obtain explicit authorization before removing both staging write guards;
   their removal must be coordinated only after the data comparison passes.
9. Define cutover acceptance criteria, rollback triggers, and rollback window;
   preserve Supabase Cloud and Vercel until that window closes.
10. Authorize and validate the real Telegram bot and worker separately after the
    backend cutover, including their leases and notification safety controls.
11. Revisit public Auth rate limiting. The available Cloudflare Free rule only
    supports a 10-second period and duration, so no unsuitable rule was enabled;
    GoTrue's internal limits remain the current protection.
12. SMTP recovery is configured and validated, but should be rechecked after the
    final URL/configuration freeze and before production acceptance.

## Runtime

- Web: `http://192.168.1.202:3110`
- Supabase API/Auth: `http://192.168.1.202:54331`
- Public web: `https://fluxopay.ryanleal.com.br`
- Public Supabase API/Auth: `https://fluxopay-api.ryanleal.com.br`
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

## Cloudflare Tunnel

The remotely managed `ryanleal-atlas` tunnel runs from the pinned compose file
without publishing host ports:

```bash
docker compose -f compose.cloudflare.yml up -d
docker inspect ryanleal-atlas-tunnel --format '{{json .State.Health}}'
docker logs --tail 100 ryanleal-atlas-tunnel
docker compose -f compose.cloudflare.yml restart tunnel
```

Its token lives only in
`/data/atlas/secrets/fluxopay/cloudflare-tunnel.env` (mode 600). Public hostname
routes are managed remotely in Cloudflare:

- `fluxopay.ryanleal.com.br` -> `http://fluxopay-web:3000`
- `fluxopay-api.ryanleal.com.br` -> `http://fluxopay-api-gw:8000`

The connector shares only the dedicated `fluxopay-edge` network with the web
and gateway services. It does not join `fluxopay-internal`, cannot address
PostgreSQL directly, and publishes no inbound port.

Cloudflare rules required before cutover:

- `FluxoPay private bypass`: bypass cache for both FluxoPay public hostnames.
- `FluxoPay staging read-only`: block public `POST`, `PUT`, `PATCH`, and
  `DELETE` requests under `fluxopay-api.ryanleal.com.br/rest/v1/`.
- A hostname-scoped 308 redirect upgrades HTTP to HTTPS while preserving the
  path, query string, and request method.

The Cloudflare Free rate-limit interface available during staging only offered
a 10-second counting period and 10-second mitigation timeout. No rule was
deployed with improvised values. GoTrue retains its internal email and token
limits; stronger edge rate limiting remains a cutover hardening item.

The persistent Supabase stack must always be operated with both its base file
and the ATLAS override. Omitting the override selects the wrong data mount and
network topology:

```bash
docker compose \
  --env-file /data/atlas/secrets/fluxopay/self-hosted.env \
  -f /data/atlas/apps/fluxopay/compose/docker-compose.yml \
  -f /data/atlas/apps/fluxopay/config/docker-compose.atlas.yml \
  ps
```

Before the final data synchronization, keep `FLUXOPAY_READ_ONLY=true` in the
web runtime env. The proxy rejects every Next.js Server Action with HTTP 423,
the automatic overdue-status synchronization is disabled, and the dedicated
`/auth/signout` route keeps logout functional. Public `/rest/v1` write methods
must also be blocked by the temporary Cloudflare staging rule. Removing these
guards in F3.4 requires an explicit env/rule change and web container
recreation.

## SMTP

GoTrue sends transactional Auth email through Resend using the verified
`mail.ryanleal.com.br` sending subdomain. Credentials live only in:

```text
/data/atlas/secrets/fluxopay/smtp.env
```

The operational self-hosted env receives the corresponding SMTP variables; do
not put them in Git, images, logs, or shell examples. Auth has outbound access
through its egress network but publishes no port.

Password recovery uses a custom GoTrue template served internally by the web
container. Email links first open `/auth/recovery/confirm` and require an
explicit user click before `verifyOtp` consumes the one-time token. This avoids
email-security scanners invalidating the token during link prefetch. The flow
then opens `/reset-password`; it has been validated through HTTPS with the
self-hosted user.

The Cloudflare DNS records for SMTP must remain DNS-only and exactly match the
values issued by Resend. Rotate the Resend credential by updating `smtp.env`,
merging the protected operational env, and recreating only `fluxopay-auth` with
`--no-deps`.
