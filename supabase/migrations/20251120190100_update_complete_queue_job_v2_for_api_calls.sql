-- Update complete_queue_job_v2 to accept api_calls_made parameter
-- CRITICAL: API calls are already incremented in check_and_increment_api_calls
-- This function just records the completion, no need to increment again

CREATE OR REPLACE FUNCTION public.complete_queue_job_v2(
  p_job_id UUID,
  p_data_size_bytes BIGINT,
  p_api_calls_made INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  job_data_type TEXT;
  expected_api_calls INTEGER;
BEGIN
  -- Get job data type and expected API calls
  SELECT data_type INTO job_data_type
  FROM public.api_call_queue_v2
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found', p_job_id;
    RETURN;
  END IF;

  -- Get expected API calls from registry (for validation/logging)
  SELECT api_calls_per_job INTO expected_api_calls
  FROM public.data_type_registry_v2
  WHERE data_type = job_data_type;

  -- Update job status
  UPDATE public.api_call_queue_v2
  SET
    status = 'completed',
    processed_at = NOW(),
    actual_data_size_bytes = p_data_size_bytes
  WHERE id = p_job_id
    AND status = 'processing'; -- Only update if still in processing state

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
    RETURN;
  END IF;

  -- CRITICAL: Track data usage for quota enforcement
  INSERT INTO public.api_data_usage_v2 (data_size_bytes, job_id)
  VALUES (p_data_size_bytes, p_job_id);

  -- CRITICAL: API calls were already incremented in check_and_increment_api_calls
  -- No need to increment again here - the counter is already correct
  -- The p_api_calls_made parameter is for logging/validation only

  -- OPTIMIZATION: Auto-correct estimated_data_size_bytes (statistical sampling)
  -- Use random() < 0.01 instead of COUNT(*) for O(1) performance
  -- Statistical sampling: ~1% of jobs (equivalent to every 100th job on average)
  IF random() < 0.01 THEN
    UPDATE public.data_type_registry_v2
    SET estimated_data_size_bytes = CASE
      -- CRITICAL: Handle zero start case - jump straight to actual on first run
      WHEN estimated_data_size_bytes = 0 THEN p_data_size_bytes
      -- Weighted moving average for subsequent updates (90% old, 10% new)
      ELSE (estimated_data_size_bytes * 0.9 + p_data_size_bytes * 0.1)::BIGINT
    END
    WHERE data_type = job_data_type;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.complete_queue_job_v2 IS 'Marks a job as completed and tracks data usage. API calls are already tracked in check_and_increment_api_calls. Auto-corrects registry estimates using statistical sampling.';

