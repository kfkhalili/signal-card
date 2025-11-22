-- supabase/migrations/20250615112021_create_exchange_variants_table.sql

CREATE TABLE IF NOT EXISTS "public"."exchange_variants" (
    "symbol" TEXT NOT NULL,
    "symbol_variant" TEXT NOT NULL,
    "exchange_short_name" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "beta" DOUBLE PRECISION,
    "vol_avg" BIGINT,
    "mkt_cap" BIGINT,
    "last_div" DOUBLE PRECISION,
    "range" TEXT,
    "changes" DOUBLE PRECISION,
    "currency" TEXT,
    "cik" TEXT,
    "isin" TEXT,
    "cusip" TEXT,
    "exchange" TEXT,
    "dcf_diff" DOUBLE PRECISION,
    "dcf" DOUBLE PRECISION,
    "image" TEXT,
    "ipo_date" TEXT,
    "default_image" BOOLEAN,
    "is_actively_trading" BOOLEAN,
    "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    PRIMARY KEY ("symbol_variant", "exchange_short_name"),
    CONSTRAINT "fk_exchange_variants_symbol" FOREIGN KEY ("symbol") REFERENCES "public"."profiles"("symbol") ON DELETE CASCADE
);

COMMENT ON TABLE "public"."exchange_variants" IS 'Stores exchange-specific variant data for symbols from FMP.';
COMMENT ON COLUMN "public"."exchange_variants"."symbol" IS 'The base stock symbol, references profiles.symbol. Renamed from base_symbol for consistency with other tables.';
COMMENT ON COLUMN "public"."exchange_variants"."symbol_variant" IS 'The exchange-specific symbol variant (e.g., "AAPL.DE"). Renamed from variant_symbol. Part of composite PK.';
COMMENT ON COLUMN "public"."exchange_variants"."exchange_short_name" IS 'The short name of the exchange (e.g., "XETRA"). Part of composite PK.';


-- Trigger to automatically update "updated_at"
CREATE OR REPLACE TRIGGER "handle_exchange_variants_updated_at"
BEFORE UPDATE ON "public"."exchange_variants"
FOR EACH ROW
EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_exchange_variants_symbol" ON "public"."exchange_variants" USING BTREE ("symbol");
CREATE INDEX IF NOT EXISTS "idx_exchange_variants_symbol_variant" ON "public"."exchange_variants" USING BTREE ("symbol_variant");

-- Enable RLS
ALTER TABLE "public"."exchange_variants" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to exchange_variants" ON "public"."exchange_variants";
CREATE POLICY "Allow public read access to exchange_variants"
    ON "public"."exchange_variants" FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to exchange_variants" ON "public"."exchange_variants";
CREATE POLICY "Allow service_role full access to exchange_variants"
    ON "public"."exchange_variants" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant usage
GRANT ALL ON TABLE "public"."exchange_variants" TO "service_role";
GRANT SELECT ON TABLE "public"."exchange_variants" TO "anon";
GRANT SELECT ON TABLE "public"."exchange_variants" TO "authenticated";

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE exchange_variants;