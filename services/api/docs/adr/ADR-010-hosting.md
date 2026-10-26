# ADR-010: Hosting and managed services

- Status: **Proposed / open** (OD-8). Not decided. Nothing in the code may assume
  a specific provider until this ADR is accepted.
- Deciders: owner
- Related: OD-8, docs/database.md

## Context

The backend needs a runtime, a managed PostgreSQL with point-in-time recovery, a
managed Redis, a secret manager, and a jurisdiction that fits the privacy
commitments. The choice affects data residency, cost, backup tooling and the
`FIELD_ENCRYPTION_KEY_REF` resolver.

## What is already fixed by other ADRs

- PostgreSQL 16 with PITR and a separate owner role (ADR-1, ADR-3).
- A secret manager; secrets are references, never values in the repo (ADR-6).
- TLS everywhere; no public database endpoint.
- The container must be able to run as a non-root user and exit non-zero on
  invalid config.

## Options considered (no decision)

1. One managed PaaS with managed Postgres and Redis in a single EU region.
2. Container host + managed database, split vendors.
3. Self-hosted on a VM (rejected unless the owner accepts on-call for backups).

## What must be decided before CP7

- Region and data residency statement.
- Backup retention and restore drill ownership.
- Secret manager and key provider.
- Log/metric retention and whether Sentry is used.
- Domain and TLS issuance.

## Consequences of leaving this open

Deployment automation, the production `.env` template and the restore runbook
stay blocked. Local development and every Phase 0–6 gate are unaffected because
configuration is provider-neutral.
