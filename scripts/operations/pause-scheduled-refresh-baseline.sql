\set ON_ERROR_STOP on

-- MUTATING FAIL-SAFE.
--
-- Stops new scheduled queue production. Pending/processing work is not
-- deleted; quota and processor guards remain authoritative.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.get_fmp_pipeline_cron_state_v2() AS job
    WHERE job.jobname = 'queue-scheduled-refreshes-v2'
  ) THEN
    PERFORM cron.unschedule('queue-scheduled-refreshes-v2');
  END IF;
END;
$$;

SELECT jsonb_build_object(
  'captured_at', now(),
  'scheduled_refresh_active',
    EXISTS (
      SELECT 1
      FROM public.get_fmp_pipeline_cron_state_v2() AS scheduled
      WHERE scheduled.jobname = 'queue-scheduled-refreshes-v2'
        AND scheduled.active
    ),
  'queue_statuses',
    (
      SELECT jsonb_object_agg(summary.status, summary.jobs)
      FROM (
        SELECT queue.status, count(*) AS jobs
        FROM public.api_call_queue_v2 AS queue
        WHERE queue.status IN ('pending', 'processing')
        GROUP BY queue.status
      ) AS summary
    )
) AS scheduled_refresh_pause;
