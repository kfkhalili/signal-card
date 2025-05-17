-- Create the NEW table to store live quote data + SMAs
CREATE TABLE public.live_quote_indicators (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),       -- Unique identifier for the row in this table
    symbol text NOT NULL UNIQUE,                         -- Stock symbol (e.g., 'AAPL'), constrained to be unique
    current_price double precision NOT NULL,             -- Current price from the quote
    change_percentage double precision,                  -- Percentage change for the day
    day_change double precision,                         -- Absolute price change for the day
    volume bigint,                                       -- Volume recorded with the quote
    day_low double precision,                            -- Lowest price recorded during the day
    day_high double precision,                           -- Highest price recorded during the day
    market_cap bigint,                                   -- Market capitalization
    day_open double precision,                           -- Opening price for the day
    previous_close double precision,                     -- Previous trading day's closing price
    api_timestamp bigint NOT NULL,                       -- Raw epoch timestamp provided by the FMP /quote API (seconds since epoch)
    sma_50d double precision,                            -- Latest 50-day Simple Moving Average
    sma_200d double precision,                           -- Latest 200-day Simple Moving Average
    fetched_at timestamptz NOT NULL DEFAULT now()        -- Timestamp when this data was inserted/updated in the DB
);

-- Add comments to columns for clarity
COMMENT ON COLUMN public.live_quote_indicators.id IS 'Unique identifier for the quote record in this table';
COMMENT ON COLUMN public.live_quote_indicators.symbol IS 'Stock symbol (e.g., AAPL), unique.';
COMMENT ON COLUMN public.live_quote_indicators.current_price IS 'Current price from the FMP /quote endpoint';
COMMENT ON COLUMN public.live_quote_indicators.change_percentage IS 'Percentage change for the day from FMP';
COMMENT ON COLUMN public.live_quote_indicators.day_change IS 'Absolute price change for the day from FMP';
COMMENT ON COLUMN public.live_quote_indicators.volume IS 'Volume recorded with the quote from FMP';
COMMENT ON COLUMN public.live_quote_indicators.day_low IS 'Lowest price recorded during the day from FMP';
COMMENT ON COLUMN public.live_quote_indicators.day_high IS 'Highest price recorded during the day from FMP';
COMMENT ON COLUMN public.live_quote_indicators.market_cap IS 'Market capitalization from FMP';
COMMENT ON COLUMN public.live_quote_indicators.day_open IS 'Opening price for the day from FMP';
COMMENT ON COLUMN public.live_quote_indicators.previous_close IS 'Previous trading days closing price from FMP';
COMMENT ON COLUMN public.live_quote_indicators.api_timestamp IS 'Raw epoch timestamp provided by the FMP /quote API (seconds since epoch)';
COMMENT ON COLUMN public.live_quote_indicators.sma_50d IS 'Latest 50-day Simple Moving Average from FMP';
COMMENT ON COLUMN public.live_quote_indicators.sma_200d IS 'Latest 200-day Simple Moving Average from FMP';
COMMENT ON COLUMN public.live_quote_indicators.fetched_at IS 'Timestamp when this row was inserted/updated in the Supabase table';

-- Add index for potentially useful queries
CREATE INDEX IF NOT EXISTS idx_live_quote_indicators_fetched_at ON public.live_quote_indicators(fetched_at DESC);

-- Unique constraint on 'symbol' is already defined inline.

-- Enable Row Level Security (RLS)
ALTER TABLE public.live_quote_indicators ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Allow read access
CREATE POLICY "Allow read access to everyone"
ON public.live_quote_indicators
FOR SELECT
USING (true);

-- Grant usage permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.live_quote_indicators TO anon, authenticated;
