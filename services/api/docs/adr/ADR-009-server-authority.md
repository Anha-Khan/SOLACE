# ADR-009: The server owns every safety decision; the client is untrusted

- Status: Accepted (2026-10-24)
- Deciders: backend owner
- Related: Global Rule 3, ADR-002, ADR-008

## Context

The app works offline. A local database can be edited on a rooted phone, the
binary can be patched, and a captured request can be replayed. Any decision the
client can make is a decision an attacker can make.

## Decision

The client may propose, never decide. Rejected client-supplied fields:

| Field                            | Why                                                       |
| -------------------------------- | --------------------------------------------------------- |
| `role`, `verificationStatus`     | privilege escalation                                      |
| `stage`, `restrictionLevel`      | internal state, must never be visible or settable         |
| alert `state`                    | the alert state machine lives on the server               |
| task selection                   | server chooses from the library and the eligibility rules |
| `serverReceivedAt`, `historical` | server-set; a client cannot backdate to avoid escalation  |
| mood/survey scores               | recomputed on the server from item answers                |

Client-originated writes carry `clientId` and `clientCreatedAt`. The server:

1. deduplicates on `(userId, clientId)` and returns the original result with
   `duplicate: true`;
2. decides freshness from `clientCreatedAt` against the configured window (2 h);
3. flags a stale entry as `historical` and does not start an escalation timer,
   except that explicit Tier 3 language still notifies once (OD-9).

The validation pipe runs `whitelist: true, forbidNonWhitelisted: true`, so an
extra field is a 400 rather than a silently ignored value.

## Consequences

- The client must be able to render a decision it did not compute, including
  "your entry was flagged as historical".
- Offline queue retries are safe because writes are idempotent.
- A clock-skewed device produces `historical` entries; that is the intended,
  visible behaviour.
