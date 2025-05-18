-- Create table to store live quote data + SMAs
create table public.live_quote_indicators (
  id uuid not null default gen_random_uuid (),
  symbol text not null,
  current_price double precision not null,
  change_percentage double precision null,
  day_change double precision null,
  volume bigint null,
  day_low double precision null,
  day_high double precision null,
  market_cap bigint null,
  day_open double precision null,
  previous_close double precision null,
  api_timestamp bigint not null,
  sma_50d double precision null,
  sma_200d double precision null,
  year_low double precision null,
  year_high double precision null,
  exchange text null,
  fetched_at timestamp with time zone not null default now(),
  constraint live_quote_indicators_pkey primary key (id),
  constraint live_quote_indicators_symbol_key unique (symbol)
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
COMMENT ON COLUMN public.live_quote_indicators.year_low IS 'Lowest price recorded during the last 52 weeks from FMP';
COMMENT ON COLUMN public.live_quote_indicators.year_high IS 'Highest price recorded during the last 52 weeks from FMP';
COMMENT ON COLUMN public.live_quote_indicators.exchange IS 'Name of the primary exchange where this symbol is traded from FMP';
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
