-- Idempotent cron job scheduling
-- This file can be run multiple times without errors

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'minute-fetch-fmp-quote-indicators'
  ) THEN
    PERFORM cron.schedule(
      'minute-fetch-fmp-quote-indicators',
      '* * * * *', -- every minute
      $cron$
      select
        net.http_post(
            url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-quote-indicators',
            headers:=jsonb_build_object(
              'Content-type', 'application/json',
              'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
            )
        ) as request_id;
      $cron$
    );
  END IF;
END $$;

DO $$
BEGIN
  -- Exchange market status needs hourly updates to reflect accurate market open/closed status
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'hourly-fetch-fmp-all-exchange-market-status'
  ) THEN
    PERFORM cron.schedule(
      'hourly-fetch-fmp-all-exchange-market-status',
      '0 * * * *', -- At minute 0 of every hour (top of the hour)
      $cron$
      SELECT
        net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/fetch-fmp-all-exchange-market-status',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
          )
        ) AS request_id;
      $cron$
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'monthly-fetch-fmp-financial-statements'
  ) THEN
    PERFORM cron.schedule(
      'monthly-fetch-fmp-financial-statements',
      '0 0 1 * *', -- every month on the 1st at midnight
      $cron$
      SELECT
        net.http_post(
            url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-financial-statements',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
            ),
            body := '{}'::jsonb
        ) AS request_id;
      $cron$
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'hourly-fetch-fmp-profiles'
  ) THEN
    PERFORM cron.schedule(
      'hourly-fetch-fmp-profiles',
      '0 * * * *', -- At minute 0 of every hour
      $cron$
      SELECT
        net.http_post(
            url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-profiles',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
            ),
            body := '{}'::jsonb
        ) AS request_id;
      $cron$
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'daily-fetch-fmp-shares-float'
  ) THEN
    PERFORM cron.schedule(
      'daily-fetch-fmp-shares-float',
      '0 3 * * *', -- Every day at 3:00 AM UTC
      $cron$
      SELECT
        net.http_post(
            url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-shares-float',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
            ),
            body := '{}'::jsonb
        ) AS request_id;
      $cron$
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'daily-fetch-fmp-ratios-ttm'
  ) THEN
    PERFORM cron.schedule(
      'daily-fetch-fmp-ratios-ttm',
      '0 2 * * *', -- Every day at 2:00 AM UTC
      $cron$
      SELECT
        net.http_post(
            url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-ratios-ttm',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
            ),
            body := '{}'::jsonb
        ) AS request_id;
      $cron$
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'quarterly-fetch-fmp-dividend-history'
  ) THEN
    PERFORM cron.schedule(
      'quarterly-fetch-fmp-dividend-history',
      '0 0 1 1,4,7,10 *', -- At 00:00 on day-of-month 1 in January, April, July, and October.
      $cron$
      SELECT
        net.http_post(
            url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-dividend-history',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
            ),
            body := '{}'::jsonb
        ) AS request_id;
      $cron$
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'yearly-fetch-fmp-revenue-segmentation'
  ) THEN
    PERFORM cron.schedule(
      'yearly-fetch-fmp-revenue-segmentation',
      '0 1 1 1 *', -- At 01:00 AM on day-of-month 1 in January.
      $cron$
      SELECT
        net.http_post(
            url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-revenue-segmentation',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
            ),
            body := '{}'::jsonb
        ) AS request_id;
      $cron$
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'monthly-fetch-fmp-grades-historical'
  ) THEN
    PERFORM cron.schedule(
      'monthly-fetch-fmp-grades-historical',
      '0 0 2 * *', -- At 00:00 on day-of-month 2.
      $cron$
      SELECT
        net.http_post(
            url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-grades-historical',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
            ),
            body := '{}'::jsonb
        ) AS request_id;
      $cron$
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'daily-fetch-fmp-exchange-variants'
  ) THEN
    PERFORM cron.schedule(
      'daily-fetch-fmp-exchange-variants',
      '0 4 * * *', -- Every day at 4:00 AM UTC
      $cron$
      SELECT
        net.http_post(
            url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-exchange-variants',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
            ),
            body := '{}'::jsonb
        ) AS request_id;
      $cron$
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'daily-fetch-exchange-rates'
  ) THEN
    PERFORM cron.schedule(
      'daily-fetch-exchange-rates',
      '0 1 * * *', -- Every day at 1:00 AM UTC
      $cron$
      SELECT
        net.http_post(
            url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-exchange-rates',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
            )
        ) AS request_id;
      $cron$
    );
  END IF;
END $$;

