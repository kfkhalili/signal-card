-- Create market_risk_premiums table
-- Stores country-specific market risk premiums from FMP API
-- Used for WACC calculations (Cost of Equity via CAPM)
-- Market Risk Premium = Total Equity Risk Premium (Rm - Rf)

CREATE TABLE IF NOT EXISTS public.market_risk_premiums (
  country TEXT NOT NULL PRIMARY KEY, -- ISO 2-letter country code (e.g., 'US', 'GB', 'CA')
  continent TEXT,
  country_risk_premium DOUBLE PRECISION,
  total_equity_risk_premium DOUBLE PRECISION NOT NULL, -- This is (Rm - Rf) used in CAPM
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.market_risk_premiums IS 'Stores country-specific market risk premiums from FMP API. Used for WACC calculations to determine cost of equity via CAPM model.';
COMMENT ON COLUMN public.market_risk_premiums.country IS 'ISO 2-letter country code (e.g., US, GB, CA). Primary key.';
COMMENT ON COLUMN public.market_risk_premiums.continent IS 'Continent name (e.g., North America, Europe)';
COMMENT ON COLUMN public.market_risk_premiums.country_risk_premium IS 'Country-specific risk premium component';
COMMENT ON COLUMN public.market_risk_premiums.total_equity_risk_premium IS 'Total equity risk premium (Rm - Rf) used in CAPM formula for cost of equity calculation';
COMMENT ON COLUMN public.market_risk_premiums.fetched_at IS 'Timestamp when this data was fetched from FMP API';
COMMENT ON COLUMN public.market_risk_premiums.updated_at IS 'Timestamp when this record was last updated';

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_market_risk_premiums_fetched_at ON public.market_risk_premiums USING BTREE (fetched_at DESC);

-- Trigger to automatically update updated_at
CREATE OR REPLACE TRIGGER handle_market_risk_premiums_updated_at
BEFORE UPDATE ON public.market_risk_premiums
FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- Enable RLS
ALTER TABLE public.market_risk_premiums ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to market_risk_premiums" ON public.market_risk_premiums;
CREATE POLICY "Allow public read access to market_risk_premiums"
  ON public.market_risk_premiums FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to market_risk_premiums" ON public.market_risk_premiums;
CREATE POLICY "Allow service_role full access to market_risk_premiums"
  ON public.market_risk_premiums FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE public.market_risk_premiums TO service_role;
GRANT SELECT ON TABLE public.market_risk_premiums TO anon;
GRANT SELECT ON TABLE public.market_risk_premiums TO authenticated;

-- Add to realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'market_risk_premiums'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.market_risk_premiums;
      RAISE NOTICE 'Table public.market_risk_premiums added to publication supabase_realtime.';
    ELSE
      RAISE NOTICE 'Table public.market_risk_premiums is already a member of publication supabase_realtime. Skipping ADD.';
    END IF;
  ELSE
    RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.market_risk_premiums.';
  END IF;
END $$;

