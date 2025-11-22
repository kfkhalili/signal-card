-- Contract #1: Atomic Batch Claiming
-- Test: get_queue_batch_v2 must atomically update status within the same transaction
--
-- Why: Prevents race conditions where multiple processors grab the same batch.
--
-- What NOT to do:
-- - ❌ Separate the SELECT and UPDATE into different transactions
-- - ❌ Remove the FOR UPDATE SKIP LOCKED clause
-- - ❌ Remove the atomic UPDATE that sets status to 'processing'

BEGIN;
SELECT plan(3);

-- Test 1: Function exists and has correct signature
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_queue_batch_v2'
  ),
  'Contract #1: get_queue_batch_v2 function exists'
);

-- Test 2: Function definition contains FOR UPDATE SKIP LOCKED
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_queue_batch_v2'
      AND pg_get_functiondef(p.oid) LIKE '%FOR UPDATE SKIP LOCKED%'
  ),
  'Contract #1: get_queue_batch_v2 uses FOR UPDATE SKIP LOCKED'
);

-- Test 3: Function definition contains atomic UPDATE (status = processing)
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_queue_batch_v2'
      AND pg_get_functiondef(p.oid) ~* 'UPDATE.*api_call_queue.*SET.*status.*=.*[''"]processing[''"]'
      AND pg_get_functiondef(p.oid) ~* 'WHERE.*id.*IN.*SELECT'
  ),
  'Contract #1: get_queue_batch_v2 atomically updates status to processing'
);

SELECT * FROM finish();
ROLLBACK;

