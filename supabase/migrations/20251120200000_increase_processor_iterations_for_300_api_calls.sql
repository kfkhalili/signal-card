-- Increase processor iterations to reach 300 API calls/minute
-- CRITICAL: API call rate limiting (300 calls/minute) is now the primary constraint
-- Job rate limiting is redundant - API call limiting is more accurate
-- Solution: Increase iterations to 3 with 2-second delay to maximize throughput

-- Update the cron job to use more iterations
SELECT cron.unschedule('invoke-processor-v2');

SELECT cron.schedule(
  'invoke-processor-v2',
  '* * * * *', -- Every minute
  $$
  SELECT invoke_processor_loop_v2(
    p_max_iterations := 3, -- Increased from 2 to 3
    p_iteration_delay_seconds := 2 -- Reduced from 5 to 2 seconds
  );
  $$
);

COMMENT ON FUNCTION public.invoke_processor_loop_v2 IS 'Loops processor invocations. Loop is in SQL, Edge Function is stateless. 3 iterations with 2-second delay to maximize throughput while respecting API call limits.';

