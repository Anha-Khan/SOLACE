# ADR-003: PostgreSQL is the truth, Redis is disposable

- Status: Accepted (2026-10-24)
- Deciders: backend owner
- Related: R-ESC-1, B01, architecture.md

## Context

Escalation runs at 0 / 30 minutes / 2 hours / 6 hours and must survive a restart,
a deploy and a Redis flush. Missing an escalation step is a safety failure.
Redis is convenient for delayed jobs but is not durable enough to be the only
record of an outstanding alert.

## Decision

- Every alert, its state and every transition are rows in PostgreSQL
  (`crisis_alerts`, `alert_events`).
- Redis/BullMQ carries timers and job payloads. A job payload contains ids only.
- Every job is idempotent and keyed by `(alertId, step)`; running it twice is
  harmless because `alert_events` records the step.
- On boot and every 5 minutes, a reconciler reads open alerts from PostgreSQL,
  compares the due steps, and re-enqueues anything missing or late.
- Losing Redis may delay an escalation by at most one reconcile interval. It can
  never lose an alert.

## Consequences

- Redis can be restarted or wiped in development without losing state.
- The reconciler is safety-critical code and needs its own tests `[PLANNED]`.
- A clock that jumps backwards must not cause duplicate escalation; steps are
  recorded, not inferred from elapsed time alone.
