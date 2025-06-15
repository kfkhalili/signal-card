CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY, -- Defined PK inline
    "symbol" "text" NOT NULL,
    "price" double precision,
    "market_cap" bigint,
    "beta" double precision,
    "last_dividend" double precision,
    "range" "text",
    "change" double precision,
    "change_percentage" double precision,
    "volume" bigint,
    "average_volume" bigint,
    "company_name" "text",
    "display_company_name" "text",
    "currency" character varying(3),
    "cik" "text",
    "isin" "text",
    "cusip" "text",
    "exchange_full_name" "text",
    "exchange" "text",
    "industry" "text",
    "website" "text",
    "description" "text",
    "ceo" "text",
    "sector" "text",
    "country" character varying(2),
    "full_time_employees" bigint,
    "phone" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "image" "text",
    "ipo_date" "date",
    "default_image" boolean DEFAULT false,
    "is_etf" boolean DEFAULT false,
    "is_actively_trading" boolean DEFAULT true,
    "is_adr" boolean DEFAULT false,
    "is_fund" boolean DEFAULT false,
    "modified_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";
COMMENT ON TABLE "public"."profiles" IS 'Stores detailed static company information.';
COMMENT ON COLUMN "public"."profiles"."id" IS 'Unique identifier for the profile record (UUID).';
COMMENT ON COLUMN "public"."profiles"."symbol" IS 'Stock ticker or financial instrument symbol. Should be Unique.';
COMMENT ON COLUMN "public"."profiles"."display_company_name" IS 'The display name of the company, can be set manually. Defaults to company_name on insert and is not updated automatically thereafter.';
COMMENT ON COLUMN "public"."profiles"."full_time_employees" IS 'Number of full-time employees (parsed from source).';
COMMENT ON COLUMN "public"."profiles"."modified_at" IS 'Timestamp of the last modification in this database.';

-- The separate ALTER TABLE for PK is removed as it's defined inline above.
-- ALTER TABLE ONLY "public"."profiles"
--     ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

-- Unique constraint for symbol
ALTER TABLE "public"."profiles" DROP CONSTRAINT IF EXISTS "profiles_symbol_key";
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_symbol_key" UNIQUE ("symbol");

-- Index for modified_at
CREATE INDEX IF NOT EXISTS "idx_profiles_modified_at" ON "public"."profiles" USING "btree" ("modified_at" DESC);

-- Trigger for profiles modified_at
CREATE OR REPLACE TRIGGER "handle_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('modified_at');