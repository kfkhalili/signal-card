-- Remove redundant legacy cron jobs
-- These data types are now handled natively by the V2 Queue System on-demand

DO $$
BEGIN
  -- 1. Remove daily-fetch-fmp-ratios-ttm
  PERFORM cron.unschedule('daily-fetch-fmp-ratios-ttm');
  
  -- 2. Remove hourly-fetch-fmp-profiles
  PERFORM cron.unschedule('hourly-fetch-fmp-profiles');
  
  -- 3. Remove monthly-fetch-fmp-financial-statements
  PERFORM cron.unschedule('monthly-fetch-fmp-financial-statements');
  
  -- 4. Remove quarterly-fetch-fmp-dividend-history
  PERFORM cron.unschedule('quarterly-fetch-fmp-dividend-history');
  
  -- 5. Remove daily-fetch-fmp-exchange-variants
  PERFORM cron.unschedule('daily-fetch-fmp-exchange-variants');
  
  -- 6. Remove monthly-fetch-fmp-grades-historical
  PERFORM cron.unschedule('monthly-fetch-fmp-grades-historical');
  
  -- 7. Remove yearly-fetch-fmp-revenue-segmentation
  PERFORM cron.unschedule('yearly-fetch-fmp-revenue-segmentation');

  RAISE NOTICE 'Successfully removed all redundant legacy cron jobs.';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error removing cron jobs: %', SQLERRM;
END $$;
