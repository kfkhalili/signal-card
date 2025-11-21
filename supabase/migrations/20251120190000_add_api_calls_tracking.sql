-- Add API call tracking to prevent exceeding 300 API calls/minute limit
-- CRITICAL: Different job types make different numbers of API calls
-- Financial-statements: 3 calls (income, balance sheet, cash flow)
-- All other jobs: 1 call

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

-- Step 3: Create function to check and increment API calls
CREATE OR REPLACE FUNCTION public.check_and_increment_api_calls(
  p_api_calls_to_make INTEGER,
  p_max_api_calls_per_minute INTEGER DEFAULT 300
)
RETURNS BOOLEAN AS $$
DECLARE
  current_minute TIMESTAMPTZ;
  current_calls INTEGER;
BEGIN
  -- Get the current minute bucket (rounded down to the minute)
  current_minute := date_trunc('minute', NOW());

  -- Get or create the current minute's count
  INSERT INTO public.api_calls_rate_tracker (minute_bucket, api_calls_made)
  VALUES (current_minute, 0)
  ON CONFLICT (minute_bucket) DO NOTHING;

  -- Get current count (with row lock to prevent race conditions)
  SELECT api_calls_made INTO current_calls
  FROM public.api_calls_rate_tracker
  WHERE minute_bucket = current_minute
  FOR UPDATE; -- Lock the row for update

  -- Check if adding these calls would exceed the limit
  IF current_calls + p_api_calls_to_make > p_max_api_calls_per_minute THEN
    RETURN FALSE; -- Would exceed limit
  END IF;

  -- Increment the count
  UPDATE public.api_calls_rate_tracker
  SET api_calls_made = api_calls_made + p_api_calls_to_make,
      updated_at = NOW()
  WHERE minute_bucket = current_minute;

  RETURN TRUE; -- Within limit
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_and_increment_api_calls IS 'Checks if making N API calls would exceed the global 300 API calls/minute limit. If within limit, increments counter and returns TRUE. If would exceed, returns FALSE without incrementing.';

-- Step 4: Create function to decrement API calls (for failed jobs that didn't make all calls)
CREATE OR REPLACE FUNCTION public.decrement_api_calls(
  p_api_calls_to_remove INTEGER
)
RETURNS void AS $$
DECLARE
  current_minute TIMESTAMPTZ;
BEGIN
  -- Get the current minute bucket
  current_minute := date_trunc('minute', NOW());

  -- Decrement the count (don't go below 0)
  UPDATE public.api_calls_rate_tracker
  SET api_calls_made = GREATEST(0, api_calls_made - p_api_calls_to_remove),
      updated_at = NOW()
  WHERE minute_bucket = current_minute;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.decrement_api_calls IS 'Decrements API call counter. Used when a job fails before making all expected API calls. Prevents over-counting.';

-- Step 5: Cleanup function for old rate limit tracking data
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

