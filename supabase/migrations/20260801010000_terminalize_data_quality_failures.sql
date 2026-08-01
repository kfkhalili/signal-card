-- Deterministic provider-quality failures cannot improve by immediately
-- repeating the same FMP request. Preserve normal retries for transport and
-- database failures while terminalizing explicitly classified QA failures.

CREATE OR REPLACE FUNCTION public.fail_queue_job_v2(
  p_job_id uuid,
  p_error_message text,
  p_data_size_bytes bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_retry_count integer;
  v_current_max_retries integer;
  v_job_data_type text;
BEGIN
  SELECT queue.retry_count, queue.max_retries, queue.data_type
  INTO v_current_retry_count, v_current_max_retries, v_job_data_type
  FROM public.api_call_queue_v2 AS queue
  WHERE queue.id = p_job_id
    AND queue.status = 'processing';

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
    RETURN;
  END IF;

  IF p_error_message LIKE 'Non-retryable data-quality failure:%' THEN
    UPDATE public.api_call_queue_v2 AS queue
    SET status = 'failed',
        processed_at = pg_catalog.now(),
        error_message = p_error_message
    WHERE queue.id = p_job_id
      AND queue.status = 'processing';
  ELSIF p_error_message ILIKE '%Limit Reach%' THEN
    UPDATE public.api_call_queue_v2 AS queue
    SET status = 'pending',
        retry_count = v_current_retry_count + 1,
        processed_at = NULL,
        error_message = p_error_message
    WHERE queue.id = p_job_id
      AND queue.status = 'processing';
  ELSIF p_error_message ILIKE '%stale%'
        AND p_error_message ILIKE '%timestamp%' THEN
    UPDATE public.api_call_queue_v2 AS queue
    SET status = 'failed',
        processed_at = pg_catalog.now(),
        error_message =
          p_error_message
          || ' (Failed immediately - no retries for stale data)'
    WHERE queue.id = p_job_id
      AND queue.status = 'processing';
  ELSIF v_current_retry_count >= v_current_max_retries THEN
    UPDATE public.api_call_queue_v2 AS queue
    SET status = 'failed',
        processed_at = pg_catalog.now(),
        error_message = p_error_message
    WHERE queue.id = p_job_id
      AND queue.status = 'processing';
  ELSE
    UPDATE public.api_call_queue_v2 AS queue
    SET status = 'pending',
        retry_count = v_current_retry_count + 1,
        processed_at = NULL,
        error_message = p_error_message
    WHERE queue.id = p_job_id
      AND queue.status = 'processing';
  END IF;

  IF p_data_size_bytes > 0 THEN
    INSERT INTO public.api_data_usage_v2 (
      data_size_bytes,
      job_id,
      data_type,
      outcome
    )
    VALUES (
      p_data_size_bytes,
      p_job_id,
      v_job_data_type,
      'failure'
    );
  END IF;
END;
$$;

ALTER FUNCTION public.fail_queue_job_v2(uuid, text, bigint)
OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.fail_queue_job_v2(uuid, text, bigint)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.fail_queue_job_v2(uuid, text, bigint)
TO service_role;

COMMENT ON FUNCTION public.fail_queue_job_v2(uuid, text, bigint) IS
  'Records failed-call bandwidth; terminalizes explicitly classified deterministic data-quality failures and otherwise preserves the existing retry policy.';
