-- Reduce processor iterations to stay within 75 jobs per minute rate limit
-- CRITICAL: The processor is rate-limited to 75 jobs/minute
-- With 5 iterations × 50 jobs = 250 jobs/minute potential, which exceeds the limit
-- Solution: Reduce iterations to 2 and batch size to 38 (2 × 38 = 76, close to 75)

-- Update the cron job to use fewer iterations
SELECT cron.unschedule('invoke-processor-v2');

SELECT cron.schedule(
  'invoke-processor-v2',
  '* * * * *', -- Every minute
  $$
  SELECT invoke_processor_loop_v2(
    p_max_iterations := 2,
    p_iteration_delay_seconds := 5
  );
  $$
);

COMMENT ON FUNCTION public.invoke_processor_loop_v2 IS 'Loops processor invocations. Loop is in SQL, Edge Function is stateless. Reduced to 2 iterations to stay within 75 jobs/minute rate limit.';

