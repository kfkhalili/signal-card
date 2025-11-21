-- Consolidated API call tracking system (final state)
-- CRITICAL: Tracks API calls per minute to prevent exceeding 300 calls/minute limit
-- Uses atomic reservation to prevent race conditions across concurrent processors
-- Includes circuit breaker to stop processing when limit is reached

-- Step 1: Add api_calls_per_job column to data_type_registry_v2
ALTER TABLE public.data_type_registry_v2
ADD COLUMN IF NOT EXISTS api_calls_per_job INTEGER DEFAULT 1 NOT NULL;

COMMENT ON COLUMN public.data_type_registry_v2.api_calls_per_job IS 'Number of API calls this data type makes per job. Used for rate limit tracking.';

-- Step 2: Create api_calls_rate_tracker table
CREATE TABLE IF NOT EXISTS public.api_calls_rate_tracker (
  minute_bucket TIMESTAMPTZ PRIMARY KEY,
  api_calls_made INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.api_calls_rate_tracker IS 'Tracks API calls made per minute globally across all function invocations. Used to prevent exceeding 300 API calls/minute limit.';

CREATE INDEX IF NOT EXISTS idx_api_calls_rate_tracker_minute_bucket
  ON public.api_calls_rate_tracker(minute_bucket DESC);

-- RLS: API call rate tracking is read-only for authenticated users (for monitoring)
-- Only service role can modify (INSERT/UPDATE) - only queue processor should modify
ALTER TABLE public.api_calls_rate_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read API call rate data for monitoring"
  ON public.api_calls_rate_tracker
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can insert/update rate tracking data
CREATE POLICY "Only service role can modify API call rate tracking"
  ON public.api_calls_rate_tracker
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 3: Atomic reservation function (check AND reserve in one operation)
CREATE OR REPLACE FUNCTION public.reserve_api_calls(
  p_api_calls_to_reserve INTEGER,
  p_max_api_calls_per_minute INTEGER DEFAULT 300
)
RETURNS BOOLEAN AS $$
DECLARE
  current_minute TIMESTAMPTZ;
  current_calls INTEGER;
BEGIN
  -- Get the current minute bucket
  current_minute := date_trunc('minute', NOW());

  -- Get or create the current minute's count
  INSERT INTO public.api_calls_rate_tracker (minute_bucket, api_calls_made)
  VALUES (current_minute, 0)
  ON CONFLICT (minute_bucket) DO NOTHING;

  -- Get current count with row lock (atomic operation)
  SELECT api_calls_made INTO current_calls
  FROM public.api_calls_rate_tracker
  WHERE minute_bucket = current_minute
  FOR UPDATE; -- Lock the row to prevent concurrent modifications

  -- Check if adding these calls would exceed the limit
  IF current_calls + p_api_calls_to_reserve > p_max_api_calls_per_minute THEN
    RETURN FALSE; -- Would exceed limit, don't reserve
  END IF;

  -- Reserve the calls (increment immediately)
  UPDATE public.api_calls_rate_tracker
  SET api_calls_made = api_calls_made + p_api_calls_to_reserve,
      updated_at = NOW()
  WHERE minute_bucket = current_minute;

  RETURN TRUE; -- Reservation successful
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.reserve_api_calls IS 'Atomically reserves API calls. Checks limit and increments counter in one operation. Returns TRUE if reservation successful, FALSE if would exceed limit. Call this BEFORE making API calls. Once reserved, calls count even if job fails.';

-- Step 4: Circuit breaker function (stop processing when limit is reached)
CREATE OR REPLACE FUNCTION public.should_stop_processing_api_calls(
  p_api_calls_to_reserve INTEGER,
  p_max_api_calls_per_minute INTEGER DEFAULT 300,
  p_safety_buffer INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  current_minute TIMESTAMPTZ;
  current_calls INTEGER;
BEGIN
  -- Get the current minute bucket
  current_minute := date_trunc('minute', NOW());

  -- Get current count
  SELECT api_calls_made INTO current_calls
  FROM public.api_calls_rate_tracker
  WHERE minute_bucket = current_minute;

  -- If no data, we're safe to proceed
  IF current_calls IS NULL THEN
    RETURN FALSE; -- Safe to proceed
  END IF;

  -- Stop if we're at or near the limit (with safety buffer)
  -- This prevents the last few jobs from pushing us over
  RETURN (current_calls + p_api_calls_to_reserve >= p_max_api_calls_per_minute - p_safety_buffer);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.should_stop_processing_api_calls IS 'Circuit breaker: Returns TRUE if we should stop processing to avoid exceeding API call limit. Uses safety buffer to prevent last-minute overruns.';

-- Step 5: Cleanup function for old rate tracking data
CREATE OR REPLACE FUNCTION public.cleanup_api_calls_rate_tracker()
RETURNS void AS $$
BEGIN
  DELETE FROM public.api_calls_rate_tracker
  WHERE minute_bucket < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.cleanup_api_calls_rate_tracker IS 'Cleans up old API call rate tracking data (keeps only last hour).';

-- Step 6: Update existing data type registry entries with api_calls_per_job
UPDATE public.data_type_registry_v2
SET api_calls_per_job = CASE
  WHEN data_type = 'financial-statements' THEN 3
  ELSE 1
END
WHERE api_calls_per_job = 1; -- Only update if still at default (idempotent)

-- Step 7: Update complete_queue_job_v2 to accept api_calls_made parameter (for logging/validation)
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.complete_queue_job_v2 IS 'Marks a job as completed and tracks data usage. API calls are already tracked in reserve_api_calls. Auto-corrects registry estimates using statistical sampling.';

