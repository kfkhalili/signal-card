-- Phase 2: Queue System
-- Create helper functions for queue operations
-- CRITICAL: Idempotent queueing prevents duplicate entries

-- Idempotent queue function (prevents race conditions)
-- CRITICAL: Uses NOT EXISTS check to prevent duplicate queue entries
CREATE OR REPLACE FUNCTION public.queue_refresh_if_not_exists_v2(
  p_symbol TEXT,
  p_data_type TEXT,
  p_priority INTEGER,
  p_estimated_size_bytes BIGINT DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  job_id UUID;
BEGIN
  -- CRITICAL: Idempotent insert - only insert if not already queued
  INSERT INTO public.api_call_queue_v2 (
    symbol,
    data_type,
    status,
    priority,
    estimated_data_size_bytes
  )
  SELECT
    p_symbol,
    p_data_type,
    'pending',
    p_priority,
    p_estimated_size_bytes
  WHERE NOT EXISTS (
    SELECT 1 FROM public.api_call_queue_v2
    WHERE symbol = p_symbol
      AND data_type = p_data_type
      AND status IN ('pending', 'processing')
  )
  RETURNING id INTO job_id;

  RETURN job_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.queue_refresh_if_not_exists_v2 IS 'Idempotently queues a refresh job. Prevents duplicate entries using NOT EXISTS check.';

