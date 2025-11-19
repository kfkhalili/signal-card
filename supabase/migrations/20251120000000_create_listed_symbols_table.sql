-- Create listed_symbols table with same structure as supported_symbols
-- This table will contain symbols from live_quote_indicators (~18k symbols)
-- Used by the symbol picker in the frontend for intelligent on-demand data retrieval

CREATE TABLE IF NOT EXISTS "public"."listed_symbols" (
    "symbol" TEXT NOT NULL PRIMARY KEY,
    "is_active" BOOLEAN DEFAULT TRUE NOT NULL, -- To easily enable/disable fetching for a symbol
    "added_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "last_processed_at" TIMESTAMP WITH TIME ZONE NULL
);

COMMENT ON TABLE "public"."listed_symbols" IS 'Stores all symbols that appear in live_quote_indicators. Used by the symbol picker to allow users to select from a much larger set of symbols (~18k) than supported_symbols (~60). The new intelligent queue system can retrieve data on-demand for these symbols without affecting the existing cron jobs that rely on supported_symbols.';
COMMENT ON COLUMN "public"."listed_symbols"."symbol" IS 'The stock/crypto symbol. Primary Key.';
COMMENT ON COLUMN "public"."listed_symbols"."is_active" IS 'If true, the symbol will be available in the symbol picker.';
COMMENT ON COLUMN "public"."listed_symbols"."added_at" IS 'Timestamp when the symbol was added.';
COMMENT ON COLUMN "public"."listed_symbols"."last_processed_at" IS 'Timestamp when the symbol was last processed (reserved for future use).';

-- Enable RLS
ALTER TABLE "public"."listed_symbols" ENABLE ROW LEVEL SECURITY;

-- Policies for `listed_symbols` (same as supported_symbols)
DROP POLICY IF EXISTS "Allow full access to service_role for listed_symbols" ON "public"."listed_symbols";
CREATE POLICY "Allow full access to service_role for listed_symbols"
    ON "public"."listed_symbols" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read access to active listed_symbols" ON "public"."listed_symbols";
CREATE POLICY "Allow authenticated read access to active listed_symbols"
    ON "public"."listed_symbols" FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "Allow anon read access to active listed_symbols" ON "public"."listed_symbols";
CREATE POLICY "Allow anon read access to active listed_symbols"
    ON "public"."listed_symbols" FOR SELECT
    TO anon
    USING (is_active = TRUE);

-- Grant usage for the table to relevant roles
GRANT ALL ON TABLE "public"."listed_symbols" TO "service_role";
GRANT SELECT ON TABLE "public"."listed_symbols" TO "authenticated";
GRANT SELECT ON TABLE "public"."listed_symbols" TO "anon";

-- Create index on is_active for faster filtering
CREATE INDEX IF NOT EXISTS "idx_listed_symbols_is_active" ON "public"."listed_symbols" USING "btree" ("is_active") WHERE "is_active" = TRUE;

