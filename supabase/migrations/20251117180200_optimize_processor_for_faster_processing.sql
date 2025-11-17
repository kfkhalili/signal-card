-- Optimize processor invoker for faster processing
-- CRITICAL: Reduce iterations and delay to process faster
-- CRITICAL: Edge Function processing is slow (90-200s), so we need to process more frequently

-- Update the processor invoker cron job to process more aggressively
DO $$
BEGIN
  -- Unschedule the old job
  PERFORM cron.unschedule('invoke-processor-v2');

  -- Reschedule with more aggressive settings
  -- 2 iterations with 5 second delays = ~10-15 seconds max
  -- This allows processing to happen more frequently
  PERFORM cron.schedule(
    'invoke-processor-v2',
    '* * * * *', -- Every minute
    $cron$
    SELECT invoke_processor_loop_v2(
      p_max_iterations := 2,
      p_iteration_delay_seconds := 5
    );
    $cron$
  );

  RAISE NOTICE 'Updated invoke-processor-v2 for faster processing (2 iterations, 5s delay)';
END $$;

COMMENT ON FUNCTION invoke_processor_loop_v2 IS 'Loops processor invocations. Loop is in SQL, Edge Function is stateless. Optimized for faster processing (2 iterations, 5s delay).';

