-- Contract #18: SECURITY DEFINER on On-Subscribe RPC
-- Test: check_and_queue_stale_batch_v2 must use SECURITY DEFINER to execute with admin permissions
--
-- Why: Function is called by cron jobs (via check_and_queue_stale_data_from_presence_v2).
-- Function needs to SELECT from data tables (e.g., profiles) and INSERT into api_call_queue.
-- Cron job role needs these permissions (RLS policies restrict access).
-- Without SECURITY DEFINER, function will fail with 42501 (permission denied).
-- This breaks the background staleness checker (primary staleness check).
--
-- What NOT to do:
-- - ❌ Create function without SECURITY DEFINER (will fail with permission denied)
-- - ❌ Grant users direct permissions to data tables (violates RLS security model)

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
  'Contract #18: check_and_queue_stale_batch_v2 function exists'
);

-- Test 2: Function uses SECURITY DEFINER
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'check_and_queue_stale_batch_v2'
      AND p.prosecdef = true  -- SECURITY DEFINER flag
  ),
  'Contract #18: check_and_queue_stale_batch_v2 uses SECURITY DEFINER'
);

SELECT * FROM finish();
ROLLBACK;

