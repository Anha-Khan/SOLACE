-- Global Rule 5: audit and consent tables are append-only, enforced by the
-- database rather than only by application code.
--
-- The service connects as `between_app`. Migrations run as the owner role
-- (`between`) via MIGRATION_DATABASE_URL. If the runtime role does not exist,
-- this migration fails on purpose: running without it would silently remove the
-- append-only guarantee.

-- Baseline for everything the application legitimately reads and writes.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO between_app;

-- Append-only tables: read and append, never rewrite history.
GRANT SELECT, INSERT ON TABLE
  consent_records,
  alert_events,
  access_log,
  crisis_events,
  safety_team_flags
TO between_app;

REVOKE UPDATE, DELETE, TRUNCATE ON TABLE
  consent_records,
  alert_events,
  access_log,
  crisis_events,
  safety_team_flags
FROM between_app;

-- Future tables created by the owner role default to full DML for the runtime
-- role. Any new append-only table must revoke UPDATE and DELETE in its own
-- migration, and the integration suite checks the five tables above.
ALTER DEFAULT PRIVILEGES FOR ROLE between IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO between_app;
