-- Create insider_transactions table
-- Stores individual insider trading transactions from FMP API
-- Used for Symbol Analysis Page (Zone C: Smart Money & Sentiment) - Latest Trade Details
-- CRITICAL: This is paginated data (up to 1000 records), so we fetch recent transactions only

CREATE TABLE IF NOT EXISTS public.insider_transactions (
  symbol TEXT NOT NULL,
  filing_date DATE NOT NULL,
  transaction_date DATE,
  reporting_cik TEXT NOT NULL,
  company_cik TEXT,
  transaction_type TEXT, -- e.g., "G-Gift", "S-Sale", "P-Purchase"
  securities_owned BIGINT,
  reporting_name TEXT,
  type_of_owner TEXT, -- e.g., "officer: SVP, GC and Secretary"
  acquisition_or_disposition TEXT CHECK (acquisition_or_disposition IN ('A', 'D')), -- A = Acquisition, D = Disposition
  direct_or_indirect TEXT CHECK (direct_or_indirect IN ('D', 'I')), -- D = Direct, I = Indirect
  form_type TEXT, -- e.g., "4"
  securities_transacted BIGINT NOT NULL,
  price DOUBLE PRECISION,
  security_name TEXT,
  url TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (symbol, filing_date, reporting_cik, securities_transacted)
);

COMMENT ON TABLE public.insider_transactions IS 'Individual insider trading transactions from FMP API. Used for Symbol Analysis Page to show latest trade details. Paginated endpoint - fetch recent transactions only.';
COMMENT ON COLUMN public.insider_transactions.symbol IS 'Stock symbol';
COMMENT ON COLUMN public.insider_transactions.filing_date IS 'Date the transaction was filed with SEC';
COMMENT ON COLUMN public.insider_transactions.transaction_date IS 'Date the transaction actually occurred';
COMMENT ON COLUMN public.insider_transactions.reporting_cik IS 'CIK of the person filing the transaction';
COMMENT ON COLUMN public.insider_transactions.company_cik IS 'CIK of the company';
COMMENT ON COLUMN public.insider_transactions.transaction_type IS 'Type of transaction (e.g., G-Gift, S-Sale, P-Purchase)';
COMMENT ON COLUMN public.insider_transactions.securities_owned IS 'Number of securities owned after transaction';
COMMENT ON COLUMN public.insider_transactions.reporting_name IS 'Name of the person filing the transaction';
COMMENT ON COLUMN public.insider_transactions.type_of_owner IS 'Role/type of owner (e.g., officer, director)';
COMMENT ON COLUMN public.insider_transactions.acquisition_or_disposition IS 'A = Acquisition, D = Disposition';
COMMENT ON COLUMN public.insider_transactions.direct_or_indirect IS 'D = Direct, I = Indirect';
COMMENT ON COLUMN public.insider_transactions.form_type IS 'SEC form type (e.g., "4")';
COMMENT ON COLUMN public.insider_transactions.securities_transacted IS 'Number of securities transacted';
COMMENT ON COLUMN public.insider_transactions.price IS 'Price per security (0 for gifts)';
COMMENT ON COLUMN public.insider_transactions.security_name IS 'Name of the security (e.g., "Common Stock")';
COMMENT ON COLUMN public.insider_transactions.url IS 'URL to SEC filing';
COMMENT ON COLUMN public.insider_transactions.fetched_at IS 'Timestamp when this data was fetched from FMP API';

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_insider_transactions_symbol ON public.insider_transactions USING BTREE (symbol);
CREATE INDEX IF NOT EXISTS idx_insider_transactions_fetched_at ON public.insider_transactions USING BTREE (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_insider_transactions_transaction_date ON public.insider_transactions USING BTREE (transaction_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_insider_transactions_filing_date ON public.insider_transactions USING BTREE (filing_date DESC);
CREATE INDEX IF NOT EXISTS idx_insider_transactions_reporting_name ON public.insider_transactions USING BTREE (reporting_name);

-- Enable RLS
ALTER TABLE public.insider_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to insider_transactions" ON public.insider_transactions;
CREATE POLICY "Allow public read access to insider_transactions"
  ON public.insider_transactions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to insider_transactions" ON public.insider_transactions;
CREATE POLICY "Allow service_role full access to insider_transactions"
  ON public.insider_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE public.insider_transactions TO service_role;
GRANT SELECT ON TABLE public.insider_transactions TO anon;
GRANT SELECT ON TABLE public.insider_transactions TO authenticated;

-- Add to realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'insider_transactions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.insider_transactions;
      RAISE NOTICE 'Table public.insider_transactions added to publication supabase_realtime.';
    ELSE
      RAISE NOTICE 'Table public.insider_transactions is already a member of publication supabase_realtime. Skipping ADD.';
    END IF;
  ELSE
    RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.insider_transactions.';
  END IF;
END $$;

-- Create staleness check function for insider transactions
CREATE OR REPLACE FUNCTION public.is_insider_transactions_stale_v2(
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
  -- For insider transactions, we check the most recent transaction's fetched_at
  RETURN p_fetched_at IS NULL OR p_fetched_at < NOW() - (p_ttl_minutes || ' minutes')::INTERVAL;
END;
$$;

COMMENT ON FUNCTION public.is_insider_transactions_stale_v2 IS 'Staleness check for insider transactions. Returns true if the most recent transaction data is stale. TTL must be explicitly provided (no default).';

