-- Create valuations table
-- Stores valuation metrics (DCF, PEG, EV/EBITDA, etc.) from FMP API
-- Used for Symbol Analysis Page (Zone B: Valuation Card)
-- Supports multiple valuation types in a single extensible table

CREATE TABLE IF NOT EXISTS public.valuations (
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  valuation_type TEXT NOT NULL DEFAULT 'dcf',
  value DOUBLE PRECISION NOT NULL,
  stock_price_at_calculation DOUBLE PRECISION,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  PRIMARY KEY (symbol, date, valuation_type),
  CONSTRAINT fk_valuations_symbol FOREIGN KEY (symbol) 
    REFERENCES public.profiles(symbol) ON DELETE CASCADE,
  CONSTRAINT chk_valuation_type CHECK (valuation_type IN ('dcf', 'peg', 'ev_ebitda', 'price_target'))
);

COMMENT ON TABLE public.valuations IS 'Stores valuation metrics (DCF, PEG, EV/EBITDA, etc.) from FMP API. Used for Symbol Analysis Page to show intrinsic value vs current price.';
COMMENT ON COLUMN public.valuations.symbol IS 'Stock symbol';
COMMENT ON COLUMN public.valuations.date IS 'Date of the valuation calculation';
COMMENT ON COLUMN public.valuations.valuation_type IS 'Type of valuation: dcf (Discounted Cash Flow), peg (Price/Earnings to Growth), ev_ebitda (Enterprise Value/EBITDA), price_target (Analyst Price Target)';
COMMENT ON COLUMN public.valuations.value IS 'The calculated valuation value';
COMMENT ON COLUMN public.valuations.stock_price_at_calculation IS 'Stock price at the time the valuation was calculated (for reference)';
COMMENT ON COLUMN public.valuations.fetched_at IS 'Timestamp when this data was fetched from FMP API';
COMMENT ON COLUMN public.valuations.updated_at IS 'Timestamp when this record was last updated';

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_valuations_symbol ON public.valuations USING BTREE (symbol);
CREATE INDEX IF NOT EXISTS idx_valuations_symbol_type ON public.valuations USING BTREE (symbol, valuation_type);
CREATE INDEX IF NOT EXISTS idx_valuations_date ON public.valuations USING BTREE (date DESC);
CREATE INDEX IF NOT EXISTS idx_valuations_fetched_at ON public.valuations USING BTREE (fetched_at DESC);

-- Trigger to automatically update updated_at
CREATE OR REPLACE TRIGGER handle_valuations_updated_at
BEFORE UPDATE ON public.valuations
FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- Enable RLS
ALTER TABLE public.valuations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to valuations" ON public.valuations;
CREATE POLICY "Allow public read access to valuations"
  ON public.valuations FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to valuations" ON public.valuations;
CREATE POLICY "Allow service_role full access to valuations"
  ON public.valuations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE public.valuations TO service_role;
GRANT SELECT ON TABLE public.valuations TO anon;
GRANT SELECT ON TABLE public.valuations TO authenticated;

-- Add to realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'valuations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.valuations;
      RAISE NOTICE 'Table public.valuations added to publication supabase_realtime.';
    ELSE
      RAISE NOTICE 'Table public.valuations is already a member of publication supabase_realtime. Skipping ADD.';
    END IF;
  ELSE
    RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.valuations.';
  END IF;
END $$;

