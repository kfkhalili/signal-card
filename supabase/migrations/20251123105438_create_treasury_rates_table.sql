-- Create treasury_rates table
-- Stores US Treasury rates from FMP API
-- Used for WACC calculations (Risk-Free Rate in CAPM)
-- For non-US companies, we use US Treasury rate as proxy (standard practice)

CREATE TABLE IF NOT EXISTS public.treasury_rates (
  date DATE NOT NULL PRIMARY KEY, -- Date of the Treasury rate data
  month1 DOUBLE PRECISION, -- 1-month Treasury rate
  month2 DOUBLE PRECISION, -- 2-month Treasury rate
  month3 DOUBLE PRECISION, -- 3-month Treasury rate
  month6 DOUBLE PRECISION, -- 6-month Treasury rate
  year1 DOUBLE PRECISION, -- 1-year Treasury rate
  year2 DOUBLE PRECISION, -- 2-year Treasury rate
  year3 DOUBLE PRECISION, -- 3-year Treasury rate
  year5 DOUBLE PRECISION, -- 5-year Treasury rate
  year7 DOUBLE PRECISION, -- 7-year Treasury rate
  year10 DOUBLE PRECISION NOT NULL, -- 10-year Treasury rate (used as risk-free rate)
  year20 DOUBLE PRECISION, -- 20-year Treasury rate
  year30 DOUBLE PRECISION, -- 30-year Treasury rate
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.treasury_rates IS 'Stores US Treasury rates from FMP API. Used for WACC calculations to determine risk-free rate (Rf) in CAPM model. For non-US companies, US Treasury rate is used as proxy (standard practice).';
COMMENT ON COLUMN public.treasury_rates.date IS 'Date of the Treasury rate data. Primary key.';
COMMENT ON COLUMN public.treasury_rates.year10 IS '10-year Treasury rate - used as risk-free rate (Rf) in CAPM formula';
COMMENT ON COLUMN public.treasury_rates.fetched_at IS 'Timestamp when this data was fetched from FMP API';
COMMENT ON COLUMN public.treasury_rates.updated_at IS 'Timestamp when this record was last updated';

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_treasury_rates_date ON public.treasury_rates USING BTREE (date DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_rates_fetched_at ON public.treasury_rates USING BTREE (fetched_at DESC);

-- Trigger to automatically update updated_at
CREATE OR REPLACE TRIGGER handle_treasury_rates_updated_at
BEFORE UPDATE ON public.treasury_rates
FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- Enable RLS
ALTER TABLE public.treasury_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to treasury_rates" ON public.treasury_rates;
CREATE POLICY "Allow public read access to treasury_rates"
  ON public.treasury_rates FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to treasury_rates" ON public.treasury_rates;
CREATE POLICY "Allow service_role full access to treasury_rates"
  ON public.treasury_rates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE public.treasury_rates TO service_role;
GRANT SELECT ON TABLE public.treasury_rates TO anon;
GRANT SELECT ON TABLE public.treasury_rates TO authenticated;

-- Add to realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'treasury_rates'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.treasury_rates;
      RAISE NOTICE 'Table public.treasury_rates added to publication supabase_realtime.';
    ELSE
      RAISE NOTICE 'Table public.treasury_rates is already a member of publication supabase_realtime. Skipping ADD.';
    END IF;
  ELSE
    RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.treasury_rates.';
  END IF;
END $$;

