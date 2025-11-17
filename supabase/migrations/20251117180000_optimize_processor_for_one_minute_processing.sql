-- Optimize processor invoker to complete within 1 minute
-- CRITICAL: Records must FINISH processing every minute, not just be created
-- CRITICAL: Reduce iterations and delay to ensure completion within ~50 seconds

-- Update the processor invoker cron job to use faster settings
DO $$
BEGIN
  -- Unschedule the old job
  PERFORM cron.unschedule('invoke-processor-v2');

  -- Reschedule with optimized settings
  -- Reduced to 3 iterations with 10 second delays = ~30-40 seconds max
  -- This leaves ~20 seconds buffer for the next cron run to start
  PERFORM cron.schedule(
    'invoke-processor-v2',
    '* * * * *', -- Every minute
    $cron$
    SELECT invoke_processor_loop_v2(
      p_max_iterations := 3,
      p_iteration_delay_seconds := 10
    );
    $cron$
  );

  RAISE NOTICE 'Updated invoke-processor-v2 to complete within 1 minute (3 iterations, 10s delay)';
END $$;

COMMENT ON FUNCTION invoke_processor_loop_v2 IS 'Loops processor invocations. Loop is in SQL, Edge Function is stateless. Optimized to complete within 50 seconds.';

