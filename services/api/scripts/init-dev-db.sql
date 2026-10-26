-- Development-only bootstrap, run once by the postgres container.
-- The owner role `between` is created by the image. This adds the restricted
-- runtime role used by DATABASE_URL so that append-only tables can be enforced
-- at the database level (Global Rule 5).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'between_app') THEN
    CREATE ROLE between_app LOGIN PASSWORD 'between_app' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE between TO between_app;
GRANT USAGE ON SCHEMA public TO between_app;
