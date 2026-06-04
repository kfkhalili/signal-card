-- First, ensure any previous version of this job is removed to avoid duplicates
DO $$
BEGIN
  PERFORM cron.unschedule('clean-cron-logs');
EXCEPTION WHEN OTHERS THEN
  -- Ignore error if job does not exist
END $$;

-- Schedule a weekly job (midnight on Sunday: 0 0 * * 0) to prune logs older than 7 days
SELECT cron.schedule(
  'clean-cron-logs',
  '0 0 * * 0',
  $$
  DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
  $$
);
