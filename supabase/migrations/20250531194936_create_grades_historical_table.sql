-- supabase/migrations/YYYYMMDDHHMMSS_create_grades_historical_table.sql

CREATE TABLE IF NOT EXISTS "public"."grades_historical" (
    "symbol" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "analyst_ratings_strong_buy" INTEGER,
    "analyst_ratings_buy" INTEGER,
    "analyst_ratings_hold" INTEGER,
    "analyst_ratings_sell" INTEGER,
    "analyst_ratings_strong_sell" INTEGER,
    "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    PRIMARY KEY ("symbol", "date"),
    CONSTRAINT "fk_grades_historical_symbol" FOREIGN KEY ("symbol") REFERENCES "public"."supported_symbols"("symbol") ON DELETE CASCADE
);

COMMENT ON TABLE "public"."grades_historical" IS 'Stores historical analyst rating grades for symbols from FMP.';
COMMENT ON COLUMN "public"."grades_historical"."symbol" IS 'Stock/crypto symbol. Part of composite PK, references supported_symbols.symbol.';
COMMENT ON COLUMN "public"."grades_historical"."date" IS 'The date of the historical grade snapshot. Part of composite PK.';
COMMENT ON COLUMN "public"."grades_historical"."analyst_ratings_strong_buy" IS 'Number of analyst ratings for Strong Buy.';
COMMENT ON COLUMN "public"."grades_historical"."analyst_ratings_buy" IS 'Number of analyst ratings for Buy.';
COMMENT ON COLUMN "public"."grades_historical"."analyst_ratings_hold" IS 'Number of analyst ratings for Hold.';
COMMENT ON COLUMN "public"."grades_historical"."analyst_ratings_sell" IS 'Number of analyst ratings for Sell.';
COMMENT ON COLUMN "public"."grades_historical"."analyst_ratings_strong_sell" IS 'Number of analyst ratings for Strong Sell.';
COMMENT ON COLUMN "public"."grades_historical"."fetched_at" IS 'Timestamp of when this record was initially fetched.';
COMMENT ON COLUMN "public"."grades_historical"."updated_at" IS 'Timestamp of when this record was last updated.';

-- Trigger to automatically update "updated_at"
CREATE OR REPLACE TRIGGER "handle_grades_historical_updated_at"
BEFORE UPDATE ON "public"."grades_historical"
FOR EACH ROW
EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_grades_historical_symbol_date" ON "public"."grades_historical" USING BTREE ("symbol", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_grades_historical_updated_at" ON "public"."grades_historical" USING BTREE ("updated_at" DESC);

-- Enable RLS
ALTER TABLE "public"."grades_historical" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to grades_historical" ON "public"."grades_historical";
CREATE POLICY "Allow public read access to grades_historical"
    ON "public"."grades_historical" FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to grades_historical" ON "public"."grades_historical";
CREATE POLICY "Allow service_role full access to grades_historical"
    ON "public"."grades_historical" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant usage
GRANT ALL ON TABLE "public"."grades_historical" TO "service_role";
GRANT SELECT ON TABLE "public"."grades_historical" TO "anon";
GRANT SELECT ON TABLE "public"."grades_historical" TO "authenticated";

-- Add to realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'grades_historical'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.grades_historical;
            RAISE NOTICE 'Table public.grades_historical added to publication supabase_realtime.';
        ELSE
            RAISE NOTICE 'Table public.grades_historical is already a member of publication supabase_realtime. Skipping ADD.';
        END IF;
    ELSE
        RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.grades_historical.';
    END IF;
END $$;