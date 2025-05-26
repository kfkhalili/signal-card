-- supabase/migrations/YYYYMMDDHHMMSS_create_financial_statements_table.sql

CREATE TABLE IF NOT EXISTS "public"."financial_statements" (
    "symbol" TEXT NOT NULL,
    "date" DATE NOT NULL, -- The end date of the financial period from FMP data
    "period" TEXT NOT NULL, -- "FY", "Q1", "Q2", etc. from FMP data

    "reported_currency" TEXT,
    "cik" TEXT,
    "filing_date" DATE,
    "accepted_date" TIMESTAMP WITH TIME ZONE,
    "fiscal_year" TEXT, -- As reported by FMP

    "income_statement_payload" JSONB,
    "balance_sheet_payload" JSONB,
    "cash_flow_payload" JSONB,

    "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    PRIMARY KEY ("symbol", "date", "period"),
    CONSTRAINT "fk_financial_statements_symbol" FOREIGN KEY ("symbol") REFERENCES "public"."supported_symbols"("symbol") ON DELETE CASCADE
);

COMMENT ON TABLE "public"."financial_statements" IS 'Stores consolidated annual and quarterly financial statements (Income, Balance Sheet, Cash Flow) for symbols.';
COMMENT ON COLUMN "public"."financial_statements"."symbol" IS 'Stock/crypto symbol, references supported_symbols.symbol.';
COMMENT ON COLUMN "public"."financial_statements"."date" IS 'End date of the financial period (e.g., "2023-09-30"). Part of composite PK.';
COMMENT ON COLUMN "public"."financial_statements"."period" IS 'Period identifier (e.g., "FY", "Q1"). Part of composite PK.';
COMMENT ON COLUMN "public"."financial_statements"."reported_currency" IS 'Currency the statement was reported in.';
COMMENT ON COLUMN "public"."financial_statements"."cik" IS 'CIK number if available.';
COMMENT ON COLUMN "public"."financial_statements"."filing_date" IS 'Date the statement was filed.';
COMMENT ON COLUMN "public"."financial_statements"."accepted_date" IS 'Date and time the filing was accepted.';
COMMENT ON COLUMN "public"."financial_statements"."fiscal_year" IS 'Fiscal year of the report.';
COMMENT ON COLUMN "public"."financial_statements"."income_statement_payload" IS 'Full JSON object for the income statement of this period.';
COMMENT ON COLUMN "public"."financial_statements"."balance_sheet_payload" IS 'Full JSON object for the balance sheet statement of this period.';
COMMENT ON COLUMN "public"."financial_statements"."cash_flow_payload" IS 'Full JSON object for the cash flow statement of this period.';
COMMENT ON COLUMN "public"."financial_statements"."fetched_at" IS 'Timestamp of when this record was initially fetched.';
COMMENT ON COLUMN "public"."financial_statements"."updated_at" IS 'Timestamp of when this record was last updated.';

-- Trigger to automatically update "updated_at"
CREATE OR REPLACE TRIGGER "handle_financial_statements_updated_at"
BEFORE UPDATE ON "public"."financial_statements"
FOR EACH ROW
EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_financial_statements_symbol_date" ON "public"."financial_statements" USING BTREE ("symbol", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_financial_statements_updated_at" ON "public"."financial_statements" USING BTREE ("updated_at" DESC);

-- Enable RLS
ALTER TABLE "public"."financial_statements" ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust as needed)
DROP POLICY IF EXISTS "Allow public read access to financial statements" ON "public"."financial_statements";
CREATE POLICY "Allow public read access to financial statements"
    ON "public"."financial_statements" FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to financial statements" ON "public"."financial_statements";
CREATE POLICY "Allow service_role full access to financial statements"
    ON "public"."financial_statements" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant usage
GRANT ALL ON TABLE "public"."financial_statements" TO "service_role";
GRANT SELECT ON TABLE "public"."financial_statements" TO "anon";
GRANT SELECT ON TABLE "public"."financial_statements" TO "authenticated";

-- Add to realtime publication (if not already handled by a broader policy)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'financial_statements'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_statements;
            RAISE NOTICE 'Table public.financial_statements added to publication supabase_realtime.';
        ELSE
            RAISE NOTICE 'Table public.financial_statements is already a member of publication supabase_realtime. Skipping ADD.';
        END IF;
    ELSE
        RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.financial_statements.';
    END IF;
END $$;