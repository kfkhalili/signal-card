-- Consolidated UI job error handling (final state)
-- CRITICAL: UI jobs (priority 1000) must never fail - users are actively waiting for data
-- Solution: Give UI jobs more retries (5 instead of 3) and special error handling

-- Function to set max_retries when creating UI jobs
CREATE OR REPLACE FUNCTION public.set_ui_job_max_retries()
RETURNS TRIGGER AS $$
BEGIN
  -- If priority is 1000 (UI job), set max_retries to 5
  IF NEW.priority = 1000 AND NEW.max_retries < 5 THEN
    NEW.max_retries := 5;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set max_retries for UI jobs
DROP TRIGGER IF EXISTS set_ui_job_max_retries_trigger ON public.api_call_queue_v2;
CREATE TRIGGER set_ui_job_max_retries_trigger
  BEFORE INSERT OR UPDATE ON public.api_call_queue_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ui_job_max_retries();

COMMENT ON FUNCTION public.set_ui_job_max_retries IS 'Automatically sets max_retries to 5 for UI jobs (priority 1000) to prevent failures.';

-- Improve error handling for UI jobs
CREATE OR REPLACE FUNCTION public.fail_queue_job_v2(
  p_job_id UUID,
  p_error_message TEXT
)
RETURNS void AS $$
DECLARE
  current_retry_count INTEGER;
  current_max_retries INTEGER;
  job_priority INTEGER;
BEGIN
  SELECT retry_count, max_retries, priority
  INTO current_retry_count, current_max_retries, job_priority
  FROM public.api_call_queue_v2
  WHERE id = p_job_id
    AND status = 'processing';

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
    RETURN;
  END IF;

  -- CRITICAL: Special handling for FMP rate limit errors (429)
  -- These jobs should keep retrying indefinitely, not fail after max_retries
  IF p_error_message ILIKE '%Limit Reach%' THEN
    UPDATE public.api_call_queue_v2
    SET
      status = 'pending', -- Always reset to pending for rate limit errors
      retry_count = current_retry_count + 1,
      processed_at = NULL,
      error_message = p_error_message
    WHERE id = p_job_id;
  ELSIF current_retry_count >= current_max_retries THEN
    -- If retries exhausted for other errors, mark as failed
    UPDATE public.api_call_queue_v2
    SET
      status = 'failed',
      processed_at = NOW(),
      error_message = p_error_message
    WHERE id = p_job_id;
  ELSE
    -- Otherwise, reset to pending for retry
    UPDATE public.api_call_queue_v2
    SET
      status = 'pending',
      retry_count = current_retry_count + 1,
      processed_at = NULL,
      error_message = p_error_message
    WHERE id = p_job_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.fail_queue_job_v2 IS 'Marks a job as failed or resets to pending for retry. Rate limit errors (429) are always retried indefinitely. UI jobs (priority 1000) get 5 retries instead of 3.';

