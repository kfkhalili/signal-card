-- Contract #9: Scheduled Job Performance (TABLESAMPLE)
-- Test: queue_scheduled_refreshes_v2 must use TABLESAMPLE to avoid materializing massive CROSS JOINs
--
-- Why: At scale (50k symbols * 5 types = 250k rows), full CROSS JOIN is a performance bomb.
-- TABLESAMPLE randomly samples symbols, dramatically reducing query cost and preventing "Day 365" performance failure.
--
-- What NOT to do:
-- - ❌ Remove TABLESAMPLE to "process all symbols"
-- - ❌ Use full CROSS JOIN without sampling (will fail at scale)

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
  'Contract #9: queue_scheduled_refreshes_v2 function exists'
);

-- Test 2: Function definition contains TABLESAMPLE
-- Must use TABLESAMPLE SYSTEM (or similar) to sample symbols
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'queue_scheduled_refreshes_v2'
      AND pg_get_functiondef(p.oid) ~* 'TABLESAMPLE\s+SYSTEM'
  ),
  'Contract #9: queue_scheduled_refreshes_v2 uses TABLESAMPLE to prevent Day 365 performance failure'
);

SELECT * FROM finish();
ROLLBACK;

