-- supabase/migrations/20250615123641_create_available_exchanges_table.sql

CREATE TABLE IF NOT EXISTS "public"."available_exchanges" (
    "exchange" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "country_name" TEXT,
    "country_code" TEXT,
    "symbol_suffix" TEXT,
    "delay" TEXT,
    "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE "public"."available_exchanges" IS 'Stores the list of all available exchanges from FMP.';
COMMENT ON COLUMN "public"."available_exchanges"."exchange" IS 'The exchange short code (e.g., "NASDAQ"). Primary Key.';
COMMENT ON COLUMN "public"."available_exchanges"."name" IS 'Full name of the exchange.';
COMMENT ON COLUMN "public"."available_exchanges"."country_name" IS 'The full name of the country where the exchange is located.';
COMMENT ON COLUMN "public"."available_exchanges"."country_code" IS 'The ISO 3166-1 alpha-2 country code.';
COMMENT ON COLUMN "public"."available_exchanges"."symbol_suffix" IS 'The suffix appended to symbols from this exchange (e.g., ".L" for LSE).';
COMMENT ON COLUMN "public"."available_exchanges"."delay" IS 'Indicates the data delay for the exchange (e.g., "Real-time", "15 min").';
COMMENT ON COLUMN "public"."available_exchanges"."fetched_at" IS 'Timestamp of when this record was initially fetched.';
COMMENT ON COLUMN "public"."available_exchanges"."updated_at" IS 'Timestamp of when this record was last updated.';

-- Trigger to automatically update "updated_at"
CREATE OR REPLACE TRIGGER "handle_available_exchanges_updated_at"
BEFORE UPDATE ON "public"."available_exchanges"
FOR EACH ROW
EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');

-- Enable RLS
ALTER TABLE "public"."available_exchanges" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to available_exchanges" ON "public"."available_exchanges";
CREATE POLICY "Allow public read access to available_exchanges"
    ON "public"."available_exchanges" FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to available_exchanges" ON "public"."available_exchanges";
CREATE POLICY "Allow service_role full access to available_exchanges"
    ON "public"."available_exchanges" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant usage
GRANT ALL ON TABLE "public"."available_exchanges" TO "service_role";
GRANT SELECT ON TABLE "public"."available_exchanges" TO "anon";
GRANT SELECT ON TABLE "public"."available_exchanges" TO "authenticated";