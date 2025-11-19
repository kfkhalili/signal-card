-- Phase 1: Foundation
-- Create api_call_queue_v2 table (partitioned by status)
-- CRITICAL: This table is partitioned to prevent table bloat at scale
-- Partitions: pending, processing, completed, failed

-- Create parent table
CREATE TABLE IF NOT EXISTS public.api_call_queue_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ,
  estimated_data_size_bytes BIGINT DEFAULT 0,
  actual_data_size_bytes BIGINT,
  error_message TEXT,
  job_metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.api_call_queue_v2 IS 'Queue for API calls. Partitioned by status to prevent table bloat at scale.';
COMMENT ON COLUMN public.api_call_queue_v2.symbol IS 'Stock/crypto symbol to fetch data for';
COMMENT ON COLUMN public.api_call_queue_v2.data_type IS 'Type of data to fetch (references data_type_registry_v2.data_type)';
COMMENT ON COLUMN public.api_call_queue_v2.status IS 'Current status: pending, processing, completed, or failed';
COMMENT ON COLUMN public.api_call_queue_v2.priority IS 'Priority level (higher = more urgent). Scheduled jobs use -1.';
COMMENT ON COLUMN public.api_call_queue_v2.retry_count IS 'Number of times this job has been retried';
COMMENT ON COLUMN public.api_call_queue_v2.max_retries IS 'Maximum number of retries before marking as failed';
COMMENT ON COLUMN public.api_call_queue_v2.estimated_data_size_bytes IS 'Estimated size of API response (for quota tracking)';
COMMENT ON COLUMN public.api_call_queue_v2.actual_data_size_bytes IS 'Actual size of API response (from Content-Length header)';
COMMENT ON COLUMN public.api_call_queue_v2.error_message IS 'Error message if job failed';
COMMENT ON COLUMN public.api_call_queue_v2.job_metadata IS 'Additional metadata for the job';

-- Create partitions
CREATE TABLE IF NOT EXISTS public.api_call_queue_v2_pending
  PARTITION OF public.api_call_queue_v2
  FOR VALUES IN ('pending')
  WITH (FILLFACTOR = 70);

CREATE TABLE IF NOT EXISTS public.api_call_queue_v2_processing
  PARTITION OF public.api_call_queue_v2
  FOR VALUES IN ('processing')
  WITH (FILLFACTOR = 70);

CREATE TABLE IF NOT EXISTS public.api_call_queue_v2_completed
  PARTITION OF public.api_call_queue_v2
  FOR VALUES IN ('completed')
  WITH (FILLFACTOR = 70);

CREATE TABLE IF NOT EXISTS public.api_call_queue_v2_failed
  PARTITION OF public.api_call_queue_v2
  FOR VALUES IN ('failed')
  WITH (FILLFACTOR = 70);

-- Indexes on each partition for common queries
-- Pending partition: Priority-based selection
CREATE INDEX IF NOT EXISTS idx_api_call_queue_v2_pending_priority
  ON public.api_call_queue_v2_pending(priority DESC, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_api_call_queue_v2_pending_symbol_data_type
  ON public.api_call_queue_v2_pending(symbol, data_type)
  WHERE status = 'pending';

-- Processing partition: Recovery queries
CREATE INDEX IF NOT EXISTS idx_api_call_queue_v2_processing_processed_at
  ON public.api_call_queue_v2_processing(processed_at)
  WHERE status = 'processing';

-- Completed partition: Analytics (may be truncated weekly)
CREATE INDEX IF NOT EXISTS idx_api_call_queue_v2_completed_processed_at
  ON public.api_call_queue_v2_completed(processed_at DESC);

-- Failed partition: Analytics
CREATE INDEX IF NOT EXISTS idx_api_call_queue_v2_failed_processed_at
  ON public.api_call_queue_v2_failed(processed_at DESC);

-- RLS: Queue is read-only for authenticated users (for monitoring)
ALTER TABLE public.api_call_queue_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read queue for monitoring"
  ON public.api_call_queue_v2
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can modify queue
CREATE POLICY "Only service role can modify queue"
  ON public.api_call_queue_v2
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- CRITICAL: Partitions must have RLS explicitly enabled even though they inherit policies from parent
-- This ensures Supabase shows them as "restricted" instead of "unrestricted"
ALTER TABLE public.api_call_queue_v2_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_queue_v2_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_queue_v2_completed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_queue_v2_failed ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.api_call_queue_v2_pending IS 'Partition of api_call_queue_v2 for pending jobs. RLS enabled - inherits policies from parent.';
COMMENT ON TABLE public.api_call_queue_v2_processing IS 'Partition of api_call_queue_v2 for processing jobs. RLS enabled - inherits policies from parent.';
COMMENT ON TABLE public.api_call_queue_v2_completed IS 'Partition of api_call_queue_v2 for completed jobs. RLS enabled - inherits policies from parent.';
COMMENT ON TABLE public.api_call_queue_v2_failed IS 'Partition of api_call_queue_v2 for failed jobs. RLS enabled - inherits policies from parent.';

