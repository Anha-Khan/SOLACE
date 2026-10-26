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
- Access token: JWT, 15 minutes, `sub`, `sid` (session), `role`, `type: access`,
  `iat`, `exp`. The role is re-read from the database on every request, so the
  claim is only a routing hint.
- Refresh token: JWT, 30 days, `sub`, `sid`, `fid` (family), `type: refresh` and
  a unique `jti`. Only its SHA-256 hash is stored in `sessions`. Rotated on every
  use; a token whose hash no longer matches the row is treated as reuse and the
  whole family is revoked (theft detection).
  - Deviation from the earlier "opaque random value" wording: `sid`/`fid` must
    be readable before the database lookup, and a signed token gives that without
    a second lookup table. The `jti` is required: without it, two rotations in
    the same second would sign byte-identical tokens and rotation would be a
    no-op. The hash is still the only stored secret material, so a database leak
    yields no usable token.
- Logout revokes one session. The session list endpoint shows device label and
  last seen, and can revoke one or all.
- Therapist actions on an alert require a session younger than 4 hours
  (`REAUTH_REQUIRED`), even with a valid access token.

## Consequences

- A leaked access token is useful for at most 15 minutes.
- Refresh requires a database read; that is the point.
- Clients must handle `REAUTH_REQUIRED` as a re-login flow, not a generic 401.
