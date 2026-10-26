# Integrations

Every external dependency is behind an interface in the owning module. Nothing
outside that module may import a provider SDK. Phase 0 defines the contracts;
the adapters are `[PLANNED]` and are built in the phase that first needs them.

| Integration                | Owner module (planned)         | Required from | Secret variable           | ADR          |
| -------------------------- | ------------------------------ | ------------- | ------------------------- | ------------ |
| Groq (primary crisis AI)   | `src/modules/ai/`              | staging       | `AI_GROQ_API_KEY`         | ADR-4, ADR-5 |
| Cerebras (fallback)        | `src/modules/ai/`              | production    | `AI_CEREBRAS_API_KEY`     | ADR-4        |
| OpenRouter (last fallback) | `src/modules/ai/`              | production    | `AI_OPENROUTER_API_KEY`   | ADR-4        |
| Firebase Cloud Messaging   | `src/modules/notifications/`   | staging       | `FCM_SERVICE_ACCOUNT_REF` | —            |
| SendGrid (email)           | `src/modules/notifications/`   | staging       | `SENDGRID_API_KEY`        | —            |
| SMS provider               | `src/modules/notifications/`   | staging       | `SMS_PROVIDER_KEY`        | —            |
| Sentry                     | `src/common/`                  | optional      | `SENTRY_DSN`              | —            |
| PostgreSQL                 | `src/common/prisma.service.ts` | always        | `DATABASE_URL`            | ADR-1, ADR-3 |
| Redis                      | `src/common/redis.service.ts`  | always        | `REDIS_URL`               | ADR-3        |

`*_REF` variables are references to a secret (a path or a secret-manager name),
never the secret itself. CP1 adds the `KeyProvider` for `FIELD_ENCRYPTION_KEY_REF`
(`dev://`/`test://` outside production, `env://VAR` anywhere). The KMS/secret-manager
adapter is `[PLANNED]` until OD-8 decides hosting, and is required before the
safety plan or journals hold real data in production. The FCM/SendGrid/SMS
resolvers remain `[PLANNED]` for Phase 8.

## AI providers

**Rules**

- The provider is advisory only. A Tier 3 decision is made by the deterministic
  detector before any AI call and can never be changed by an AI response (ADR-4).
- Total AI budget for a synchronous crisis check is 1800 ms
  (`AI_CRISIS_TIMEOUT_MS`, hard cap 1900 ms). After that the rule-based decision
  is returned and the scan is queued.
- Only the minimum text needed for a classification leaves the service. Journal
  text leaves only when `journal_ai_analysis` consent is granted and a signed DPA
  with the provider is on file (Global Rule 6, ADR-5).
- A provider response is untrusted input: validate the shape, clamp the tier,
  discard unknown fields. Never log the response body, only
  `provider`, `status`, `durationMs`, `sentimentSignal`, `crisisDetected`
  (this is exactly the `ai_scans` row, B07).
- Timeouts are per attempt and include queueing. No retry inside the 2-second
  synchronous budget; retries happen only in the background worker.

**Fallback order:** Groq → Cerebras → OpenRouter. The next provider is tried only
when the previous one errors or times out, never when it returned a valid
classification.

**Failure:** the entry is saved with `analysisStatus=queued`/`failed`. Repeated
failure raises `safety_team_flags.reason=analysis_failed`. A patient never sees
an AI error.

## Push (FCM)

- The payload contains no mental health content, no names, no alert text
  (R-NOTIF-5). It carries a notification type and an opaque id; the client
  fetches content over the authenticated API.
- `crisis_alert` and `connection_update` cannot be disabled (R-NOTIF-4).
- Registration stores the token; deletion happens on logout, on 410/UNREGISTERED
  from FCM, and on account deletion.
- Delivery failure never changes alert state. It is logged and, for crisis
  alerts, raised to the safety team (`sms_delivery_failed` is the same idea for
  SMS).

## Email (SendGrid) and SMS

- Used for invites (email) and last-resort Tier 3 contact (SMS). Invite email
  contains the patient's first name only and an expiring token link.
- Templates live in the provider, not in this repository. No journal content,
  mood data or alert detail is ever in an email or SMS body.
- Every send carries an idempotency key derived from the domain event id, so a
  retry cannot double-send.

## Sentry

- Optional. When `SENTRY_DSN` is unset, errors go to the structured logger only.
- Before-send hook runs the same redaction as the logger
  (`src/common/redaction.ts`). Request bodies are never attached.
- Sentry must be excluded from the crisis path's synchronous budget.

## Adding an integration

1. Add the variable to `.env.example` and `src/config/config.ts` with a
   fail-fast rule (required in staging/production when the feature ships).
2. Add an interface plus a `Noop`/fake adapter so unit tests never touch the
   network.
3. Document the data that leaves the service and the DPA status here.
4. Add a failure-mode test: provider down must not break the calling user
   journey.
