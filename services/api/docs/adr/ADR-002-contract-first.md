# ADR-002: Contract-first API in openapi.yaml

- Status: Accepted (2026-10-24)
- Deciders: backend owner (frontend owner review pending for `contract-v0.1`)
- Related: openapi.yaml, CP0

## Context

Two people build the backend and the Flutter client. A field rename or an enum
change that is not seen by both sides becomes a production incident, and on the
crisis path it becomes a safety incident.

## Decision

`openapi.yaml` is the interface. It is written before the handlers, checked into
the repository, linted by Spectral in CI (`npm run contract:lint`, zero errors),
and tagged `contract-v0.1` only after the frontend owner reviews it.

Rules:

- Every response uses the single envelope in `components.schemas`.
- Every device-originated create carries `clientId`.
- Enums are closed. A new value is a contract change.
- A change to a path, field, enum or error code requires a PR that edits
  `openapi.yaml` and is approved by both owners.
- Controllers return plain data; the envelope interceptor wraps it. A handler
  cannot invent a second response shape.

## Consequences

- The client can generate models and the backend can generate validation.
- DTOs and the contract can still drift; the contract test suite `[PLANNED]` is
  what closes that gap.
- The contract is versioned in git, not in a separate portal.
