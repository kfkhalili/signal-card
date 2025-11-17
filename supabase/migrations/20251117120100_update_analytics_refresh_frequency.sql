-- Update analytics refresh frequency to match minimum TTL
-- CRITICAL: Must run at least as frequently as the minimum TTL (1 minute for quotes)
-- The background staleness checker runs every minute and needs accurate subscription data

-- Unschedule the old job
SELECT cron.unschedule('refresh-analytics-v2');

-- Reschedule to run every minute (matches minimum TTL)
SELECT cron.schedule(
  'refresh-analytics-v2',
  '* * * * *', -- Every minute (matches 1-minute TTL for quotes)
  $$
  SELECT refresh_analytics_from_presence_v2();
  $$
);

