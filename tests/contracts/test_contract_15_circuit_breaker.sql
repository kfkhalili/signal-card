-- Contract #15: Circuit Breaker Sensitivity
-- Test: invoke_processor_loop_v2 (or invoke_processor_if_healthy) must check retry_count > 0,
-- not status = 'failed', to correctly trip on temporary API outages
--
-- Why: fail_queue_job sets status = 'pending' on first retry (not 'failed').
-- Circuit breaker checking only status = 'failed' will never trip during temporary outages.
-- This causes "retry thundering herd" where the system continuously retries all jobs,
-- slamming a known-down API.
--
-- What NOT to do:
-- - ❌ Check only status = 'failed' in circuit breaker (misses temporary failures)
-- - ❌ Wait for jobs to reach max_retries before tripping circuit breaker

BEGIN;
SELECT plan(2);

-- Test 1: Function exists (check both possible names)
-- Note: Circuit breaker logic is in invoke_processor_if_healthy_v2
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('invoke_processor_if_healthy_v2', 'invoke_processor_if_healthy')
  ),
  'Contract #15: Circuit breaker function exists (invoke_processor_if_healthy_v2)'
);

-- Test 2: Function checks retry_count > 0 (not status = 'failed')
-- Note: Circuit breaker logic is in invoke_processor_if_healthy_v2, not invoke_processor_loop_v2
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('invoke_processor_if_healthy_v2', 'invoke_processor_if_healthy')
      AND (
        pg_get_functiondef(p.oid) ~* 'retry_count\s*>\s*0'
        OR pg_get_functiondef(p.oid) ~* 'retry_count.*>.*0'
      )
      -- Ensure it's NOT checking status = 'failed' as primary condition
      AND NOT (
        pg_get_functiondef(p.oid) ~* 'status\s*=\s*[''"]failed[''"]'
        AND pg_get_functiondef(p.oid) !~* 'retry_count'
      )
  ),
  'Contract #15: Circuit breaker checks retry_count > 0 (not status = failed)'
);

SELECT * FROM finish();
ROLLBACK;

