-- Create exchange_market_status table
CREATE TABLE IF NOT EXISTS public.exchange_market_status (
    exchange_code TEXT PRIMARY KEY,
    name TEXT,
    opening_time_local TEXT, -- Consider TIME or TIMESTAMPTZ if precision is needed
    closing_time_local TEXT, -- Consider TIME or TIMESTAMPTZ
    timezone TEXT NOT NULL,
    is_market_open BOOLEAN,
    status_message TEXT,
    current_day_is_holiday BOOLEAN,
    current_holiday_name TEXT,
    raw_holidays_json JSONB,
    last_fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.exchange_market_status IS 'Stores market status for different exchanges.';
COMMENT ON COLUMN public.exchange_market_status.exchange_code IS 'Short code for the exchange (e.g., NASDAQ, NYSE). Primary Key.';