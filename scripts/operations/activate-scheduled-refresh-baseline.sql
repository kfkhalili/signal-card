\set ON_ERROR_STOP on

-- MUTATING PRODUCTION OPERATION.
--
-- This enables the full-universe scheduler. It does not invoke FMP directly,
-- but the active processor will begin consuming queued work. Run the read-only
-- verify-scheduled-refresh-readiness.sql first and require
-- ready_for_scheduled_activation=true.

BEGIN;

DO $$
DECLARE
  v_usage record;
  v_calibrated_at timestamptz;
  v_active_processor_paths integer;
  v_active_queue_jobs integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations AS migration
    WHERE migration.version = '20260731000000'
  ) THEN
    RAISE EXCEPTION
      'Scheduled refresh migration 20260731000000 is not recorded';
  END IF;

  SELECT *
  INTO v_usage
  FROM public.get_effective_quota_usage_v2();

  SELECT calibration.captured_at
  INTO v_calibrated_at
  FROM public.fmp_quota_calibrations AS calibration
  WHERE calibration.active
  ORDER BY calibration.id DESC
  LIMIT 1;

  IF NOT v_usage.is_calibrated
     OR v_calibrated_at < now() - interval '6 hours' THEN
    RAISE EXCEPTION
      'A current (under 6 hours old) FMP dashboard calibration is required';
  END IF;

  IF v_usage.safety_buffer <> 0.90
     OR v_usage.max_batch_jobs <> 50 THEN
    RAISE EXCEPTION
      'Expected 90%% safety buffer and 50-job batch, found % and %',
      v_usage.safety_buffer,
      v_usage.max_batch_jobs;
  END IF;

  IF public.is_quota_exceeded_v2() THEN
    RAISE EXCEPTION 'Effective quota usage is already at the safety ceiling';
  END IF;

  SELECT count(*)
  INTO v_active_queue_jobs
  FROM public.api_call_queue_v2 AS queue
  WHERE queue.status IN ('pending', 'processing');

  IF v_active_queue_jobs <> 0 THEN
    RAISE EXCEPTION
      'Queue must be idle before activation; found % active jobs',
      v_active_queue_jobs;
  END IF;

  SELECT count(*)
  INTO v_active_processor_paths
  FROM public.get_fmp_pipeline_cron_state_v2() AS job
  WHERE job.active
    AND (
      job.jobname = 'invoke-processor-v2'
      OR job.jobname LIKE 'controlled-fmp-live-processing-%'
    );

  IF v_active_processor_paths <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one active processor path, found %',
      v_active_processor_paths;
  END IF;

  IF (
    SELECT count(*)
    FROM public.data_type_registry_v2 AS registry
    WHERE registry.data_type IN (
      'profile',
      'financial-statements',
      'ratios-ttm',
      'insider-transactions',
      'insider-trading-statistics'
    )
      AND registry.refresh_strategy = 'hybrid'
  ) <> 5 THEN
    RAISE EXCEPTION 'Durable scheduled registry policy is incomplete';
  END IF;

  IF (
    SELECT registry.refresh_strategy
    FROM public.data_type_registry_v2 AS registry
    WHERE registry.data_type = 'quote'
  ) <> 'on-demand' THEN
    RAISE EXCEPTION 'Quote must remain on demand';
  END IF;
END;
$$;

SELECT cron.schedule(
  'queue-scheduled-refreshes-v2',
  '* * * * *',
  'SELECT public.queue_scheduled_refreshes_v2();'
) AS scheduled_refresh_job_id;

COMMIT;

SELECT jsonb_build_object(
  'captured_at', now(),
  'scheduled_refresh_jobs',
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'jobid', job.jobid,
          'jobname', job.jobname,
          'schedule', job.schedule,
          'active', job.active,
          'command', job.command
        )
        ORDER BY job.jobid
      ),
      '[]'::jsonb
    )
) AS scheduled_refresh_activation
FROM public.get_fmp_pipeline_cron_state_v2() AS job
WHERE job.jobname = 'queue-scheduled-refreshes-v2';
