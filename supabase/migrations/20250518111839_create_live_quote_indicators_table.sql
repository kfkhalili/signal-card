-- Create live_quote_indicators table
CREATE TABLE IF NOT EXISTS public.live_quote_indicators (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    symbol TEXT NOT NULL UNIQUE, -- Ensure this is unique as per ERD
    current_price DOUBLE PRECISION NOT NULL,
    change_percentage DOUBLE PRECISION,
    day_change DOUBLE PRECISION,
    volume BIGINT,
    day_low DOUBLE PRECISION,
    day_high DOUBLE PRECISION,
    market_cap BIGINT,
    day_open DOUBLE PRECISION,
    previous_close DOUBLE PRECISION,
    api_timestamp BIGINT NOT NULL, -- Unix timestamp in seconds from FMP
    sma_50d DOUBLE PRECISION,
    sma_200d DOUBLE PRECISION,
    year_low DOUBLE PRECISION,
    year_high DOUBLE PRECISION,
    exchange TEXT, -- Exchange short code
    fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT fk_lqi_symbol FOREIGN KEY(symbol) REFERENCES public.profiles(symbol) ON DELETE CASCADE,
    CONSTRAINT fk_lqi_exchange FOREIGN KEY(exchange) REFERENCES public.exchange_market_status(exchange_code) ON DELETE SET NULL -- Or ON DELETE RESTRICT if exchange status is vital
);

-- Indexes for live_quote_indicators
CREATE INDEX IF NOT EXISTS idx_lqi_symbol ON public.live_quote_indicators(symbol);
CREATE INDEX IF NOT EXISTS idx_lqi_fetched_at ON public.live_quote_indicators(fetched_at DESC);

COMMENT ON TABLE public.live_quote_indicators IS 'Stores frequently updated market data for symbols.';
COMMENT ON COLUMN public.live_quote_indicators.api_timestamp IS 'Timestamp from the FMP API, typically in seconds.';