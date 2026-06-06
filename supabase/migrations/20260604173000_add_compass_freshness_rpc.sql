-- Migration to add RPC for fetching the last successful refresh of compass leaderboard

CREATE OR REPLACE FUNCTION public.get_compass_freshness()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_run timestamptz;
BEGIN
  -- We query cron.job_run_details to get the last successful run of the refresh job
  SELECT end_time INTO last_run
  FROM cron.job_run_details
  WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-compass-leaderboard-mv')
    AND status = 'succeeded'
  ORDER BY start_time DESC
  LIMIT 1;
  
  -- Fallback if no cron history is found
  IF last_run IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN last_run;
EXCEPTION WHEN OTHERS THEN
  -- If cron extension isn't accessible or table doesn't exist, fallback to NULL
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_compass_freshness() TO anon, authenticated, service_role;
