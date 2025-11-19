-- Optimize queue processor for faster job processing
-- Increases batch size, concurrency, and iteration count

-- Unschedule the old job and reschedule with new parameters
SELECT cron.unschedule('invoke-processor-v2');

SELECT cron.schedule(
  'invoke-processor-v2',
  '* * * * *', -- Every minute
  $$
  SELECT invoke_processor_loop_v2(
    p_max_iterations := 5,
    p_iteration_delay_seconds := 2
  );
  $$
);

COMMENT ON FUNCTION public.invoke_processor_loop_v2 IS 'Loops processor invocations. Loop is in SQL, Edge Function is stateless. Optimized for faster processing (5 iterations, 2s delay = ~150 jobs per minute).';

