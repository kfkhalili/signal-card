CREATE TABLE IF NOT EXISTS "public"."exchange_market_status" (
    "exchange_code" "text" NOT NULL PRIMARY KEY, -- Defined PK inline
    "name" "text",
    "opening_time_local" "text",
    "closing_time_local" "text",
    "timezone" "text" NOT NULL,
    "is_market_open" boolean DEFAULT false,
    "status_message" "text",
    "current_day_is_holiday" boolean DEFAULT false,
    "current_holiday_name" "text",
    "raw_holidays_json" "jsonb",
    "last_fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."exchange_market_status" OWNER TO "postgres";
COMMENT ON TABLE "public"."exchange_market_status" IS 'Stores market status for different exchanges.';
COMMENT ON COLUMN "public"."exchange_market_status"."exchange_code" IS 'Short code for the exchange (e.g., NASDAQ, NYSE). Primary Key.';
COMMENT ON COLUMN "public"."exchange_market_status"."name" IS 'Full name of the stock exchange, preferably from the detailed FMP call.';
COMMENT ON COLUMN "public"."exchange_market_status"."opening_time_local" IS 'Exchange local opening time (e.g., "09:30", "10:00 AM"). To be interpreted using the "timezone" column. NULL if FMP indicates hours are "CLOSED".';
COMMENT ON COLUMN "public"."exchange_market_status"."closing_time_local" IS 'Exchange local closing time (e.g., "16:00", "04:00 PM"). To be interpreted using the "timezone" column. NULL if FMP indicates hours are "CLOSED".';
COMMENT ON COLUMN "public"."exchange_market_status"."timezone" IS 'IANA timezone name for the exchange (e.g., "America/New_York"). Essential for interpreting local times and holiday checks.';
COMMENT ON COLUMN "public"."exchange_market_status"."is_market_open" IS 'Boolean indicating if the market is currently open, based on FMP''s detailed per-exchange check.';
COMMENT ON COLUMN "public"."exchange_market_status"."status_message" IS 'Descriptive status message combining open/closed status, potentially hours, and holiday information.';
COMMENT ON COLUMN "public"."exchange_market_status"."current_day_is_holiday" IS 'True if the current day (in the exchange''s local timezone) is a recognized holiday for that exchange, based on FMP holiday data.';
COMMENT ON COLUMN "public"."exchange_market_status"."current_holiday_name" IS 'Name of the holiday if current_day_is_holiday is true.';
COMMENT ON COLUMN "public"."exchange_market_status"."raw_holidays_json" IS 'Stores the raw stockMarketHolidays array from FMP (typically for current and upcoming years) for reference or advanced client-side processing.';
COMMENT ON COLUMN "public"."exchange_market_status"."last_fetched_at" IS 'Timestamp of when the data for this specific exchange was last fetched and updated by the daily Edge Function.';

-- The separate ALTER TABLE for PK is removed as it's defined inline above.
-- ALTER TABLE ONLY "public"."exchange_market_status"
--     ADD CONSTRAINT "exchange_market_status_pkey" PRIMARY KEY ("exchange_code");