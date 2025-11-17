-- Phase 2: Queue System
-- Create queue management functions
-- CRITICAL: Atomic batch claiming, predictive quota check, deadlock handling

-- Function to get a batch of jobs from the queue
-- CRITICAL: Atomic operation - SELECT and UPDATE in same transaction
-- CRITICAL: Uses FOR UPDATE SKIP LOCKED to prevent race conditions
-- CRITICAL: Predictive quota check - accounts for estimated batch size
CREATE OR REPLACE FUNCTION public.get_queue_batch_v2(
  p_batch_size INTEGER DEFAULT 50,
  p_max_priority INTEGER DEFAULT 1000
)
RETURNS TABLE(
  id UUID,
  symbol TEXT,
  data_type TEXT,
  status TEXT,
  priority INTEGER,
  retry_count INTEGER,
  max_retries INTEGER,
  created_at TIMESTAMPTZ,
  estimated_data_size_bytes BIGINT,
  job_metadata JSONB
) AS $$
DECLARE
  v_batch_ids UUID[];
  quota_limit_bytes BIGINT;
  current_usage_bytes BIGINT;
  buffered_quota_bytes BIGINT;
  estimated_batch_size_bytes BIGINT;
BEGIN
  -- CRITICAL: Check quota BEFORE selecting batch
  -- Get quota limit
  quota_limit_bytes := (current_setting('app.settings.quota_limit_bytes', true))::BIGINT;

  -- Get current usage (rolling 30-day window)
  SELECT COALESCE(SUM(data_size_bytes), 0) INTO current_usage_bytes
  FROM public.api_data_usage_v2
  WHERE recorded_at >= NOW() - INTERVAL '30 days';

  -- Calculate buffered quota (95% safety buffer)
  buffered_quota_bytes := (quota_limit_bytes * 0.95)::BIGINT;

  -- CRITICAL: Predictive quota check - estimate batch size BEFORE selecting
  -- This prevents selecting a batch that would exceed quota
  SELECT COALESCE(SUM(batch_estimate.estimated_data_size_bytes), 0) INTO estimated_batch_size_bytes
  FROM (
    SELECT q.estimated_data_size_bytes
    FROM public.api_call_queue_v2 q
    WHERE q.status = 'pending'
      AND q.priority <= p_max_priority
    ORDER BY q.priority DESC, q.created_at ASC
    LIMIT p_batch_size
  ) batch_estimate;

  -- If estimated batch would exceed quota, return empty
  IF current_usage_bytes + estimated_batch_size_bytes >= buffered_quota_bytes THEN
    RAISE NOTICE 'Quota would be exceeded by batch. Current: %, Batch: %, Limit: %',
      current_usage_bytes, estimated_batch_size_bytes, buffered_quota_bytes;
    RETURN;
  END IF;

  -- CRITICAL: Atomic batch claiming
  -- 1. SELECT jobs with FOR UPDATE SKIP LOCKED (prevents race conditions)
  -- 2. UPDATE status to 'processing' in same transaction
  -- 3. RETURN the full job data
  WITH selected_jobs AS (
    SELECT id
    FROM public.api_call_queue_v2
    WHERE status = 'pending'
      AND priority <= p_max_priority
    ORDER BY priority DESC, created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  updated_jobs AS (
    UPDATE public.api_call_queue_v2
    SET status = 'processing',
        processed_at = NOW()
    FROM selected_jobs
    WHERE api_call_queue_v2.id = selected_jobs.id
    RETURNING api_call_queue_v2.id
  )
  SELECT array_agg(updated_jobs.id) INTO v_batch_ids
  FROM updated_jobs;

  -- Return full job data for selected jobs
  RETURN QUERY
  SELECT
    q.id,
    q.symbol,
    q.data_type,
    q.status,
    q.priority,
    q.retry_count,
    q.max_retries,
    q.created_at,
    q.estimated_data_size_bytes,
    q.job_metadata
  FROM public.api_call_queue_v2 q
  WHERE q.id = ANY(COALESCE(v_batch_ids, ARRAY[]::UUID[]))
  ORDER BY q.priority DESC, q.created_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_queue_batch_v2 IS 'Atomically claims a batch of jobs from the queue. Includes predictive quota check and uses FOR UPDATE SKIP LOCKED to prevent race conditions. Fixed array handling bug - uses array_agg in CTE to properly collect multiple IDs.';

-- Function to complete a queue job
-- CRITICAL: Auto-corrects estimated_data_size_bytes in registry (statistical sampling)
-- CRITICAL: Handles zero-start case (first update uses actual size directly)
CREATE OR REPLACE FUNCTION public.complete_queue_job_v2(
  p_job_id UUID,
  p_data_size_bytes BIGINT
)
RETURNS void AS $$
DECLARE
  job_data_type TEXT;
BEGIN
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

  -- OPTIMIZATION: Auto-correct estimated_data_size_bytes (statistical sampling)
  -- Use random() < 0.01 instead of COUNT(*) for O(1) performance
  SELECT data_type INTO job_data_type
  FROM public.api_call_queue_v2
  WHERE id = p_job_id;

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

COMMENT ON FUNCTION public.complete_queue_job_v2 IS 'Marks a job as completed and tracks data usage. Auto-corrects registry estimates using statistical sampling.';

-- Function to fail a queue job (with retry logic)
CREATE OR REPLACE FUNCTION public.fail_queue_job_v2(
  p_job_id UUID,
  p_error_message TEXT
)
RETURNS void AS $$
DECLARE
  current_retry_count INTEGER;
  current_max_retries INTEGER;
BEGIN
  SELECT retry_count, max_retries
  INTO current_retry_count, current_max_retries
  FROM public.api_call_queue_v2
  WHERE id = p_job_id
    AND status = 'processing';

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
    RETURN;
  END IF;

  -- If retries exhausted, mark as failed
  IF current_retry_count >= current_max_retries THEN
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

COMMENT ON FUNCTION public.fail_queue_job_v2 IS 'Marks a job as failed or resets to pending for retry based on retry count.';

-- Function to immediately reset a job to pending (for deadlock recovery)
-- CRITICAL: Does NOT increment retry_count (deadlocks are transient, not failures)
CREATE OR REPLACE FUNCTION public.reset_job_immediate_v2(
  p_job_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE public.api_call_queue_v2
  SET
    status = 'pending',
    processed_at = NULL
  WHERE id = p_job_id
    AND status = 'processing';

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.reset_job_immediate_v2 IS 'Immediately resets a job to pending without incrementing retry_count. Used for deadlock recovery.';

