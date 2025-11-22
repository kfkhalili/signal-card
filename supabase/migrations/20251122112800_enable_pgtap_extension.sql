-- Enable pgTAP extension for contract testing
-- Note: This extension may require superuser privileges
-- If this fails, pgTAP may need to be installed manually by Supabase support
-- For local development, install via: CREATE EXTENSION IF NOT EXISTS pgtap;

-- Attempt to create extension (will fail gracefully if not available)
-- Using 'extensions' schema for consistency with other non-system extensions
-- (pg_net, moddatetime, pgcrypto, pgjwt, uuid-ossp all use 'extensions' schema)
DO $$
BEGIN
  -- Check if pgTAP is available
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pgtap'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
    RAISE NOTICE 'pgTAP extension enabled successfully in extensions schema';
  ELSE
    RAISE WARNING 'pgTAP extension is not available. Contract tests will not run.';
    RAISE WARNING 'To enable pgTAP, contact Supabase support or install manually for local development.';
  END IF;
END $$;

COMMENT ON EXTENSION pgtap IS 'pgTAP - PostgreSQL Test Anywhere Protocol for automated contract testing';

