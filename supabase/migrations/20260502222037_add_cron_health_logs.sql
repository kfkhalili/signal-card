-- Create the lightweight tracking table
CREATE TABLE public.cron_health_logs (
  jobname TEXT PRIMARY KEY,
  last_run TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Give it an index for hyper-fast health checks
CREATE INDEX idx_cron_health_last_run ON public.cron_health_logs (last_run DESC);

-- Grant permissions so your Edge Functions/Webhooks can read it if needed
GRANT SELECT, INSERT, UPDATE ON public.cron_health_logs TO authenticated, anon, service_role;