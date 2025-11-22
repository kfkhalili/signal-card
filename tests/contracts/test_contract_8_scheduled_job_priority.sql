-- Contract #8: Scheduled Job Priority
-- Test: queue_scheduled_refreshes_v2 must always set priority = -1, regardless of registry value
--
-- Why: Prevents priority inversion where low-value scheduled work (priority 100) starves
-- high-priority user-facing work (priority 1). On-demand work (P0) has priority = viewerCount >= 1,
-- so scheduled work must be lower.
--
-- What NOT to do:
-- - ❌ Use reg.priority from data_type_registry for scheduled jobs
-- - ❌ Allow scheduled jobs to have priority >= 0 (would starve user-facing work)

BEGIN;
SELECT plan(2);

-- Test 1: Function exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'queue_scheduled_refreshes_v2'
  ),
  'Contract #8: queue_scheduled_refreshes_v2 function exists'
);

-- Test 2: Function hardcodes priority to -1 (not from registry)
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'queue_scheduled_refreshes_v2'
      AND (
        pg_get_functiondef(p.oid) ~* 'priority.*-1'
        OR pg_get_functiondef(p.oid) ~* 'priority\s*:=\s*-1'
        OR pg_get_functiondef(p.oid) ~* 'priority\s*=\s*-1'
      )
      -- Ensure it's NOT using reg.priority
      AND NOT (
        pg_get_functiondef(p.oid) ~* 'reg\.priority'
        OR pg_get_functiondef(p.oid) ~* 'r\.priority'
      )
  ),
  'Contract #8: queue_scheduled_refreshes_v2 hardcodes priority to -1 (not from registry)'
);

SELECT * FROM finish();
ROLLBACK;

