-- Contract #12: Symbol-by-Symbol Query Pattern (Temp Table Thundering Herd)
-- Test: check_and_queue_stale_data_from_presence_v2 must use Symbol-by-Symbol query pattern, not Type-by-Type
--
-- Why: At scale (100k users * 3 types = 300k rows), Type-by-Type creates 10 giant JOINs that exhaust work_mem.
-- This causes database-wide slowdowns, disk I/O thrashing, and potential crashes.
-- Symbol-by-Symbol creates 10k tiny, fast, indexed queries that scale linearly.
--
-- What NOT to do:
-- - ❌ Use Type-by-Type loop (outer loop over data types, inner JOIN with 300k-row temp table)
-- - ❌ Remove temp table indexes (queries will be slow without them)

BEGIN;
SELECT plan(2);

-- Test 1: Function exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'check_and_queue_stale_data_from_presence_v2'
  ),
  'Contract #12: check_and_queue_stale_data_from_presence_v2 function exists'
);

-- Test 2: Function uses Symbol-by-Symbol pattern
-- Must have: Outer loop over symbols (FROM get_active_subscriptions_from_realtime or similar)
-- Must NOT have: Outer loop over data types with large JOINs
-- Pattern: FOR symbol_row IN SELECT DISTINCT symbol FROM ... (symbol-first, not type-first)
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'check_and_queue_stale_data_from_presence_v2'
      AND (
        -- Check for symbol-first pattern (outer loop over symbols)
        pg_get_functiondef(p.oid) ~* 'FOR\s+symbol.*IN\s+SELECT\s+DISTINCT\s+symbol'
        OR pg_get_functiondef(p.oid) ~* 'FOR\s+symbol.*IN\s+SELECT.*symbol.*FROM.*get_active_subscriptions'
      )
  ),
  'Contract #12: check_and_queue_stale_data_from_presence_v2 uses Symbol-by-Symbol query pattern (prevents temp table thundering herd)'
);

SELECT * FROM finish();
ROLLBACK;

