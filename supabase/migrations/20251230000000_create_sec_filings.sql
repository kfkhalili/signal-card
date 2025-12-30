-- supabase/migrations/20251230000000_create_sec_filings.sql

-- 1. Create the table to store SEC filings and extracted share counts
CREATE TABLE IF NOT EXISTS "public"."sec_filings" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "symbol" text NOT NULL REFERENCES "public"."profiles"("symbol") ON DELETE CASCADE,
    "accession_number" text NOT NULL,
    "form_type" text NOT NULL,
    "filing_date" date,
    "report_date" date,
    "acceptance_date" timestamp with time zone,
    "primary_document" text,
    "filing_url" text,
    "description" text,
    "outstanding_shares" bigint, -- The primary data point extracted
    "fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    
    CONSTRAINT "sec_filings_symbol_accession_key" UNIQUE ("symbol", "accession_number")
);

-- 2. Enable RLS
ALTER TABLE "public"."sec_filings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to sec_filings" 
ON "public"."sec_filings" FOR SELECT USING (true);

GRANT ALL ON TABLE "public"."sec_filings" TO service_role;
GRANT SELECT ON TABLE "public"."sec_filings" TO anon, authenticated;

-- 3. Register the new data type in the V2 Registry
INSERT INTO public.data_type_registry_v2 (
  data_type,
  table_name,
  timestamp_column,
  staleness_function,
  default_ttl_minutes,
  edge_function_name,
  refresh_strategy,
  priority,
  estimated_data_size_bytes,
  api_calls_per_job
) VALUES (
  'sec-outstanding-shares', 
  'sec_filings',
  'fetched_at',
  'is_data_stale_v2',
  1440,                          -- 24 hours
  'queue-processor-v2',
  'scheduled',
  50,
  0,
  0
) ON CONFLICT (data_type) DO UPDATE SET
  table_name = EXCLUDED.table_name,
  edge_function_name = EXCLUDED.edge_function_name;

-- 4. Create Trigger Function to Auto-Queue SEC Jobs
CREATE OR REPLACE FUNCTION public.trigger_sec_shares_fetch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger if CIK is present
  IF NEW.cik IS NOT NULL THEN
    -- Prevent duplicate jobs
    IF NOT EXISTS (
      SELECT 1 FROM public.api_call_queue_v2
      WHERE symbol = NEW.symbol
        AND data_type = 'sec-outstanding-shares'
        AND status IN ('pending', 'processing')
    ) THEN
      INSERT INTO public.api_call_queue_v2 (
        symbol,
        data_type,
        status,
        priority,
        job_metadata
      ) VALUES (
        NEW.symbol,
        'sec-outstanding-shares',
        'pending',
        50,
        jsonb_build_object('triggered_by', 'profile_update', 'cik', NEW.cik)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Attach Trigger to Profiles Table
DROP TRIGGER IF EXISTS trigger_fetch_sec_shares_on_profile_upsert ON public.profiles;

CREATE TRIGGER trigger_fetch_sec_shares_on_profile_upsert
  AFTER INSERT OR UPDATE
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sec_shares_fetch();