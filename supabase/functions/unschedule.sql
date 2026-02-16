select cron.unschedule('minute-fetch-fmp-quote-indicators');
select cron.unschedule('minute-fetch-fmp-exchange-prices-api');
select cron.unschedule('daily-fetch-all-exchange-market-status')
select cron.unschedule('monthly-fetch-financial-statements');
select cron.unschedule('hourly-fetch-fmp-profiles');
SELECT cron.unschedule('daily-fetch-fmp-shares-float');
SELECT cron.unschedule('daily-fetch-fmp-ratios-ttm');
SELECT cron.unschedule('quarterly-fetch-fmp-dividend-history');
SELECT cron.unschedule('yearly-fetch-fmp-revenue-segmentation');
SELECT cron.unschedule('yearly-fetch-fmp-grades-historical');
SELECT cron.unschedule('daily-fetch-fmp-exchange-variants');
SELECT cron.unschedule('daily-fetch-exchange-rates');
SELECT cron.unschedule('refresh-compass-leaderboard-mv');

SELECT cron.schedule(
  'refresh-compass-leaderboard-mv',
  '0 0 * * *', 
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_compass_pillar_scores; $$
);