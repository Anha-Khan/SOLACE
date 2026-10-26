# Runbook: stuck or missing crisis escalation

Severity: **S1**, page the on-call immediately. A patient may be at risk and the
system is not doing what it promised.

## Symptoms

- An alert is `delivered`/`dispatched` long past its step interval and no
  `alert_events` row was written.
- `/ready` returns 503 with `redis` failing.
- The reconciler has not logged a pass within 5 minutes.
- A therapist reports "no alert arrived".

## 1. Establish the facts (2 minutes)

```sql
-- Open alerts and their age
SELECT id, user_id, state, escalated_external, created_at,
       now() - created_at AS age
FROM crisis_alerts
WHERE state NOT IN ('resolved', 'closed')
ORDER BY created_at;

-- Steps already recorded for one alert
SELECT from_state, to_state, actor, at
FROM alert_events
WHERE alert_id = '<id>'
ORDER BY at;
```

Do not update `crisis_alerts` or `alert_events` by hand. History is append-only.

## 2. If Redis is down

1. Confirm: `docker compose -f docker-compose.dev.yml ps` (local) or the
   provider console (deployed).
2. Restart Redis. PostgreSQL still holds every alert.
3. Restart the API so the boot reconciler re-enqueues missing steps.
4. Watch the reconciler log for the alert id.
5. If a step is overdue by more than one interval, the human escalation is now
   the primary path: follow step 3 below while the system catches up.

## 3. Do the human thing first

If any alert is unacknowledged and a therapist is connected, contact the
therapist directly using the on-call contact list. If no therapist is connected,
follow the external escalation path in the clinical operations document. A
database fix never replaces a phone call.

## 4. Re-enqueue safely

The reconciler is idempotent and keyed by `(alert_id, step)`. Re-running it is
always the correct repair; manually calling a notifier is not.

```
# restart the service (reconciler runs on boot), then watch:
#   reconciler pass: open=<n> enqueued=<m>
```

## 5. Verify

- New `alert_events` rows exist for every due step.
- The alert state matches the last recorded transition.
- The therapist sees the alert and can acknowledge.
- Write a timeline in the incident record: detection, first human contact,
  recovery.

## Post-incident

Add a failing test that reproduces the missed step before closing the incident.
If the cause was a manual database edit, treat it as a process failure, not a
code bug.
