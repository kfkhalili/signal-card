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
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
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
$$;

COMMENT ON FUNCTION public.get_queue_batch_v2 IS 'Atomically claims a batch of jobs from the queue. Includes predictive quota check and uses FOR UPDATE SKIP LOCKED to prevent race conditions. Fixed array handling bug - uses array_agg in CTE to properly collect multiple IDs.';

-- Function to complete a queue job
-- CRITICAL: Auto-corrects estimated_data_size_bytes in registry (statistical sampling)
-- CRITICAL: Handles zero-start case (first update uses actual size directly)
CREATE OR REPLACE FUNCTION public.complete_queue_job_v2(
  p_job_id UUID,
  p_data_size_bytes BIGINT,
  p_api_calls_made INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  job_data_type TEXT;
  expected_api_calls INTEGER;
BEGIN
  -- Get job data type
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

  -- CRITICAL: API calls were already reserved and counted in reserve_api_calls
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
$$;

COMMENT ON FUNCTION public.complete_queue_job_v2 IS 'Marks a job as completed and tracks data usage. API calls are already tracked in reserve_api_calls. Auto-corrects registry estimates using statistical sampling.';

-- Function to set max_retries when creating UI jobs
-- CRITICAL: UI jobs (priority 1000) must never fail - users are actively waiting for data
-- Solution: Give UI jobs more retries (5 instead of 3)
CREATE OR REPLACE FUNCTION public.set_ui_job_max_retries()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  -- If priority is 1000 (UI job), set max_retries to 5
  IF NEW.priority = 1000 AND NEW.max_retries < 5 THEN
    NEW.max_retries := 5;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set max_retries for UI jobs
DROP TRIGGER IF EXISTS set_ui_job_max_retries_trigger ON public.api_call_queue_v2;
CREATE TRIGGER set_ui_job_max_retries_trigger
  BEFORE INSERT OR UPDATE ON public.api_call_queue_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ui_job_max_retries();

COMMENT ON FUNCTION public.set_ui_job_max_retries IS 'Automatically sets max_retries to 5 for UI jobs (priority 1000) to prevent failures.';

-- Function to fail a queue job (with retry logic)
-- CRITICAL: Special handling for different error types:
-- 1. Rate limit errors (429): Retry indefinitely
-- 2. Stale data errors: Fail immediately (no retries)
-- 3. Other errors: Standard retry logic
CREATE OR REPLACE FUNCTION public.fail_queue_job_v2(
  p_job_id UUID,
  p_error_message TEXT
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
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
  -- CRITICAL: Fail stale data errors immediately (no retries)
  -- When FMP returns data with the same timestamp as existing data,
  -- retrying is wasteful - FMP will keep returning the same stale data.
  -- This saves API calls and improves queue performance.
  ELSIF p_error_message ILIKE '%stale%' AND p_error_message ILIKE '%timestamp%' THEN
    UPDATE public.api_call_queue_v2
    SET
      status = 'failed',
      processed_at = NOW(),
      error_message = p_error_message || ' (Failed immediately - no retries for stale data)'
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
$$;

COMMENT ON FUNCTION public.fail_queue_job_v2 IS 'Marks a job as failed or resets to pending for retry. Rate limit errors (429) are always retried indefinitely. Stale data errors (same timestamp) fail immediately without retries to save API calls. UI jobs (priority 1000) get 5 retries instead of 3.';

-- Function to immediately reset a job to pending (for deadlock recovery)
-- CRITICAL: Does NOT increment retry_count (deadlocks are transient, not failures)
CREATE OR REPLACE FUNCTION public.reset_job_immediate_v2(
  p_job_id UUID
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
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
$$;

COMMENT ON FUNCTION public.reset_job_immediate_v2 IS 'Immediately resets a job to pending without incrementing retry_count. Used for deadlock recovery.';

