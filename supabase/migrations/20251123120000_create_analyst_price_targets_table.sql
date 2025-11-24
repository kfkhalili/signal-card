-- Create analyst_price_targets table
-- Stores analyst price target consensus data from FMP API
-- Used for Symbol Analysis Page (Contrarian Indicators Card)
-- One record per symbol (latest consensus)

CREATE TABLE IF NOT EXISTS public.analyst_price_targets (
  symbol TEXT NOT NULL PRIMARY KEY,
  target_high DOUBLE PRECISION NOT NULL,
  target_low DOUBLE PRECISION NOT NULL,
  target_consensus DOUBLE PRECISION NOT NULL,
  target_median DOUBLE PRECISION NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT fk_analyst_price_targets_symbol FOREIGN KEY (symbol)
    REFERENCES public.profiles(symbol) ON DELETE CASCADE
);

COMMENT ON TABLE public.analyst_price_targets IS 'Stores analyst price target consensus data from FMP API. Used for Symbol Analysis Page to show analyst expectations vs current price.';
COMMENT ON COLUMN public.analyst_price_targets.symbol IS 'Stock symbol (Primary Key)';
COMMENT ON COLUMN public.analyst_price_targets.target_high IS 'Highest analyst price target';
COMMENT ON COLUMN public.analyst_price_targets.target_low IS 'Lowest analyst price target';
COMMENT ON COLUMN public.analyst_price_targets.target_consensus IS 'Consensus (average) price target';
COMMENT ON COLUMN public.analyst_price_targets.target_median IS 'Median price target';
COMMENT ON COLUMN public.analyst_price_targets.fetched_at IS 'Timestamp when this data was fetched from FMP API';
COMMENT ON COLUMN public.analyst_price_targets.updated_at IS 'Timestamp when this record was last updated';

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_analyst_price_targets_fetched_at ON public.analyst_price_targets USING BTREE (fetched_at DESC);

-- Trigger to automatically update updated_at
CREATE OR REPLACE TRIGGER handle_analyst_price_targets_updated_at
BEFORE UPDATE ON public.analyst_price_targets
FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- Enable RLS
ALTER TABLE public.analyst_price_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to analyst_price_targets" ON public.analyst_price_targets;
CREATE POLICY "Allow public read access to analyst_price_targets"
  ON public.analyst_price_targets FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to analyst_price_targets" ON public.analyst_price_targets;
CREATE POLICY "Allow service_role full access to analyst_price_targets"
  ON public.analyst_price_targets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE public.analyst_price_targets TO service_role;
GRANT SELECT ON TABLE public.analyst_price_targets TO anon;
GRANT SELECT ON TABLE public.analyst_price_targets TO authenticated;

-- Add to realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'analyst_price_targets'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.analyst_price_targets;
      RAISE NOTICE 'Table public.analyst_price_targets added to publication supabase_realtime.';
    ELSE
      RAISE NOTICE 'Table public.analyst_price_targets is already a member of publication supabase_realtime. Skipping ADD.';
    END IF;
  ELSE
    RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.analyst_price_targets.';
  END IF;
END $$;

