-- supabase/migrations/YYYYMMDDHHMMSS_create_ratios_ttm_table.sql

CREATE TABLE IF NOT EXISTS "public"."ratios_ttm" (
    "symbol" TEXT NOT NULL PRIMARY KEY,
    "gross_profit_margin_ttm" DOUBLE PRECISION,
    "ebit_margin_ttm" DOUBLE PRECISION,
    "ebitda_margin_ttm" DOUBLE PRECISION,
    "operating_profit_margin_ttm" DOUBLE PRECISION,
    "pretax_profit_margin_ttm" DOUBLE PRECISION,
    "continuous_operations_profit_margin_ttm" DOUBLE PRECISION,
    "net_profit_margin_ttm" DOUBLE PRECISION,
    "bottom_line_profit_margin_ttm" DOUBLE PRECISION,
    "receivables_turnover_ttm" DOUBLE PRECISION,
    "payables_turnover_ttm" DOUBLE PRECISION,
    "inventory_turnover_ttm" DOUBLE PRECISION,
    "fixed_asset_turnover_ttm" DOUBLE PRECISION,
    "asset_turnover_ttm" DOUBLE PRECISION,
    "current_ratio_ttm" DOUBLE PRECISION,
    "quick_ratio_ttm" DOUBLE PRECISION,
    "solvency_ratio_ttm" DOUBLE PRECISION,
    "cash_ratio_ttm" DOUBLE PRECISION,
    "price_to_earnings_ratio_ttm" DOUBLE PRECISION,
    "price_to_earnings_growth_ratio_ttm" DOUBLE PRECISION,
    "forward_price_to_earnings_growth_ratio_ttm" DOUBLE PRECISION,
    "price_to_book_ratio_ttm" DOUBLE PRECISION,
    "price_to_sales_ratio_ttm" DOUBLE PRECISION,
    "price_to_free_cash_flow_ratio_ttm" DOUBLE PRECISION,
    "price_to_operating_cash_flow_ratio_ttm" DOUBLE PRECISION,
    "debt_to_assets_ratio_ttm" DOUBLE PRECISION,
    "debt_to_equity_ratio_ttm" DOUBLE PRECISION,
    "debt_to_capital_ratio_ttm" DOUBLE PRECISION,
    "long_term_debt_to_capital_ratio_ttm" DOUBLE PRECISION,
    "financial_leverage_ratio_ttm" DOUBLE PRECISION,
    "working_capital_turnover_ratio_ttm" DOUBLE PRECISION,
    "operating_cash_flow_ratio_ttm" DOUBLE PRECISION,
    "operating_cash_flow_sales_ratio_ttm" DOUBLE PRECISION,
    "free_cash_flow_operating_cash_flow_ratio_ttm" DOUBLE PRECISION,
    "debt_service_coverage_ratio_ttm" DOUBLE PRECISION,
    "interest_coverage_ratio_ttm" DOUBLE PRECISION,
    "short_term_operating_cash_flow_coverage_ratio_ttm" DOUBLE PRECISION,
    "operating_cash_flow_coverage_ratio_ttm" DOUBLE PRECISION,
    "capital_expenditure_coverage_ratio_ttm" DOUBLE PRECISION,
    "dividend_paid_and_capex_coverage_ratio_ttm" DOUBLE PRECISION,
    "dividend_payout_ratio_ttm" DOUBLE PRECISION,
    "dividend_yield_ttm" DOUBLE PRECISION,
    "enterprise_value_ttm" DOUBLE PRECISION,
    "revenue_per_share_ttm" DOUBLE PRECISION,
    "net_income_per_share_ttm" DOUBLE PRECISION,
    "interest_debt_per_share_ttm" DOUBLE PRECISION,
    "cash_per_share_ttm" DOUBLE PRECISION,
    "book_value_per_share_ttm" DOUBLE PRECISION,
    "tangible_book_value_per_share_ttm" DOUBLE PRECISION,
    "shareholders_equity_per_share_ttm" DOUBLE PRECISION,
    "operating_cash_flow_per_share_ttm" DOUBLE PRECISION,
    "capex_per_share_ttm" DOUBLE PRECISION,
    "free_cash_flow_per_share_ttm" DOUBLE PRECISION,
    "net_income_per_ebt_ttm" DOUBLE PRECISION,
    "ebt_per_ebit_ttm" DOUBLE PRECISION,
    "price_to_fair_value_ttm" DOUBLE PRECISION,
    "debt_to_market_cap_ttm" DOUBLE PRECISION,
    "effective_tax_rate_ttm" DOUBLE PRECISION,
    "enterprise_value_multiple_ttm" DOUBLE PRECISION,
    "dividend_per_share_ttm" DOUBLE PRECISION,
    "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    CONSTRAINT "fk_ratios_ttm_symbol" FOREIGN KEY ("symbol") REFERENCES "public"."profiles"("symbol") ON DELETE CASCADE
);

COMMENT ON TABLE "public"."ratios_ttm" IS 'Stores Trailing Twelve Months (TTM) financial ratios for symbols from FMP.';
COMMENT ON COLUMN "public"."ratios_ttm"."symbol" IS 'Stock/crypto symbol. Primary Key, references profiles.symbol.';
COMMENT ON COLUMN "public"."ratios_ttm"."fetched_at" IS 'Timestamp of when this record was initially fetched.';
COMMENT ON COLUMN "public"."ratios_ttm"."updated_at" IS 'Timestamp of when this record was last updated.';

-- Trigger to automatically update "updated_at"
CREATE OR REPLACE TRIGGER "handle_ratios_ttm_updated_at"
BEFORE UPDATE ON "public"."ratios_ttm"
FOR EACH ROW
EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_ratios_ttm_symbol" ON "public"."ratios_ttm" USING BTREE ("symbol");
CREATE INDEX IF NOT EXISTS "idx_ratios_ttm_updated_at" ON "public"."ratios_ttm" USING BTREE ("updated_at" DESC);

-- Enable RLS
ALTER TABLE "public"."ratios_ttm" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access to ratios_ttm" ON "public"."ratios_ttm";
CREATE POLICY "Allow public read access to ratios_ttm"
    ON "public"."ratios_ttm" FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service_role full access to ratios_ttm" ON "public"."ratios_ttm";
CREATE POLICY "Allow service_role full access to ratios_ttm"
    ON "public"."ratios_ttm" FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant usage
GRANT ALL ON TABLE "public"."ratios_ttm" TO "service_role";
GRANT SELECT ON TABLE "public"."ratios_ttm" TO "anon";
GRANT SELECT ON TABLE "public"."ratios_ttm" TO "authenticated";

-- Add to realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ratios_ttm'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.ratios_ttm;
            RAISE NOTICE 'Table public.ratios_ttm added to publication supabase_realtime.';
        ELSE
            RAISE NOTICE 'Table public.ratios_ttm is already a member of publication supabase_realtime. Skipping ADD.';
        END IF;
    ELSE
        RAISE NOTICE 'Publication supabase_realtime does not exist. Skipping ADD table public.ratios_ttm.';
    END IF;
END $$;