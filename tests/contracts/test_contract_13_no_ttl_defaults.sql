-- Contract #13: No TTL Defaults
-- Test: is_data_stale_v2 and is_profile_stale_v2 must NOT have default TTL values
--
-- Why: The data_type_registry is the single source of truth for TTL values.
-- Default values (e.g., DEFAULT 5) create a "split-brain" where developers accidentally
-- use wrong TTL. This violates the metadata-driven principle and causes non-deterministic
-- staleness checks.
--
-- What NOT to do:
-- - ❌ Add DEFAULT values to is_data_stale_v2 or wrapper functions
-- - ❌ Allow TTL to be omitted in function calls

BEGIN;
SELECT plan(4);

-- Test 1: is_data_stale_v2 function exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'is_data_stale_v2'
  ),
  'Contract #13: is_data_stale_v2 function exists'
);

-- Test 2: is_data_stale_v2 has NO default value for TTL parameter
-- PostgreSQL 15 compatible: Check function definition for DEFAULT clause
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'is_data_stale_v2'
      AND (
        -- Check if function definition contains DEFAULT for p_ttl_minutes
        pg_get_functiondef(p.oid) ~* 'p_ttl_minutes.*DEFAULT'
        OR pg_get_functiondef(p.oid) ~* 'DEFAULT.*p_ttl_minutes'
      )
  ),
  'Contract #13: is_data_stale_v2 has no default value for p_ttl_minutes parameter'
);

-- Test 3: is_profile_stale_v2 function exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'is_profile_stale_v2'
  ),
  'Contract #13: is_profile_stale_v2 function exists'
);

-- Test 4: is_profile_stale_v2 has NO default value for TTL parameter
-- PostgreSQL 15 compatible: Check function definition for DEFAULT clause
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'is_profile_stale_v2'
      AND (
        -- Check if function definition contains DEFAULT for p_ttl_minutes
        pg_get_functiondef(p.oid) ~* 'p_ttl_minutes.*DEFAULT'
        OR pg_get_functiondef(p.oid) ~* 'DEFAULT.*p_ttl_minutes'
      )
  ),
  'Contract #13: is_profile_stale_v2 has no default value for p_ttl_minutes parameter'
);

SELECT * FROM finish();
ROLLBACK;

