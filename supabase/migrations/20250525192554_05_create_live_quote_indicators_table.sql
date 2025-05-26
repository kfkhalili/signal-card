CREATE TABLE IF NOT EXISTS "public"."live_quote_indicators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY, -- Defined PK inline
    "symbol" "text" NOT NULL,
    "current_price" double precision NOT NULL,
    "change_percentage" double precision,
    "day_change" double precision,
    "volume" bigint,
    "day_low" double precision,
    "day_high" double precision,
    "market_cap" bigint,
    "day_open" double precision,
    "previous_close" double precision,
    "api_timestamp" bigint NOT NULL,
    "sma_50d" double precision,
    "sma_200d" double precision,
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "year_high" double precision,
    "year_low" double precision,
    "exchange" "text"
);

ALTER TABLE "public"."live_quote_indicators" OWNER TO "postgres";
COMMENT ON TABLE "public"."live_quote_indicators" IS 'Stores frequently updated market data for symbols.';
COMMENT ON COLUMN "public"."live_quote_indicators"."id" IS 'Unique identifier for the quote record.';
COMMENT ON COLUMN "public"."live_quote_indicators"."symbol" IS 'The stock/crypto symbol, should be unique.';
COMMENT ON COLUMN "public"."live_quote_indicators"."current_price" IS 'Current trading price.';
COMMENT ON COLUMN "public"."live_quote_indicators"."api_timestamp" IS 'Timestamp from the FMP API, typically in seconds.';
COMMENT ON COLUMN "public"."live_quote_indicators"."fetched_at" IS 'Timestamp of when this data was fetched and stored by our system.';
COMMENT ON COLUMN "public"."live_quote_indicators"."exchange" IS 'Short code for the exchange the symbol trades on (e.g., NASDAQ, NYSE, BITTREX), from FMP quote data. Used to link to exchange_market_status table.';

-- The separate ALTER TABLE for PK is removed.
-- ALTER TABLE ONLY "public"."live_quote_indicators"
--     ADD CONSTRAINT "live_quote_indicators_pkey" PRIMARY KEY ("id");

-- Unique constraint for symbol
ALTER TABLE "public"."live_quote_indicators" DROP CONSTRAINT IF EXISTS "live_quote_indicators_symbol_key";
ALTER TABLE ONLY "public"."live_quote_indicators"
    ADD CONSTRAINT "live_quote_indicators_symbol_key" UNIQUE ("symbol");

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_live_quote_indicators_fetched_at" ON "public"."live_quote_indicators" USING "btree" ("fetched_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_live_quote_indicators_symbol" ON "public"."live_quote_indicators" USING "btree" ("symbol");

-- Note: The following indexes idx_lqi_... appeared in your dump.
-- If they are functionally identical to the ones above, you should remove them to avoid redundancy.
-- If they serve a different purpose or you are unsure, making them IF NOT EXISTS is safe for now.
CREATE INDEX IF NOT EXISTS "idx_lqi_fetched_at" ON "public"."live_quote_indicators" USING "btree" ("fetched_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_lqi_symbol" ON "public"."live_quote_indicators" USING "btree" ("symbol");

-- Note: Foreign key constraints that were missing in the dump (e.g., for 'exchange' or 'symbol' to other tables)
-- would need to be added here if they are desired and not already present. Example:
-- ALTER TABLE "public"."live_quote_indicators" DROP CONSTRAINT IF EXISTS "fk_lqi_exchange";
-- ALTER TABLE ONLY "public"."live_quote_indicators"
--     ADD CONSTRAINT "fk_lqi_exchange" FOREIGN KEY ("exchange") REFERENCES "public"."exchange_market_status"("exchange_code") ON DELETE SET NULL;
-- ALTER TABLE "public"."live_quote_indicators" DROP CONSTRAINT IF EXISTS "fk_lqi_symbol";
-- ALTER TABLE ONLY "public"."live_quote_indicators"
--     ADD CONSTRAINT "fk_lqi_symbol" FOREIGN KEY ("symbol") REFERENCES "public"."profiles"("symbol") ON DELETE CASCADE;