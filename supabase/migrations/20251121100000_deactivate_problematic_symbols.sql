-- Deactivate problematic symbols in listed_symbols
-- CONSOLIDATED: This migration combines all symbol deactivation criteria
-- CRITICAL: This marks symbols as inactive that shouldn't appear in Compass
--
-- Deactivation Criteria:
-- 1. Funds (is_fund = TRUE)
-- 2. ADRs (is_adr = TRUE)
-- 3. ETFs (is_etf = TRUE)
-- 4. Not actively trading (is_actively_trading = FALSE)
-- 5. No volume (volume IS NULL OR volume = 0)
-- 6. No market cap (market_cap IS NULL OR market_cap = 0)
-- 7. Company name variants (keep shortest symbol, deactivate others)
-- 8. Missing critical company data (no employees AND no website)
--
-- Rationale: The Compass is designed for stock discovery, focusing on legitimate
-- operating companies. Symbols are deactivated if they are funds, ETFs, ADRs,
-- not trading, have no market data, are company name variants, or lack
-- essential company information (employees or website).

-- Step 1: Identify problematic symbols (funds, ADRs, ETFs, not trading, no volume, no market cap)
WITH problematic_symbols AS (
  SELECT DISTINCT p.symbol
  FROM profiles p
  WHERE p.is_fund = TRUE
     OR p.is_adr = TRUE
     OR p.is_etf = TRUE
     OR p.is_actively_trading = FALSE
     OR p.volume IS NULL
     OR p.volume = 0
     OR p.market_cap IS NULL
     OR p.market_cap = 0
),
-- Step 2: Identify duplicate company names (variants)
-- Extract base company name by removing common suffixes:
-- - " - 7" (series numbers)
-- - "8.00% Notes due 2027" (bond/note descriptions)
-- - "Class A Ordinary Shares" (share class descriptions)
-- - "Ex-distribution When-Issued" (trading status)
-- - "Warrant" (warrant securities)
-- - "Unit" (unit securities)
-- - "Rights" (rights securities)
-- Keep the shortest symbol as active, mark others as inactive
company_variants AS (
  SELECT
    company_name,
    symbol,
    -- Extract base name by removing common suffixes
    TRIM(REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    company_name,
                    ' - \d+$', '', 'g'  -- Remove " - 7" type suffixes
                  ),
                  ' \d+\.\d+% Notes.*$', '', 'g'  -- Remove "8.00% Notes due 2027" type suffixes
                ),
                ' Class [A-Z] .*$', '', 'g'  -- Remove "Class A Ordinary Shares" type suffixes
              ),
              ' Ex-distribution.*$', '', 'g'  -- Remove "Ex-distribution When-Issued" type suffixes
            ),
            ' \d+\.\d+% Notes.*$', '', 'g'  -- Remove "6.20% Notes" type suffixes (without "due")
          ),
          ' Warrant.*$', '', 'g'  -- Remove "Warrant" type suffixes
        ),
        ' Unit.*$', '', 'g'  -- Remove "Unit" type suffixes
      ),
      ' Rights.*$', '', 'g'  -- Remove "Rights" type suffixes
    )) as base_company_name,
    ROW_NUMBER() OVER (
      PARTITION BY TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    REGEXP_REPLACE(
                      company_name,
                      ' - \d+$', '', 'g'
                    ),
                    ' \d+\.\d+% Notes.*$', '', 'g'
                  ),
                  ' Class [A-Z] .*$', '', 'g'
                ),
                ' Ex-distribution.*$', '', 'g'
              ),
              ' \d+\.\d+% Notes.*$', '', 'g'
            ),
            ' Warrant.*$', '', 'g'
          ),
          ' Unit.*$', '', 'g'
        ),
        ' Rights.*$', '', 'g'
      ))
      ORDER BY
        LENGTH(symbol) ASC,  -- Prefer shorter symbols (main ticker like "RWAY" over "RWAYL")
        symbol ASC            -- Alphabetical tiebreaker
    ) as variant_rank
  FROM profiles
  WHERE company_name IS NOT NULL
    AND company_name != ''
),
-- Step 2b: Filter to only variants (base names that appear multiple times)
company_variants_filtered AS (
  SELECT
    company_name,
    symbol,
    base_company_name,
    variant_rank
  FROM company_variants
  WHERE base_company_name IN (
    SELECT base_company_name
    FROM company_variants
    WHERE base_company_name != ''
    GROUP BY base_company_name
    HAVING COUNT(*) > 1
  )
),
-- Step 3: Identify symbols with missing critical company data
-- A legitimate operating company should have at least one of:
-- - Employees (indicates an operating business)
-- - Website (indicates a public-facing company presence)
incomplete_company_data AS (
  SELECT DISTINCT p.symbol
  FROM profiles p
  WHERE (p.full_time_employees IS NULL OR p.full_time_employees = 0)
    AND (p.website IS NULL OR p.website = '' OR p.website = 'N/A')
),
-- Step 4: Combine all symbols to deactivate
all_problematic AS (
  SELECT symbol FROM problematic_symbols
  UNION
  SELECT symbol FROM company_variants_filtered WHERE variant_rank > 1
  UNION
  SELECT symbol FROM incomplete_company_data
)
-- Step 5: Update listed_symbols to set is_active = FALSE
UPDATE listed_symbols ls
SET
  is_active = FALSE,
  last_processed_at = NOW()
FROM all_problematic ap
WHERE ls.symbol = ap.symbol
  AND ls.is_active = TRUE;  -- Only update if currently active

-- Log the results
DO $$
DECLARE
  deactivated_count INTEGER;
  total_inactive_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO deactivated_count
  FROM listed_symbols
  WHERE is_active = FALSE;

  SELECT COUNT(*) INTO total_inactive_count
  FROM listed_symbols;

  RAISE NOTICE 'Deactivated problematic symbols in listed_symbols';
  RAISE NOTICE 'Total inactive symbols: %', deactivated_count;
  RAISE NOTICE 'Total symbols: %', total_inactive_count;
  RAISE NOTICE 'Active symbols: %', total_inactive_count - deactivated_count;
END $$;

COMMENT ON TABLE listed_symbols IS 'Stores all symbols that appear in live_quote_indicators. Symbols with is_active = FALSE are excluded from Compass leaderboard. Symbols are deactivated if they are: funds, ADRs, ETFs, not trading, no volume, no market cap, company name variants, or missing critical company data (no employees AND no website).';

