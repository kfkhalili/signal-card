-- supabase/migrations/YYYYMMDDHHMMSS_create_supported_symbols_table.sql

CREATE TABLE IF NOT EXISTS "public"."supported_symbols" (
    "symbol" TEXT NOT NULL PRIMARY KEY,
    "is_active" BOOLEAN DEFAULT TRUE NOT NULL, -- To easily enable/disable fetching for a symbol
    "added_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "last_processed_at" TIMESTAMP WITH TIME ZONE NULL
);

COMMENT ON TABLE "public"."supported_symbols" IS 'Stores symbols for which financial statements should be fetched.';
COMMENT ON COLUMN "public"."supported_symbols"."symbol" IS 'The stock/crypto symbol. Primary Key.';
COMMENT ON COLUMN "public"."supported_symbols"."is_active" IS 'If true, the symbol will be processed by the fetch function.';
COMMENT ON COLUMN "public"."supported_symbols"."added_at" IS 'Timestamp when the symbol was added.';
COMMENT ON COLUMN "public"."supported_symbols"."last_processed_at" IS 'Timestamp when the symbol was last processed by the financial statements fetcher.';

-- Optional: Link to profiles table if you want to ensure the symbol exists there.
-- This assumes your `profiles` table's symbol column is unique and suitable as a FK target.
-- ALTER TABLE "public"."supported_symbols"
-- ADD CONSTRAINT "fk_supported_symbols_to_profiles"
-- FOREIGN KEY ("symbol") REFERENCES "public"."profiles"("symbol")
-- ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE "public"."supported_symbols" ENABLE ROW LEVEL SECURITY;

-- Policies for `supported_symbols` (adjust as needed for your security model)
-- Example: Allow service_role to manage, and authenticated users to read active symbols
DROP POLICY IF EXISTS "Allow full access to service_role for supported_symbols" ON "public"."supported_symbols";
CREATE POLICY "Allow full access to service_role for supported_symbols"
    ON "public"."supported_symbols" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read access to active supported_symbols" ON "public"."supported_symbols";
CREATE POLICY "Allow authenticated read access to active supported_symbols"
    ON "public"."supported_symbols" FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "Allow anon read access to active supported_symbols" ON "public"."supported_symbols";
CREATE POLICY "Allow anon read access to active supported_symbols"
    ON "public"."supported_symbols" FOR SELECT
    TO anon
    USING (is_active = TRUE);

-- Grant usage for the table to relevant roles
GRANT ALL ON TABLE "public"."supported_symbols" TO "service_role";
GRANT SELECT ON TABLE "public"."supported_symbols" TO "authenticated";
GRANT SELECT ON TABLE "public"."supported_symbols" TO "anon";