-- supabase/migrations/20250615112021_create_exchange_variants_table.sql

CREATE TABLE IF NOT EXISTS "public"."exchange_variants" (
    "base_symbol" TEXT NOT NULL,
    "variant_symbol" TEXT NOT NULL,
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

    PRIMARY KEY ("variant_symbol", "exchange_short_name"),
    CONSTRAINT "fk_exchange_variants_base_symbol" FOREIGN KEY ("base_symbol") REFERENCES "public"."profiles"("symbol") ON DELETE CASCADE
);

COMMENT ON TABLE "public"."exchange_variants" IS 'Stores exchange-specific variant data for symbols from FMP.';
COMMENT ON COLUMN "public"."exchange_variants"."base_symbol" IS 'The base stock symbol, references profiles.symbol.';
COMMENT ON COLUMN "public"."exchange_variants"."variant_symbol" IS 'The exchange-specific symbol (e.g., "AAPL.DE"). Part of composite PK.';
COMMENT ON COLUMN "public"."exchange_variants"."exchange_short_name" IS 'The short name of the exchange (e.g., "XETRA"). Part of composite PK.';


-- Trigger to automatically update "updated_at"
CREATE OR REPLACE TRIGGER "handle_exchange_variants_updated_at"
BEFORE UPDATE ON "public"."exchange_variants"
FOR EACH ROW
EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_exchange_variants_base_symbol" ON "public"."exchange_variants" USING BTREE ("base_symbol");
CREATE INDEX IF NOT EXISTS "idx_exchange_variants_variant_symbol" ON "public"."exchange_variants" USING BTREE ("variant_symbol");

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