-- supabase/migrations/YYYYMMDDHHMMSS_create_revenue_product_segmentation_table.sql

CREATE TABLE IF NOT EXISTS "public"."revenue_product_segmentation" (
    "symbol" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "period" TEXT NOT NULL, -- "FY", "Q1", etc.
    "date" DATE NOT NULL, -- The end date of the reporting period
    "reported_currency" TEXT,
    "data" JSONB, -- Stores the "data" object from FMP which contains product segment revenues

    "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    PRIMARY KEY ("symbol", "fiscal_year", "period", "date"), -- Composite primary key
    CONSTRAINT "fk_revenue_product_segmentation_symbol" FOREIGN KEY ("symbol") REFERENCES "public"."profiles"("symbol") ON DELETE CASCADE
);

COMMENT ON TABLE "public"."revenue_product_segmentation" IS 'Stores historical revenue by product segmentation for symbols from FMP.';
COMMENT ON COLUMN "public"."revenue_product_segmentation"."symbol" IS 'Stock/crypto symbol. Part of composite PK, references profiles.symbol.';
COMMENT ON COLUMN "public"."revenue_product_segmentation"."fiscal_year" IS 'The fiscal year of the report. Part of composite PK.';
COMMENT ON COLUMN "public"."revenue_product_segmentation"."period" IS 'Reporting period (e.g., "FY", "Q1"). Part of composite PK.';
COMMENT ON COLUMN "public"."revenue_product_segmentation"."date" IS 'The specific end date of the reporting period. Part of composite PK.';
COMMENT ON COLUMN "public"."revenue_product_segmentation"."reported_currency" IS 'Currency the revenue figures are reported in (nullable).';
COMMENT ON COLUMN "public"."revenue_product_segmentation"."data" IS 'JSONB object containing the revenue breakdown by product segment.';
COMMENT ON COLUMN "public"."revenue_product_segmentation"."fetched_at" IS 'Timestamp of when this record was initially fetched.';
COMMENT ON COLUMN "public"."revenue_product_segmentation"."updated_at" IS 'Timestamp of when this record was last updated.';

-- Trigger to automatically update "updated_at"
CREATE OR REPLACE TRIGGER "handle_revenue_product_segmentation_updated_at"
BEFORE UPDATE ON "public"."revenue_product_segmentation"
FOR EACH ROW
EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_rps_symbol_fy_period_date" ON "public"."revenue_product_segmentation" USING BTREE ("symbol", "fiscal_year" DESC, "period", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_rps_updated_at" ON "public"."revenue_product_segmentation" USING BTREE ("updated_at" DESC);

-- Enable RLS
ALTER TABLE "public"."revenue_product_segmentation" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to revenue_product_segmentation" ON "public"."revenue_product_segmentation";
CREATE POLICY "Allow public read access to revenue_product_segmentation"
    ON "public"."revenue_product_segmentation" FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to revenue_product_segmentation" ON "public"."revenue_product_segmentation";
CREATE POLICY "Allow service_role full access to revenue_product_segmentation"
    ON "public"."revenue_product_segmentation" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant usage
GRANT ALL ON TABLE "public"."revenue_product_segmentation" TO "service_role";
GRANT SELECT ON TABLE "public"."revenue_product_segmentation" TO "anon";
GRANT SELECT ON TABLE "public"."revenue_product_segmentation" TO "authenticated";

-- Add to realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'revenue_product_segmentation'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.revenue_product_segmentation;
            RAISE NOTICE 'Table public.revenue_product_segmentation added to publication supabase_realtime.';
        ELSE
            RAISE NOTICE 'Table public.revenue_product_segmentation is already a member of publication supabase_realtime. Skipping ADD.';
        END IF;
    ELSE
        RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.revenue_product_segmentation.';
    END IF;
END $$;