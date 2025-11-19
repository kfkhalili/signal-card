-- Change foreign key constraints from supported_symbols to profiles
-- This allows the new queue system to process symbols from listed_symbols
-- without requiring them to be in supported_symbols first

-- Drop old foreign keys and add new ones referencing profiles

-- 1. financial_statements
ALTER TABLE "public"."financial_statements"
    DROP CONSTRAINT IF EXISTS "fk_financial_statements_symbol";

ALTER TABLE "public"."financial_statements"
    ADD CONSTRAINT "fk_financial_statements_symbol" 
    FOREIGN KEY ("symbol") REFERENCES "public"."profiles"("symbol") ON DELETE CASCADE;

-- 2. ratios_ttm
ALTER TABLE "public"."ratios_ttm"
    DROP CONSTRAINT IF EXISTS "fk_ratios_ttm_symbol";

ALTER TABLE "public"."ratios_ttm"
    ADD CONSTRAINT "fk_ratios_ttm_symbol" 
    FOREIGN KEY ("symbol") REFERENCES "public"."profiles"("symbol") ON DELETE CASCADE;

-- 3. dividend_history
ALTER TABLE "public"."dividend_history"
    DROP CONSTRAINT IF EXISTS "fk_dividend_history_symbol";

ALTER TABLE "public"."dividend_history"
    ADD CONSTRAINT "fk_dividend_history_symbol" 
    FOREIGN KEY ("symbol") REFERENCES "public"."profiles"("symbol") ON DELETE CASCADE;

-- 4. revenue_product_segmentation
ALTER TABLE "public"."revenue_product_segmentation"
    DROP CONSTRAINT IF EXISTS "fk_revenue_product_segmentation_symbol";

ALTER TABLE "public"."revenue_product_segmentation"
    ADD CONSTRAINT "fk_revenue_product_segmentation_symbol" 
    FOREIGN KEY ("symbol") REFERENCES "public"."profiles"("symbol") ON DELETE CASCADE;

-- 5. grades_historical
ALTER TABLE "public"."grades_historical"
    DROP CONSTRAINT IF EXISTS "fk_grades_historical_symbol";

ALTER TABLE "public"."grades_historical"
    ADD CONSTRAINT "fk_grades_historical_symbol" 
    FOREIGN KEY ("symbol") REFERENCES "public"."profiles"("symbol") ON DELETE CASCADE;

-- 6. exchange_variants (uses base_symbol)
ALTER TABLE "public"."exchange_variants"
    DROP CONSTRAINT IF EXISTS "fk_exchange_variants_base_symbol";

ALTER TABLE "public"."exchange_variants"
    ADD CONSTRAINT "fk_exchange_variants_base_symbol" 
    FOREIGN KEY ("base_symbol") REFERENCES "public"."profiles"("symbol") ON DELETE CASCADE;

COMMENT ON CONSTRAINT "fk_financial_statements_symbol" ON "public"."financial_statements" IS 'References profiles.symbol instead of supported_symbols to allow processing of symbols from listed_symbols.';
COMMENT ON CONSTRAINT "fk_ratios_ttm_symbol" ON "public"."ratios_ttm" IS 'References profiles.symbol instead of supported_symbols to allow processing of symbols from listed_symbols.';
COMMENT ON CONSTRAINT "fk_dividend_history_symbol" ON "public"."dividend_history" IS 'References profiles.symbol instead of supported_symbols to allow processing of symbols from listed_symbols.';
COMMENT ON CONSTRAINT "fk_revenue_product_segmentation_symbol" ON "public"."revenue_product_segmentation" IS 'References profiles.symbol instead of supported_symbols to allow processing of symbols from listed_symbols.';
COMMENT ON CONSTRAINT "fk_grades_historical_symbol" ON "public"."grades_historical" IS 'References profiles.symbol instead of supported_symbols to allow processing of symbols from listed_symbols.';
COMMENT ON CONSTRAINT "fk_exchange_variants_base_symbol" ON "public"."exchange_variants" IS 'References profiles.symbol instead of supported_symbols to allow processing of symbols from listed_symbols.';

