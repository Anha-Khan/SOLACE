# ADR-006: Application-level AES-256-GCM for sensitive free text

- Status: Accepted (2026-10-24); `KeyProvider` and AES-256-GCM helpers built in CP1; journal text and rotation job in CP4
- Deciders: backend owner
- Related: database.md, REQ-JOURN-02, REQ-PLAN-01

## Context

Journals, the safety plan and the therapist licence number are the most
sensitive columns in the system. Volume encryption protects a stolen disk, but
not a leaked backup, a read replica, a misconfigured dump, or a SQL injection
that can `SELECT` a column.

## Decision

- Encrypt in the application with AES-256-GCM before the value reaches
  PostgreSQL. Store base64 ciphertext plus `key_id`.
- The data key is wrapped and referenced by `FIELD_ENCRYPTION_KEY_REF`. A
  `KeyProvider` interface resolves it; the local implementation uses a
  development key reference. Production uses a KMS/secret manager `[PLANNED]`.
- AAD binds the ciphertext to its context: table, column and row id, so a
  ciphertext copied to another row fails to decrypt.
- Decryption happens only in the owning repository, and only for a caller that
  has already passed the connection/consent check.
- Rotation: new writes use the new `key_id`; a background job re-encrypts older
  rows. No flag day.

## Consequences

- Encrypted columns cannot be searched, sorted or aggregated in SQL. Mood is a
  number and stays unencrypted for the chart; journal text is not queryable.
- A key loss is a data loss. Key backup and rotation are runbook items
  (`docs/runbooks/secret-rotation.md`).
- Per-row encryption costs latency on journal writes; measured in CP4. The
  crisis path does not encrypt synchronously if it would break the 2-second
  budget: it encrypts the stored entry before/while persisting, and the decision
  itself never waits on the cipher.
- CP1 builds the `KeyProvider` interface, the local development provider and the
  AES-256-GCM helpers, and uses them for safety-plan fields 1–5. The therapist
  licence number uses the same helpers in CP3 and journal text in CP4. Key
  rotation and the re-encryption job stay in CP4–CP5; until then every row
  records the current `key_id`.
