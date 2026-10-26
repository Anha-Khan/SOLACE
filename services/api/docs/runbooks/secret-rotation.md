# Runbook: secret and key rotation

Applies to `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, the field-encryption data
key, and provider API keys.

Never put a secret value in a ticket, a chat, a log or this repository. Values
live in the secret manager; `.env` holds development values only.

## JWT signing secrets

Access tokens expire in 15 minutes, refresh tokens are opaque database rows, so a
signing-secret change does not invalidate refresh tokens.

1. Generate a new secret (`openssl rand -hex 32`).
2. Add it to the secret manager as the active value and keep the old one listed
   under a `_PREVIOUS` entry `[PLANNED]` until all access tokens expire.
3. Deploy. New tokens are signed with the new secret.
4. Wait 20 minutes (longer than the 15-minute access TTL), then remove the old
   value.
5. Force re-login only if you suspect compromise: revoke sessions with
   `UPDATE sessions SET revoked_at = now() WHERE revoked_at IS NULL` as the
   **owner** role, and accept that every user must sign in again.

## Field-encryption key

Rotation is per row via `key_id`; there is no flag day.

1. Add the new key version to the key provider. Do not remove the old one.
2. Deploy code whose active `key_id` is the new version. New writes use it.
3. Run the re-encryption job `[PLANNED, CP4]` in batches; it decrypts with the
   row's `key_id` and rewrites with the active one.
4. Verify zero rows still reference the old `key_id`:
   ```sql
   SELECT key_id, count(*) FROM journal_entries GROUP BY key_id;
   SELECT key_id, count(*) FROM safety_plans GROUP BY key_id;
   SELECT key_id, count(*) FROM therapist_profiles GROUP BY key_id;
   ```
5. Only then retire the old key version. Keep an offline backup of retired keys
   for the retention period: a lost key is lost patient data.

If a key is **compromised**, rotation alone does not undo the exposure. Follow
the incident process, notify per policy, and rotate every dependent secret.

## Provider keys (AI, FCM, SendGrid, SMS)

1. Create the new key at the provider.
2. Update the secret manager and deploy.
3. Confirm the integration path in staging (one classification, one push, one
   email).
4. Revoke the old key at the provider.
5. Check the provider dashboard for unexpected usage during the overlap.

## Verification

- `npm run typecheck && npm test` locally after config changes.
- `/ready` returns 200 on the deployed instance.
- A synthetic journal save still classifies (staging only).

## Development

`services/api/.env` is gitignored. If it leaks, it contains only local values;
rotate nothing, but check that the file was never copied into an image or a log.
