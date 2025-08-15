-- supabase/migrations/20250812230000_create_exchange_rates_table.sql

CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "base_code" TEXT NOT NULL,
    "target_code" TEXT NOT NULL,
    "rate" DOUBLE PRECISION,
    "last_updated_at" TIMESTAMPTZ,
    "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY ("base_code", "target_code")
);

COMMENT ON TABLE "public"."exchange_rates" IS 'Stores daily foreign exchange (forex) rates from exchangerate-api.com.';
COMMENT ON COLUMN "public"."exchange_rates"."base_code" IS 'The base currency code (e.g., USD).';
COMMENT ON COLUMN "public"."exchange_rates"."target_code" IS 'The target currency code (e.g., EUR).';
COMMENT ON COLUMN "public"."exchange_rates"."rate" IS 'The exchange rate from base_code to target_code.';
COMMENT ON COLUMN "public"."exchange_rates"."last_updated_at" IS 'Timestamp from the API indicating the last update.';
COMMENT ON COLUMN "public"."exchange_rates"."fetched_at" IS 'Timestamp of when this record was fetched.';

-- Enable RLS
ALTER TABLE "public"."exchange_rates" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to exchange_rates" ON "public"."exchange_rates";
CREATE POLICY "Allow public read access to exchange_rates"
    ON "public"."exchange_rates" FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to exchange_rates" ON "public"."exchange_rates";
CREATE POLICY "Allow service_role full access to exchange_rates"
    ON "public"."exchange_rates" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant usage
GRANT ALL ON TABLE "public"."exchange_rates" TO "service_role";
GRANT SELECT ON TABLE "public"."exchange_rates" TO "anon";
GRANT SELECT ON TABLE "public"."exchange_rates" TO "authenticated";