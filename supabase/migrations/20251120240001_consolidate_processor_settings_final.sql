-- Consolidated processor settings (final state)
-- CRITICAL: Processor runs 3 iterations per minute with 2-second delay
-- This maximizes throughput while respecting API call limits (300 calls/minute)

-- Update the cron job to use final settings
SELECT cron.unschedule('invoke-processor-v2');

SELECT cron.schedule(
  'invoke-processor-v2',
  '* * * * *', -- Every minute
  $$
  SELECT invoke_processor_loop_v2(
    p_max_iterations := 3,
    p_iteration_delay_seconds := 2
  );
  $$
);

COMMENT ON FUNCTION public.invoke_processor_loop_v2 IS 'Loops processor invocations. Loop is in SQL, Edge Function is stateless. 3 iterations with 2-second delay to maximize throughput while respecting API call limits (300 calls/minute).';

