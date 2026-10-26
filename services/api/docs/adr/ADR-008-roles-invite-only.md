# ADR-008: Server-assigned roles; therapist accounts are invite-only

- Status: Accepted (2026-10-24)
- Deciders: backend owner
- Related: REQ-AUTH-05, REQ-CONN-01, ADR-002

## Context

A therapist sees another person's mental health data. An open therapist signup
would let anyone claim that access. The client also decides where to route the
user, and a client-side role switch would be a privilege-escalation path.

## Decision

- Role is stored on `users` and assigned by the server. The client never sends
  a role; a DTO that tries to include one is rejected by the validation pipe.
- Public signup creates patients only. A therapist account is created by
  accepting a patient's invite, then completing onboarding; it starts with
  `verificationStatus=pending`.
- `GET /v1/me` is the only source of truth for routing. The Flutter client
  routes on the returned `role`.
- A therapist can never move a connection to `active`. Only
  `patient_confirms` does that (state machine, R-CONN-3).
- Every therapist read is filtered by an active connection in the service layer.
  A missing connection returns 404, not 403, so existence is not leaked.

## Consequences

- A therapist cannot self-serve into the system.
- Verification is an operational process, not a signup flag.
- The role check appears twice (guard and service) on purpose; the service check
  is the one that must never be removed.
