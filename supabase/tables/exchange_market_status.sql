-- DDL for public.exchange_market_status
-- This table will store the current operational status, hours, and holiday info for various stock exchanges.
-- It's intended to be updated daily by a Supabase Edge Function.

CREATE TABLE public.exchange_market_status (
    exchange_code TEXT PRIMARY KEY NOT NULL, -- The exchange symbol/code as provided by FMP (e.g., NYSE, NASDAQ, ASX). Primary Key.
    name TEXT,                               -- Full name of the stock exchange (e.g., "New York Stock Exchange").
    opening_time_local TEXT,                 -- Exchange local opening time string (e.g., "09:30", "10:00 AM"). NULL if market is generally "CLOSED" for hours.
    closing_time_local TEXT,                 -- Exchange local closing time string (e.g., "16:00", "04:00 PM"). NULL if market is generally "CLOSED" for hours.
    timezone TEXT NOT NULL,                  -- IANA timezone name for the exchange (e.g., "America/New_York", "Australia/Sydney"). Crucial for interpreting local times.
    is_market_open BOOLEAN DEFAULT FALSE,    -- Boolean from FMP's detailed per-exchange check indicating if the market is currently open.
    status_message TEXT,                     -- Descriptive status message, e.g., "Market is Open (NYSE 09:30 AM - 04:00 PM EST)", "Market is Closed (Holiday: Thanksgiving)".
    current_day_is_holiday BOOLEAN DEFAULT FALSE, -- True if the current day (in the exchange's local timezone) is a known holiday for that exchange.
    current_holiday_name TEXT,               -- Name of the holiday if current_day_is_holiday is true.
    raw_holidays_json JSONB,                 -- Stores the raw "stockMarketHolidays" array from FMP for auditing or advanced client-side display.
    last_fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL -- Timestamp of when the data for this specific exchange was last fetched and updated by the Edge Function.
);

-- Enable Row Level Security (RLS) - good practice
ALTER TABLE public.exchange_market_status ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access.
-- Adjust as needed if you have specific authentication requirements for this data.
CREATE POLICY "Allow public read access to exchange market status"
ON public.exchange_market_status
FOR SELECT
USING (true);

-- Add comments to columns for clarity in your database schema
COMMENT ON COLUMN public.exchange_market_status.exchange_code IS 'The exchange symbol/code as provided by FMP (e.g., NYSE, NASDAQ). Primary Key.';
COMMENT ON COLUMN public.exchange_market_status.name IS 'Full name of the stock exchange, preferably from the detailed FMP call.';
COMMENT ON COLUMN public.exchange_market_status.opening_time_local IS 'Exchange local opening time (e.g., "09:30", "10:00 AM"). To be interpreted using the "timezone" column. NULL if FMP indicates hours are "CLOSED".';
COMMENT ON COLUMN public.exchange_market_status.closing_time_local IS 'Exchange local closing time (e.g., "16:00", "04:00 PM"). To be interpreted using the "timezone" column. NULL if FMP indicates hours are "CLOSED".';
COMMENT ON COLUMN public.exchange_market_status.timezone IS 'IANA timezone name for the exchange (e.g., "America/New_York"). Essential for interpreting local times and holiday checks.';
COMMENT ON COLUMN public.exchange_market_status.is_market_open IS 'Boolean indicating if the market is currently open, based on FMP''s detailed per-exchange check.';
COMMENT ON COLUMN public.exchange_market_status.status_message IS 'Descriptive status message combining open/closed status, potentially hours, and holiday information.';
COMMENT ON COLUMN public.exchange_market_status.current_day_is_holiday IS 'True if the current day (in the exchange''s local timezone) is a recognized holiday for that exchange, based on FMP holiday data.';
COMMENT ON COLUMN public.exchange_market_status.current_holiday_name IS 'Name of the holiday if current_day_is_holiday is true.';
COMMENT ON COLUMN public.exchange_market_status.raw_holidays_json IS 'Stores the raw stockMarketHolidays array from FMP (typically for current and upcoming years) for reference or advanced client-side processing.';
COMMENT ON COLUMN public.exchange_market_status.last_fetched_at IS 'Timestamp of when the data for this specific exchange was last fetched and updated by the daily Edge Function.';

-- Consider an index on `timezone` if you frequently query by it,
-- though `exchange_code` (PK) will be the primary lookup method.
-- CREATE INDEX IF NOT EXISTS idx_exchange_market_status_timezone ON public.exchange_market_status(timezone);