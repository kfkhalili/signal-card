-- Add global rate limit tracking to coordinate across all function invocations
-- CRITICAL: Multiple function invocations each have their own rate limiter
-- This causes bursts that exceed the 75 jobs/minute limit
-- Solution: Use a database table to track jobs processed per minute globally

-- Create a table to track global job processing rate
CREATE TABLE IF NOT EXISTS public.job_processing_rate_tracker (
  minute_bucket TIMESTAMPTZ PRIMARY KEY,
  jobs_processed INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to check and increment global rate limit
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_jobs_to_process INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_minute TIMESTAMPTZ;
  current_count INTEGER;
  max_jobs_per_minute INTEGER := 75;
BEGIN
  -- Get the current minute bucket (rounded down to the minute)
  current_minute := date_trunc('minute', NOW());

  -- Get or create the current minute's count
  INSERT INTO public.job_processing_rate_tracker (minute_bucket, jobs_processed)
  VALUES (current_minute, 0)
  ON CONFLICT (minute_bucket) DO NOTHING;

  -- Get current count
  SELECT jobs_processed INTO current_count
  FROM public.job_processing_rate_tracker
  WHERE minute_bucket = current_minute;

  -- Check if adding these jobs would exceed the limit
  IF current_count + p_jobs_to_process > max_jobs_per_minute THEN
    RETURN FALSE; -- Would exceed limit
  END IF;

  -- Increment the count
  UPDATE public.job_processing_rate_tracker
  SET jobs_processed = jobs_processed + p_jobs_to_process,
      updated_at = NOW()
  WHERE minute_bucket = current_minute;

  RETURN TRUE; -- Within limit
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_and_increment_rate_limit IS 'Checks if processing jobs would exceed the global 75 jobs/minute rate limit. Returns TRUE if within limit and increments counter, FALSE if would exceed.';

-- Clean up old rate limit tracking data (keep only last hour)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_tracker()
RETURNS void AS $$
BEGIN
  DELETE FROM public.job_processing_rate_tracker
  WHERE minute_bucket < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

