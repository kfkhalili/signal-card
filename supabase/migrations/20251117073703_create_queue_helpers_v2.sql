-- Phase 2: Queue System
-- Create helper functions for queue operations
-- CRITICAL: Idempotent queueing prevents duplicate entries

-- Idempotent queue function with priority promotion
-- CRITICAL: UPSERTs jobs - inserts new or updates priority of existing jobs
-- CRITICAL: If job exists (pending/processing), raises priority to p_priority (for UI/heartbeat jobs)
CREATE OR REPLACE FUNCTION public.queue_refresh_if_not_exists_v2(
  p_symbol TEXT,
  p_data_type TEXT,
  p_priority INTEGER,
  p_estimated_size_bytes BIGINT DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  job_id UUID;
  existing_job_id UUID;
BEGIN
  -- Check if job already exists (pending or processing)
  SELECT id INTO existing_job_id
  FROM public.api_call_queue_v2
  WHERE symbol = p_symbol
    AND data_type = p_data_type
    AND status IN ('pending', 'processing')
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    -- Job exists: UPDATE priority to promote it (UI/heartbeat jobs take precedence)
    UPDATE public.api_call_queue_v2
    SET priority = GREATEST(priority, p_priority) -- Only raise priority, never lower it
    WHERE id = existing_job_id;

    job_id := existing_job_id;
  ELSE
    -- Job doesn't exist: INSERT new job
    INSERT INTO public.api_call_queue_v2 (
      symbol,
      data_type,
      status,
      priority,
      estimated_data_size_bytes
    )
    VALUES (
      p_symbol,
      p_data_type,
      'pending',
      p_priority,
      p_estimated_size_bytes
    )
    RETURNING id INTO job_id;
  END IF;

  RETURN job_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.queue_refresh_if_not_exists_v2 IS 'Idempotently queues a refresh job. If job exists (pending/processing), updates priority to promote it (UI/heartbeat jobs take precedence). If job does not exist, inserts new job. Uses GREATEST to only raise priority, never lower it.';

