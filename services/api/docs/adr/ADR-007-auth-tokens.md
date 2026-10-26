# ADR-007: Short access tokens, rotating refresh tokens, argon2id

- Status: Accepted (2026-10-24)
- Deciders: backend owner
- Related: REQ-AUTH-03, REQ-AUTH-04, schema `sessions`

## Context

The app runs on a phone that can be lost or taken by a controlling relative.
Sessions on shared devices must be revocable and visible.

## Decision

- Passwords are hashed with argon2id (memory-hard). Never SHA-256, never
  reversible encryption.
- Access token: JWT, 15 minutes, `sub`, `role`, `sessionId`, `iat`, `exp`. The
  role is read from the token for routing and re-checked against the database
  for privileged actions.
- Refresh token: opaque random value, 30 days, stored as a hash in `sessions`,
  grouped by `family_id`. Rotated on every use. Reuse of an already-rotated token
  revokes the whole family (theft detection).
- Logout revokes one session. The session list endpoint shows device label and
  last seen, and can revoke one or all.
- Therapist actions on an alert require a session younger than 4 hours
  (`REAUTH_REQUIRED`), even with a valid access token.

## Consequences

- A leaked access token is useful for at most 15 minutes.
- Refresh requires a database read; that is the point.
- Clients must handle `REAUTH_REQUIRED` as a re-login flow, not a generic 401.
