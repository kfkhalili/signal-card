-- Create insider_trading_statistics table
-- Stores quarterly insider trading statistics from FMP API
-- Used for Symbol Analysis Page (Zone C: Smart Money & Sentiment)

CREATE TABLE IF NOT EXISTS public.insider_trading_statistics (
  symbol TEXT NOT NULL,
  cik TEXT,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  acquired_transactions INTEGER,
  disposed_transactions INTEGER,
  acquired_disposed_ratio DOUBLE PRECISION,
  total_acquired BIGINT,
  total_disposed BIGINT,
  average_acquired DOUBLE PRECISION,
  average_disposed DOUBLE PRECISION,
  total_purchases INTEGER,
  total_sales INTEGER,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (symbol, year, quarter)
);

COMMENT ON TABLE public.insider_trading_statistics IS 'Quarterly insider trading statistics from FMP API. Used for Symbol Analysis Page to show net buy/sell activity.';
COMMENT ON COLUMN public.insider_trading_statistics.symbol IS 'Stock symbol';
COMMENT ON COLUMN public.insider_trading_statistics.cik IS 'CIK (Central Index Key) identifier';
COMMENT ON COLUMN public.insider_trading_statistics.year IS 'Year of the quarter';
COMMENT ON COLUMN public.insider_trading_statistics.quarter IS 'Quarter number (1-4)';
COMMENT ON COLUMN public.insider_trading_statistics.acquired_transactions IS 'Number of transactions where insiders acquired shares';
COMMENT ON COLUMN public.insider_trading_statistics.disposed_transactions IS 'Number of transactions where insiders disposed of shares';
COMMENT ON COLUMN public.insider_trading_statistics.acquired_disposed_ratio IS 'Ratio of acquired to disposed transactions';
COMMENT ON COLUMN public.insider_trading_statistics.total_acquired IS 'Total number of shares acquired by insiders';
COMMENT ON COLUMN public.insider_trading_statistics.total_disposed IS 'Total number of shares disposed by insiders';
COMMENT ON COLUMN public.insider_trading_statistics.average_acquired IS 'Average shares per acquisition transaction';
COMMENT ON COLUMN public.insider_trading_statistics.average_disposed IS 'Average shares per disposal transaction';
COMMENT ON COLUMN public.insider_trading_statistics.total_purchases IS 'Total number of purchase transactions';
COMMENT ON COLUMN public.insider_trading_statistics.total_sales IS 'Total number of sale transactions';
COMMENT ON COLUMN public.insider_trading_statistics.fetched_at IS 'Timestamp when this data was fetched from FMP API';

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_insider_trading_statistics_symbol ON public.insider_trading_statistics USING BTREE (symbol);
CREATE INDEX IF NOT EXISTS idx_insider_trading_statistics_fetched_at ON public.insider_trading_statistics USING BTREE (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_insider_trading_statistics_year_quarter ON public.insider_trading_statistics USING BTREE (year DESC, quarter DESC);

-- Enable RLS
ALTER TABLE public.insider_trading_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to insider_trading_statistics" ON public.insider_trading_statistics;
CREATE POLICY "Allow public read access to insider_trading_statistics"
  ON public.insider_trading_statistics FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to insider_trading_statistics" ON public.insider_trading_statistics;
CREATE POLICY "Allow service_role full access to insider_trading_statistics"
  ON public.insider_trading_statistics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE public.insider_trading_statistics TO service_role;
GRANT SELECT ON TABLE public.insider_trading_statistics TO anon;
GRANT SELECT ON TABLE public.insider_trading_statistics TO authenticated;

-- Add to realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'insider_trading_statistics'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.insider_trading_statistics;
      RAISE NOTICE 'Table public.insider_trading_statistics added to publication supabase_realtime.';
    ELSE
      RAISE NOTICE 'Table public.insider_trading_statistics is already a member of publication supabase_realtime. Skipping ADD.';
    END IF;
  ELSE
    RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.insider_trading_statistics.';
  END IF;
END $$;

-- Create staleness check function for insider trading statistics
CREATE OR REPLACE FUNCTION public.is_insider_trading_statistics_stale_v2(
  p_fetched_at TIMESTAMPTZ,
  p_ttl_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
BEGIN
  -- CRITICAL: Validate TTL is positive
  IF p_ttl_minutes IS NULL OR p_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'TTL must be positive. Got: %', p_ttl_minutes;
  END IF;

  -- Check if data is stale
  -- For insider trading, we check the most recent quarter's fetched_at
  RETURN p_fetched_at IS NULL OR p_fetched_at < NOW() - (p_ttl_minutes || ' minutes')::INTERVAL;
END;
$$;

COMMENT ON FUNCTION public.is_insider_trading_statistics_stale_v2 IS 'Staleness check for insider trading statistics. Returns true if the most recent quarter data is stale. TTL must be explicitly provided (no default).';

