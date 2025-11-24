-- Contract #4: Exception Blocks in check_and_queue functions
-- Test: check_and_queue_stale_batch_v2 must use BEGIN...EXCEPTION...END blocks for fault tolerance
--
-- Why: Prevents one bad data type from breaking the entire batch/cron job. Without exception handling,
-- a single registry typo will stop all staleness checks.
--
-- What NOT to do:
-- - ❌ Remove exception blocks to "optimize" performance
-- - ❌ Change CONTINUE to RAISE (breaks fault tolerance)

BEGIN;
SELECT plan(2);

-- Test 1: Function exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'check_and_queue_stale_batch_v2'
  ),
  'Contract #4: check_and_queue_stale_batch_v2 function exists'
);

-- Test 2: Function definition contains exception handling pattern
-- Must have: BEGIN...EXCEPTION...END block with WHEN OTHERS
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'check_and_queue_stale_batch_v2'
      AND pg_get_functiondef(p.oid) ~* 'BEGIN\s+.*EXCEPTION\s+.*WHEN\s+OTHERS'
  ),
  'Contract #4: check_and_queue_stale_batch_v2 uses BEGIN...EXCEPTION...END blocks for fault tolerance'
);

SELECT * FROM finish();
ROLLBACK;

