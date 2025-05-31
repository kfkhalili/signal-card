-- supabase/migrations/YYYYMMDDHHMMSS_create_dividend_history_table.sql

CREATE TABLE IF NOT EXISTS "public"."dividend_history" (
    "symbol" TEXT NOT NULL,
    "date" DATE NOT NULL, -- The "effective" date of the dividend from FMP
    "record_date" DATE,
    "payment_date" DATE,
    "declaration_date" DATE,
    "adj_dividend" DOUBLE PRECISION,
    "dividend" DOUBLE PRECISION,
    "yield" DOUBLE PRECISION,
    "frequency" TEXT,
    "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    PRIMARY KEY ("symbol", "date"),
    CONSTRAINT "fk_dividend_history_symbol" FOREIGN KEY ("symbol") REFERENCES "public"."supported_symbols"("symbol") ON DELETE CASCADE
);

COMMENT ON TABLE "public"."dividend_history" IS 'Stores historical dividend data for symbols from FMP.';
COMMENT ON COLUMN "public"."dividend_history"."symbol" IS 'Stock/crypto symbol. Part of composite PK, references supported_symbols.symbol.';
COMMENT ON COLUMN "public"."dividend_history"."date" IS 'The date the dividend was effective or announced (maps to "date" from FMP). Part of composite PK.';
COMMENT ON COLUMN "public"."dividend_history"."record_date" IS 'The record date for the dividend.';
COMMENT ON COLUMN "public"."dividend_history"."payment_date" IS 'The payment date for the dividend.';
COMMENT ON COLUMN "public"."dividend_history"."declaration_date" IS 'The declaration date for the dividend.';
COMMENT ON COLUMN "public"."dividend_history"."adj_dividend" IS 'Adjusted dividend amount.';
COMMENT ON COLUMN "public"."dividend_history"."dividend" IS 'Dividend amount.';
COMMENT ON COLUMN "public"."dividend_history"."yield" IS 'Dividend yield at the time.';
COMMENT ON COLUMN "public"."dividend_history"."frequency" IS 'Dividend frequency (e.g., Quarterly, Annually).';
COMMENT ON COLUMN "public"."dividend_history"."fetched_at" IS 'Timestamp of when this record was initially fetched.';
COMMENT ON COLUMN "public"."dividend_history"."updated_at" IS 'Timestamp of when this record was last updated.';

-- Trigger to automatically update "updated_at"
CREATE OR REPLACE TRIGGER "handle_dividend_history_updated_at"
BEFORE UPDATE ON "public"."dividend_history"
FOR EACH ROW
EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_dividend_history_symbol_date" ON "public"."dividend_history" USING BTREE ("symbol", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_dividend_history_updated_at" ON "public"."dividend_history" USING BTREE ("updated_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_dividend_history_payment_date" ON "public"."dividend_history" USING BTREE ("payment_date" DESC);
CREATE INDEX IF NOT EXISTS "idx_dividend_history_record_date" ON "public"."dividend_history" USING BTREE ("record_date" DESC);


-- Enable RLS
ALTER TABLE "public"."dividend_history" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to dividend_history" ON "public"."dividend_history";
CREATE POLICY "Allow public read access to dividend_history"
    ON "public"."dividend_history" FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to dividend_history" ON "public"."dividend_history";
CREATE POLICY "Allow service_role full access to dividend_history"
    ON "public"."dividend_history" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant usage
GRANT ALL ON TABLE "public"."dividend_history" TO "service_role";
GRANT SELECT ON TABLE "public"."dividend_history" TO "anon";
GRANT SELECT ON TABLE "public"."dividend_history" TO "authenticated";

-- Add to realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'dividend_history'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.dividend_history;
            RAISE NOTICE 'Table public.dividend_history added to publication supabase_realtime.';
        ELSE
            RAISE NOTICE 'Table public.dividend_history is already a member of publication supabase_realtime. Skipping ADD.';
        END IF;
    ELSE
        RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.dividend_history.';
    END IF;
END $$;