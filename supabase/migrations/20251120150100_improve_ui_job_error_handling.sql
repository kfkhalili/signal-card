-- Improve error handling for UI jobs to prevent failures
-- CRITICAL: UI jobs (priority 1000) must never fail - users are actively waiting

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

  -- CRITICAL: Rate limit errors (429) should be marked as failed immediately
  -- EXCEPT for UI jobs - they should retry even rate limit errors (user is waiting)
  IF (p_error_message LIKE 'RATE_LIMIT_429:%' OR p_error_message LIKE '%429%' OR p_error_message LIKE '%Limit Reach%')
     AND job_priority < 1000 THEN
    -- Non-UI jobs: mark rate limit errors as failed immediately
    UPDATE public.api_call_queue_v2
    SET
      status = 'failed',
      processed_at = NOW(),
      error_message = p_error_message
    WHERE id = p_job_id;
    RETURN;
  END IF;

  -- If retries exhausted, mark as failed
  IF current_retry_count >= current_max_retries THEN
    -- CRITICAL: For UI jobs with "stale data" errors, be more lenient
    -- Stale data errors can be transient (API cache issues), so give UI jobs one more chance
    IF job_priority = 1000 AND p_error_message LIKE '%stale%' AND current_retry_count < current_max_retries + 1 THEN
      -- Give UI jobs one extra retry for stale data errors
      UPDATE public.api_call_queue_v2
      SET
        status = 'pending',
        retry_count = current_retry_count + 1,
        processed_at = NULL,
        error_message = p_error_message
      WHERE id = p_job_id;
    ELSE
      UPDATE public.api_call_queue_v2
      SET
        status = 'failed',
        processed_at = NOW(),
        error_message = p_error_message
      WHERE id = p_job_id;
    END IF;
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

COMMENT ON FUNCTION public.fail_queue_job_v2 IS 'Marks a job as failed or resets to pending for retry. UI jobs (priority 1000) get extra retries for stale data errors and retry rate limit errors. Rate limit errors for non-UI jobs are marked as failed immediately.';

