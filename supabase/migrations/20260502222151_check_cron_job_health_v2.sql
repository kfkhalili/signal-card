CREATE OR REPLACE FUNCTION public.check_cron_job_health(p_critical_jobs TEXT[])
RETURNS TABLE(jobname TEXT, last_run TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.jobname,
    l.last_run
  FROM public.cron_health_logs l
  WHERE l.jobname = ANY(p_critical_jobs);
END;
$$;