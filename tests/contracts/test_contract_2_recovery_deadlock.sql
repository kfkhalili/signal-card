-- Contract #2: SKIP LOCKED in Recovery
-- Test: recover_stuck_jobs_v2 must use FOR UPDATE SKIP LOCKED when selecting stuck jobs
--
-- Why: Prevents deadlocks with concurrent complete_queue_job calls. Without SKIP LOCKED,
-- the recovery job will wait for locks held by the processor, causing deadlocks.
--
-- What NOT to do:
-- - ❌ Change FOR UPDATE SKIP LOCKED to FOR UPDATE (re-introduces deadlock)
-- - ❌ Remove the lock entirely (allows race conditions)

BEGIN;
SELECT plan(2);

-- Test 1: Function exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'recover_stuck_jobs_v2'
  ),
  'Contract #2: recover_stuck_jobs_v2 function exists'
);

-- Test 2: Function definition contains FOR UPDATE SKIP LOCKED
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'recover_stuck_jobs_v2'
      AND pg_get_functiondef(p.oid) LIKE '%FOR UPDATE SKIP LOCKED%'
  ),
  'Contract #2: recover_stuck_jobs_v2 uses FOR UPDATE SKIP LOCKED'
);

SELECT * FROM finish();
ROLLBACK;

