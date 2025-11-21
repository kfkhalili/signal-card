-- Remove unused job rate limit tracking
-- CRITICAL: We now track API calls directly, not jobs
-- The job_processing_rate_tracker table and check_and_increment_rate_limit function are no longer used

-- Drop the unused function
DROP FUNCTION IF EXISTS public.check_and_increment_rate_limit(INTEGER);
DROP FUNCTION IF EXISTS public.cleanup_rate_limit_tracker();

-- Drop the unused table
DROP TABLE IF EXISTS public.job_processing_rate_tracker;

COMMENT ON SCHEMA public IS 'Removed job_processing_rate_tracker - now tracking API calls directly via api_calls_rate_tracker';

