-- Phase 0: Safety Infrastructure
-- Create baseline metrics table to record current system state
-- This allows us to compare old vs new system performance

CREATE TABLE IF NOT EXISTS public.migration_baseline (
  id BIGSERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value JSONB NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notes TEXT
);

COMMENT ON TABLE public.migration_baseline IS 'Baseline metrics recorded before migration. Used to compare old vs new system performance.';
COMMENT ON COLUMN public.migration_baseline.metric_name IS 'Name of the metric (e.g., quote_row_count, profile_latest_fetch)';
COMMENT ON COLUMN public.migration_baseline.metric_value IS 'JSON value of the metric (flexible structure)';
COMMENT ON COLUMN public.migration_baseline.recorded_at IS 'When the metric was recorded';
COMMENT ON COLUMN public.migration_baseline.notes IS 'Optional notes about the metric';

CREATE INDEX IF NOT EXISTS idx_migration_baseline_metric_name ON public.migration_baseline(metric_name);
CREATE INDEX IF NOT EXISTS idx_migration_baseline_recorded_at ON public.migration_baseline(recorded_at);

-- Function to record baseline metrics
CREATE OR REPLACE FUNCTION public.record_baseline_metric(
  p_metric_name TEXT,
  p_metric_value JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  metric_id BIGINT;
BEGIN
  INSERT INTO public.migration_baseline (metric_name, metric_value, notes)
  VALUES (p_metric_name, p_metric_value, p_notes)
  RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.record_baseline_metric IS 'Records a baseline metric for comparison during migration.';

-- Function to capture current system baseline
CREATE OR REPLACE FUNCTION public.capture_system_baseline()
RETURNS TABLE(metric_name TEXT, metric_value JSONB) AS $$
BEGIN
  RETURN QUERY
  WITH metrics AS (
    -- Count rows in each data table
    SELECT 'profiles_row_count'::TEXT AS name, 
           jsonb_build_object('count', COUNT(*), 'table', 'profiles') AS value
    FROM public.profiles
    UNION ALL
    SELECT 'live_quote_indicators_row_count'::TEXT,
           jsonb_build_object('count', COUNT(*), 'table', 'live_quote_indicators')
    FROM public.live_quote_indicators
    UNION ALL
    SELECT 'financial_statements_row_count'::TEXT,
           jsonb_build_object('count', COUNT(*), 'table', 'financial_statements')
    FROM public.financial_statements
    UNION ALL
    -- Latest fetch times
    SELECT 'profiles_latest_fetch'::TEXT,
           jsonb_build_object('latest_fetch', MAX(modified_at), 'table', 'profiles')
    FROM public.profiles
    UNION ALL
    SELECT 'live_quote_indicators_latest_fetch'::TEXT,
           jsonb_build_object('latest_fetch', MAX(fetched_at), 'table', 'live_quote_indicators')
    FROM public.live_quote_indicators
    UNION ALL
    -- Cron job status
    SELECT 'cron_job_count'::TEXT,
           jsonb_build_object('count', COUNT(*), 'table', 'pg_cron.job')
    FROM pg_cron.job
  )
  SELECT name, value FROM metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.capture_system_baseline IS 'Captures current system baseline metrics. Run this before starting migration to establish baseline.';

-- RLS: Baseline metrics are read-only for authenticated users
ALTER TABLE public.migration_baseline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Baseline metrics are readable by authenticated users"
  ON public.migration_baseline
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can insert baseline metrics
CREATE POLICY "Only service role can record baseline metrics"
  ON public.migration_baseline
  FOR INSERT
  TO service_role
  USING (true)
  WITH CHECK (true);

