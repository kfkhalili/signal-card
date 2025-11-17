-- Phase 1: Foundation
-- Create api_data_usage_v2 table (quota tracking)
-- Tracks data usage for rolling 30-day quota enforcement

CREATE TABLE IF NOT EXISTS public.api_data_usage_v2 (
  id BIGSERIAL PRIMARY KEY,
  data_size_bytes BIGINT NOT NULL,
  job_id UUID,
  recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.api_data_usage_v2 IS 'Tracks API data usage for rolling 30-day quota enforcement. Enables predictive quota checks.';
COMMENT ON COLUMN public.api_data_usage_v2.data_size_bytes IS 'Size of data transferred in bytes (from Content-Length header)';
COMMENT ON COLUMN public.api_data_usage_v2.job_id IS 'Reference to api_call_queue_v2.id (optional, for tracking)';
COMMENT ON COLUMN public.api_data_usage_v2.recorded_at IS 'When this usage was recorded';

-- Index for rolling 30-day queries
CREATE INDEX IF NOT EXISTS idx_api_data_usage_v2_recorded_at 
  ON public.api_data_usage_v2(recorded_at DESC);

-- Index for job tracking
CREATE INDEX IF NOT EXISTS idx_api_data_usage_v2_job_id 
  ON public.api_data_usage_v2(job_id)
  WHERE job_id IS NOT NULL;

-- RLS: Usage data is read-only for authenticated users (for monitoring)
ALTER TABLE public.api_data_usage_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read usage data for monitoring"
  ON public.api_data_usage_v2
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can insert usage data
CREATE POLICY "Only service role can record usage"
  ON public.api_data_usage_v2
  FOR INSERT
  TO service_role
  WITH CHECK (true);

