BEGIN;

DO $$
DECLARE
  v_terminal_job uuid := gen_random_uuid();
  v_retryable_job uuid := gen_random_uuid();
  v_status text;
  v_retry_count integer;
BEGIN
  INSERT INTO public.api_call_queue_v2 (
    id,
    symbol,
    data_type,
    status,
    retry_count,
    max_retries,
    processed_at
  )
  VALUES
    (
      v_terminal_job,
      'QAVT',
      'exchange-variants',
      'processing',
      0,
      3,
      now()
    ),
    (
      v_retryable_job,
      'QAVR',
      'exchange-variants',
      'processing',
      0,
      3,
      now()
    );

  PERFORM public.fail_queue_job_v2(
    v_terminal_job,
    'Non-retryable data-quality failure: fixture',
    2
  );

  SELECT status, retry_count
  INTO v_status, v_retry_count
  FROM public.api_call_queue_v2
  WHERE id = v_terminal_job;

  IF v_status <> 'failed' OR v_retry_count <> 0 THEN
    RAISE EXCEPTION
      'data-quality failure was not terminalized: status %, retry %',
      v_status,
      v_retry_count;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.api_data_usage_v2
    WHERE job_id = v_terminal_job
      AND data_size_bytes = 2
      AND data_type = 'exchange-variants'
      AND outcome = 'failure'
  ) THEN
    RAISE EXCEPTION 'terminal data-quality failure bandwidth was not recorded';
  END IF;

  PERFORM public.fail_queue_job_v2(
    v_retryable_job,
    'temporary database error',
    3
  );

  SELECT status, retry_count
  INTO v_status, v_retry_count
  FROM public.api_call_queue_v2
  WHERE id = v_retryable_job;

  IF v_status <> 'pending' OR v_retry_count <> 1 THEN
    RAISE EXCEPTION
      'ordinary failure did not retain normal retry behavior: status %, retry %',
      v_status,
      v_retry_count;
  END IF;
END;
$$;

ROLLBACK;
