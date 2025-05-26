  select
  cron.schedule(
    'fetch-fmp-quote-indicators',
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
    'fetch-all-exchange-market-status',
    '0 0 * * *', -- every day at midnight
    $$
    select
      net.http_post(
          url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fetch-all-exchange-market-status',
          headers:=jsonb_build_object(
            'Content-type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
          )
      ) as request_id;
    $$
);

SELECT
  cron.schedule(
    'fetch-monthly-financial-statements',
    '0 0 1 * *', -- every month on the 1st at midnight
    $$
    SELECT
      net.http_post(
          url := current_setting('supabase.functions.url') || '/fetch-financial-statements', -- Use helper to get Edge Function URL
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key') -- Ensure you have service_role_key in vault
          ),
          body := '{}'::jsonb -- Send an empty JSON body or any required payload
      ) AS request_id;
    $$
  );