\set ON_ERROR_STOP on

-- MUTATING PRODUCTION OPERATION.
--
-- Run only after production-fmp-quota-calibration.sql and its read-only
-- verification succeed. This recovers at most 100 stale jobs and queues one
-- processor invocation. The active calibration caps the processor claim at
-- 25 jobs even though the Edge Function requests 125.
--
-- Keep direct FMP cron jobs and queue producers disabled. Run one copy at a
-- time, wait for the pg_net response and queue settlement, then re-run
-- verify-fmp-quota-calibration.sql before deciding whether to repeat.

DO $$
DECLARE
  v_usage record;
BEGIN
  SELECT *
  INTO v_usage
  FROM public.get_effective_quota_usage_v2();

  IF NOT v_usage.is_calibrated THEN
    RAISE EXCEPTION 'No active FMP quota calibration';
  END IF;

  IF v_usage.safety_buffer > 0.80 THEN
    RAISE EXCEPTION
      'Recovery safety buffer % is above the approved 80%% ceiling',
      v_usage.safety_buffer;
  END IF;

  IF v_usage.max_batch_jobs > 25 THEN
    RAISE EXCEPTION
      'Recovery batch cap % is above the approved 25 jobs',
      v_usage.max_batch_jobs;
  END IF;

  IF public.is_quota_exceeded_v2() THEN
    RAISE EXCEPTION 'Effective quota usage is already at the recovery ceiling';
  END IF;
END;
$$;

SELECT public.recover_stuck_jobs_v2() AS recovered_stale_jobs;

SELECT public.invoke_edge_function_v2(
  'queue-processor-v2',
  '{}'::jsonb,
  300000
) AS queued_processor_request;

