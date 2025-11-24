-- Contract #17: Deadlock-Aware Error Handling (Processor)
-- Test: The queue processor must explicitly handle PostgreSQL deadlock errors (40P01)
--
-- Why: Deadlocks are transient database-level contention issues, NOT job failures.
-- Mis-attributing deadlocks as job failures pollutes retry_count and error_message.
-- This can send jobs to dead-letter queue for transient database issues.
--
-- Note: This contract is primarily enforced in TypeScript (queue-processor-v2/index.ts),
-- but we can verify that the SQL function fail_queue_job_v2 does NOT handle deadlocks
-- (deadlocks should be handled in the processor, not in fail_queue_job).
--
-- What NOT to do:
-- - ❌ Treat 40P01 (deadlock detected) as a generic error and call fail_queue_job
-- - ❌ Increment retry_count for deadlocks (they are not job failures)

BEGIN;
SELECT plan(2);

-- Test 1: fail_queue_job_v2 function exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'fail_queue_job_v2'
  ),
  'Contract #17: fail_queue_job_v2 function exists'
);

-- Test 2: fail_queue_job_v2 does NOT handle deadlocks (deadlocks should be handled in processor)
-- This is a negative test - we verify that fail_queue_job_v2 does NOT have deadlock-specific logic
-- Deadlocks should be caught in the TypeScript processor and handled with reset_job_immediate
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'fail_queue_job_v2'
      AND (
        pg_get_functiondef(p.oid) ~* '40P01'
        OR pg_get_functiondef(p.oid) ~* 'deadlock'
      )
  ),
  'Contract #17: fail_queue_job_v2 does NOT handle deadlocks (deadlocks handled in TypeScript processor with reset_job_immediate)'
);

SELECT * FROM finish();
ROLLBACK;

