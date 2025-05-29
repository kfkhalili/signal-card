  select
  cron.schedule(
    'minute-fetch-fmp-quote-indicators',
    '* * * * *', -- every minute
    $$
    select
      net.http_post(
          url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-quote-indicators',
          headers:=jsonb_build_object(
            'Content-type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
          )
      ) as request_id;
    $$
);

  select
  cron.schedule(
    'daily-fetch-fmp-all-exchange-market-status',
    '0 0 * * *', -- every day at midnight
    $$
    select
      net.http_post(
          url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-fmp-all-exchange-market-status',
          headers:=jsonb_build_object(
            'Content-type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
          )
      ) as request_id;
    $$
);

SELECT
  cron.schedule(
    'monthly-fetch-fmp-financial-statements',
    '0 0 1 * *', -- every month on the 1st at midnight
    $$
    SELECT
      net.http_post(
          url := current_setting('supabase.functions.url') || '/fetch-fmp-financial-statements', -- Use helper to get Edge Function URL
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key') -- Ensure you have service_role_key in vault
          ),
          body := '{}'::jsonb -- Send an empty JSON body or any required payload
      ) AS request_id;
    $$
  );

SELECT cron.schedule(
    'hourly-fetch-fmp-profiles', -- Unique name for the cron job
    '0 * * * *',                  -- Cron expression: At minute 0 of every hour
    $$
    SELECT
        net.http_post(
            url := current_setting('supabase.functions.url') || '/fetch-fmp-profiles', -- Adjust if your function name differs
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key') -- Ensure service_role_key is in vault
            ),
            body := '{}'::jsonb -- Empty body for this function
        ) AS request_id;
    $$
);

SELECT
  cron.schedule(
    'daily-fetch-fmp-shares-float',
    '0 3 * * *', -- Every day at 3:00 AM UTC
    $$
    SELECT
      net.http_post(
          url := current_setting('supabase.functions.url') || '/fetch-fmp-shares-float',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
          ),
          body := '{}'::jsonb -- Empty body or any required payload
      ) AS request_id;
    $$
  );

SELECT
  cron.schedule(
    'daily-fetch-fmp-ratios-ttm',
    '0 2 * * *', -- Every day at 2:00 AM UTC
    $$
    SELECT
      net.http_post(
          url := current_setting('supabase.functions.url') || '/fetch-fmp-ratios-ttm', -- Ensure Edge Function name matches
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key') -- Ensure service_role_key is in vault
          ),
          body := '{}'::jsonb -- Empty body or any required payload
      ) AS request_id;
    $$
  );