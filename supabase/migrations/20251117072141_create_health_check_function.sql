-- Phase 0: Safety Infrastructure
-- Create SQL function to check pg_cron job health
-- This function is called by the health-check Edge Function

-- Function to check cron job health (called by health-check Edge Function)
-- CRITICAL: SECURITY DEFINER required - function needs to query pg_cron schema
-- which is not accessible to regular users
CREATE OR REPLACE FUNCTION public.check_cron_job_health(p_critical_jobs TEXT[])
RETURNS TABLE(jobname TEXT, last_run TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobname::TEXT,
    MAX(jr.end_time) AS last_run
  FROM pg_cron.job j
  LEFT JOIN pg_cron.job_run_details jr ON j.jobid = jr.jobid
  WHERE j.jobname = ANY(p_critical_jobs)
  GROUP BY j.jobname;
END;
$$;

COMMENT ON FUNCTION public.check_cron_job_health IS 'Returns the last execution time for each critical cron job. Used by health-check Edge Function for external monitoring.';

-- Grant execute permission to authenticated users and anon (for public health check endpoint)
GRANT EXECUTE ON FUNCTION public.check_cron_job_health TO authenticated, anon;

