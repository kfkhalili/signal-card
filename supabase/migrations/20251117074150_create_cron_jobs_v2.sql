-- Phase 3: Staleness System
-- Create cron jobs for the new queue system
-- CRITICAL: All jobs use advisory locks to prevent cron pile-ups
-- CRITICAL: Jobs are idempotent and can be safely re-run

-- Job 1: Background Staleness Checker (Primary - Catches data that becomes stale while users are viewing)
-- Runs every 5 minutes
-- CRITICAL: Uses active_subscriptions_v2 table (updated by Job 5) for performance
-- CRITICAL: Symbol-by-Symbol pattern prevents temp table thundering herd
-- CRITICAL: Quota-aware (prevents quota rebound catastrophe)
SELECT cron.schedule(
  'check-stale-data-v2',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT check_and_queue_stale_data_from_presence_v2();
  $$
);

-- Job 2: Scheduled Refreshes (Low-priority background work)
-- Runs every minute (throttled internally by queue depth)
-- CRITICAL: Throttled to prevent queue bloat
-- CRITICAL: Uses TABLESAMPLE to prevent Day 365 performance failure
-- CRITICAL: Priority hardcoded to -1 (prevents priority inversion)
SELECT cron.schedule(
  'queue-scheduled-refreshes-v2',
  '* * * * *', -- Every minute
  $$
  SELECT queue_scheduled_refreshes_v2();
  $$
);

-- Job 3: Processor Invoker (Loops processor until queue is empty or timeout)
-- Runs every minute
-- CRITICAL: Circuit breaker prevents thundering herd of broken processors
-- CRITICAL: Proactive recovery (runs recover_stuck_jobs as first action)
-- CRITICAL: Advisory lock prevents cron pile-ups
-- CRITICAL: SQL-side loop (Edge Function is stateless - processes one batch and exits)
SELECT cron.schedule(
  'invoke-processor-v2',
  '* * * * *', -- Every minute
  $$
  SELECT invoke_processor_loop_v2(
    p_max_iterations := 5,
    p_iteration_delay_seconds := 12
  );
  $$
);

-- Job 4: Partition Maintenance (Prevents "poisoned partition" Day 90 bloat)
-- Runs weekly (Sunday at 2 AM UTC)
-- CRITICAL: Polite TRUNCATE with lock timeout prevents stop-the-world deadlocks
-- CRITICAL: Truncates completed and failed partitions to prevent infinite bloat
SELECT cron.schedule(
  'maintain-queue-partitions-v2',
  '0 2 * * 0', -- Sunday at 2 AM UTC
  $$
  SELECT maintain_queue_partitions_v2();
  $$
);

-- Job 5: Analytics Refresh (Heavy operation moved from Job 1)
-- Runs every 15 minutes
-- CRITICAL: Heavy TRUNCATE...INSERT operation (300k rows at scale)
-- CRITICAL: Moved to separate cron job to prevent Job 1 from exceeding 5-minute window
-- CRITICAL: Updates active_subscriptions_v2 table (used by Job 1)
-- TODO: Implement actual Presence fetch logic when pg_net is enabled
SELECT cron.schedule(
  'refresh-analytics-v2',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT refresh_analytics_from_presence_v2();
  $$
);

-- Helper function to list all cron jobs
CREATE OR REPLACE FUNCTION list_queue_system_cron_jobs_v2()
RETURNS TABLE(
  job_name TEXT,
  schedule TEXT,
  command TEXT,
  active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobname::TEXT,
    j.schedule::TEXT,
    j.command::TEXT,
    j.active::BOOLEAN
  FROM cron.job j
  WHERE j.jobname IN (
    'check-stale-data-v2',
    'queue-scheduled-refreshes-v2',
    'invoke-processor-v2',
    'maintain-queue-partitions-v2',
    'refresh-analytics-v2'
  )
  ORDER BY j.jobname;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION list_queue_system_cron_jobs_v2 IS 'Lists all queue system cron jobs for monitoring and debugging.';

-- Helper function to unschedule all cron jobs (for rollback)
CREATE OR REPLACE FUNCTION unschedule_all_queue_system_cron_jobs_v2()
RETURNS void AS $$
BEGIN
  PERFORM cron.unschedule('check-stale-data-v2');
  PERFORM cron.unschedule('queue-scheduled-refreshes-v2');
  PERFORM cron.unschedule('invoke-processor-v2');
  PERFORM cron.unschedule('maintain-queue-partitions-v2');
  PERFORM cron.unschedule('refresh-analytics-v2');

  RAISE NOTICE 'All queue system cron jobs unscheduled';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION unschedule_all_queue_system_cron_jobs_v2 IS 'Unschedule all queue system cron jobs. Use for rollback.';

