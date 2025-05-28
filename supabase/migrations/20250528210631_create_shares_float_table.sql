-- supabase/migrations/YYYYMMDDHHMMSS_create_shares_float_table.sql

CREATE TABLE IF NOT EXISTS "public"."shares_float" (
    "symbol" TEXT NOT NULL,
    "date" DATE NOT NULL, -- Stores "YYYY-MM-DD" extracted from API's timestamp
    "free_float" DOUBLE PRECISION,
    "float_shares" DOUBLE PRECISION,
    "outstanding_shares" DOUBLE PRECISION, -- FMP usually provides this as a number

    "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    PRIMARY KEY ("symbol", "date")
);

COMMENT ON TABLE "public"."shares_float" IS 'Stores daily shares float data for symbols from FMP, with camelCase columns.';
COMMENT ON COLUMN "public"."shares_float"."symbol" IS 'Stock/crypto symbol. Part of composite PK.';
COMMENT ON COLUMN "public"."shares_float"."date" IS 'Date (YYYY-MM-DD) extracted from API''s timestamp. Part of composite PK.';
COMMENT ON COLUMN "public"."shares_float"."free_float" IS 'The number of shares available for public trading from FMP.';
COMMENT ON COLUMN "public"."shares_float"."float_shares" IS 'Float shares data from FMP.';
COMMENT ON COLUMN "public"."shares_float"."outstanding_shares" IS 'Total outstanding shares from FMP.';
COMMENT ON COLUMN "public"."shares_float"."fetched_at" IS 'Timestamp of when this record was initially fetched.';
COMMENT ON COLUMN "public"."shares_float"."updated_at" IS 'Timestamp of when this record was last updated.';

-- Trigger to automatically update "updated_at"
CREATE OR REPLACE TRIGGER "handle_shares_float_updated_at"
BEFORE UPDATE ON "public"."shares_float"
FOR EACH ROW
EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_shares_float_symbol_date" ON "public"."shares_float" USING BTREE ("symbol", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_shares_float_updated_at" ON "public"."shares_float" USING BTREE ("updated_at" DESC);

-- Enable RLS
ALTER TABLE "public"."shares_float" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to shares_float" ON "public"."shares_float";
CREATE POLICY "Allow public read access to shares_float"
    ON "public"."shares_float" FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to shares_float" ON "public"."shares_float";
CREATE POLICY "Allow service_role full access to shares_float"
    ON "public"."shares_float" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant usage
GRANT ALL ON TABLE "public"."shares_float" TO "service_role";
GRANT SELECT ON TABLE "public"."shares_float" TO "anon";
GRANT SELECT ON TABLE "public"."shares_float" TO "authenticated";

-- Add to realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'shares_float'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.shares_float;
            RAISE NOTICE 'Table public.shares_float added to publication supabase_realtime.';
        ELSE
            RAISE NOTICE 'Table public.shares_float is already a member of publication supabase_realtime. Skipping ADD.';
        END IF;
    ELSE
        RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.shares_float.';
    END IF;
END $$;