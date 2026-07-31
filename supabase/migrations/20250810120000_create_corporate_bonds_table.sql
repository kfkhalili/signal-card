-- supabase/migrations/20250810120000_create_corporate_bonds_table.sql

CREATE TABLE IF NOT EXISTS "public"."corporate_bonds" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "cusip" TEXT NOT NULL UNIQUE,
    "symbol" TEXT,
    "issuer_name" TEXT,
    "coupon_rate" DOUBLE PRECISION,
    "maturity_date" DATE,
    "last_trade_price" DOUBLE PRECISION,
    "last_trade_yield" DOUBLE PRECISION,
    "last_trade_volume" BIGINT,
    "last_trade_timestamp" TIMESTAMPTZ,
    "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."corporate_bonds" IS 'Stores corporate bond data, primarily from FINRA TRACE.';
COMMENT ON COLUMN "public"."corporate_bonds"."cusip" IS 'CUSIP identifier for the bond. Acts as the unique key for upserting data.';
-- Trigger to automatically update "updated_at"
CREATE OR REPLACE TRIGGER "handle_corporate_bonds_updated_at"
BEFORE UPDATE ON "public"."corporate_bonds"
FOR EACH ROW
EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');
-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_corporate_bonds_cusip" ON "public"."corporate_bonds" USING BTREE ("cusip");
CREATE INDEX IF NOT EXISTS "idx_corporate_bonds_maturity_date" ON "public"."corporate_bonds" USING BTREE ("maturity_date" DESC);
CREATE INDEX IF NOT EXISTS "idx_corporate_bonds_updated_at" ON "public"."corporate_bonds" USING BTREE ("updated_at" DESC);
-- Enable RLS
ALTER TABLE "public"."corporate_bonds" ENABLE ROW LEVEL SECURITY;
-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to corporate_bonds" ON "public"."corporate_bonds";
CREATE POLICY "Allow public read access to corporate_bonds"
    ON "public"."corporate_bonds" FOR SELECT
    TO anon, authenticated
    USING (true);
DROP POLICY IF EXISTS "Allow service_role full access to corporate_bonds" ON "public"."corporate_bonds";
CREATE POLICY "Allow service_role full access to corporate_bonds"
    ON "public"."corporate_bonds" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
-- Grant usage
GRANT ALL ON TABLE "public"."corporate_bonds" TO "service_role";
GRANT SELECT ON TABLE "public"."corporate_bonds" TO "anon";
GRANT SELECT ON TABLE "public"."corporate_bonds" TO "authenticated";
-- Add to realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'corporate_bonds'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.corporate_bonds;
            RAISE NOTICE 'Table public.corporate_bonds added to publication supabase_realtime.';
        ELSE
            RAISE NOTICE 'Table public.corporate_bonds is already a member of publication supabase_realtime. Skipping ADD.';
        END IF;
    ELSE
        RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.corporate_bonds.';
    END IF;
END $$;
