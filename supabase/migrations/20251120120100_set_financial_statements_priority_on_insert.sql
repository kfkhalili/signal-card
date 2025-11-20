-- Set financial-statements jobs to priority 500 when created
-- CRITICAL: Financial-statements jobs make 3 API calls each, so prioritizing them
-- ensures we hit exactly 300 API calls per minute (100 jobs × 3 calls = 300 calls)
-- CRITICAL: Priority 500 is higher than background jobs (0) but lower than UI jobs (1000)
-- This ensures financial-statements are processed before other background jobs, but UI jobs still take precedence

-- Update queue_refresh_if_not_exists_v2 to set financial-statements to priority 500
-- (unless it's a UI job with priority 1000)
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
  final_priority INTEGER;
BEGIN
  -- CRITICAL: Set financial-statements to priority 500 (unless it's a UI job with priority 1000)
  IF p_data_type = 'financial-statements' AND p_priority < 1000 THEN
    final_priority := 500;
  ELSE
    final_priority := p_priority;
  END IF;

  -- Check if job already exists (pending or processing)
  SELECT id INTO existing_job_id
  FROM public.api_call_queue_v2
  WHERE symbol = p_symbol
    AND data_type = p_data_type
    AND status IN ('pending', 'processing')
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    -- Job exists: UPDATE priority to promote it (UI/heartbeat jobs take precedence)
    -- CRITICAL: For financial-statements, only raise to 500 if current priority is lower
    -- But if it's a UI job (1000), keep it at 1000
    UPDATE public.api_call_queue_v2
    SET priority = GREATEST(priority, final_priority) -- Only raise priority, never lower it
    WHERE id = existing_job_id;

    job_id := existing_job_id;
  ELSE
    -- Job doesn't exist: INSERT new job with appropriate priority
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
      final_priority,
      p_estimated_size_bytes
    )
    RETURNING id INTO job_id;
  END IF;

  RETURN job_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.queue_refresh_if_not_exists_v2 IS 'Idempotently queues a refresh job. Financial-statements jobs automatically get priority 500 (unless UI job with priority 1000). If job exists (pending/processing), updates priority to promote it (UI/heartbeat jobs take precedence). If job does not exist, inserts new job. Uses GREATEST to only raise priority, never lower it.';

