# ADR-005: Minimum data leaves the service for AI providers

- Status: Accepted (2026-10-24)
- Deciders: backend owner, privacy review requested
- Related: Global Rule 6, OD-4, integrations.md

## Context

Crisis classification needs the text the patient wrote. Sending more than that
creates a data-processing surface that the privacy commitments did not
anticipate. Providers may train on submitted data unless a DPA says otherwise.

## Decision

- Only `src/modules/ai/` may call a provider. No other module imports a provider
  SDK or makes an outbound AI request.
- The request contains the text being classified and no identifiers: no user id,
  no email, no therapist id, no device id. Correlation happens locally via
  `ai_scans.entry_id`.
- Journal text is sent only when `journal_ai_analysis` consent is granted and a
  signed DPA is on file with that provider. The Personal Journal is
  crisis-scan-only: no sentiment, no personalisation, never shared with a
  therapist (OD-4).
- A provider response is untrusted: validate, clamp, discard extras.
- Logs record metadata only: provider, status, duration, `sentimentSignal`,
  `crisisDetected` (B07).

## Consequences

- A provider cannot correlate submissions across users, at the cost of losing
  provider-side conversation context.
- A missing DPA blocks the feature rather than being handled silently. Config
  validation requires provider keys in staging and production; the DPA check is
  a release gate, not code.
- If a provider's policy changes, the adapter is the only file to change.
