-- Contract #3: Advisory Locks on Cron Jobs
-- Test: All cron job functions must check pg_try_advisory_lock before proceeding
--
-- Why: Prevents "cron pile-up" where multiple instances of the same job run simultaneously,
-- overwhelming the database.
--
-- Functions to check:
-- - check_and_queue_stale_data_from_presence_v2 (lock ID 42)
-- - queue_scheduled_refreshes_v2 (lock ID 43)
-- - invoke_processor_if_healthy_v2 (lock ID 44) - called by invoke_processor_loop_v2

BEGIN;
SELECT plan(4);

-- Test 1: check_and_queue_stale_data_from_presence_v2 uses advisory lock
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'check_and_queue_stale_data_from_presence_v2'
      AND (
        pg_get_functiondef(p.oid) LIKE '%pg_try_advisory_lock(42)%'
        OR pg_get_functiondef(p.oid) LIKE '%pg_try_advisory_lock%(42)%'
      )
  ),
  'Contract #3: check_and_queue_stale_data_from_presence_v2 uses advisory lock 42'
);

-- Test 2: queue_scheduled_refreshes_v2 uses advisory lock
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'queue_scheduled_refreshes_v2'
      AND (
        pg_get_functiondef(p.oid) LIKE '%pg_try_advisory_lock(43)%'
        OR pg_get_functiondef(p.oid) LIKE '%pg_try_advisory_lock%(43)%'
      )
  ),
  'Contract #3: queue_scheduled_refreshes_v2 uses advisory lock 43'
);

-- Test 3: invoke_processor_if_healthy_v2 uses advisory lock 44
-- Note: invoke_processor_loop_v2 calls invoke_processor_if_healthy_v2, which has the lock
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'invoke_processor_if_healthy_v2'
      AND (
        pg_get_functiondef(p.oid) LIKE '%pg_try_advisory_lock(44)%'
        OR pg_get_functiondef(p.oid) LIKE '%pg_try_advisory_lock%(44)%'
      )
  ),
  'Contract #3: invoke_processor_if_healthy_v2 uses advisory lock 44'
);

-- Test 4: All functions unlock on exception (defense in depth)
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'check_and_queue_stale_data_from_presence_v2',
        'queue_scheduled_refreshes_v2',
        'invoke_processor_loop_v2'
      )
      AND pg_get_functiondef(p.oid) LIKE '%pg_advisory_unlock%'
      AND pg_get_functiondef(p.oid) LIKE '%EXCEPTION%'
  ),
  'Contract #3: Cron job functions unlock advisory locks in exception handlers'
);

SELECT * FROM finish();
ROLLBACK;

