-- Update Compass ranking function to align with Symbol Analysis Page metrics
-- This migration reconciles Compass rankings with the analysis page assessments
-- by using the same metrics: DCF valuation, ROIC vs WACC, Gross Margin, FCF Yield,
-- and comprehensive safety metrics (Net Debt/EBITDA, Altman Z-Score, Interest Coverage)

CREATE OR REPLACE FUNCTION public.get_weighted_leaderboard(weights jsonb)
 RETURNS TABLE(rank bigint, symbol text, composite_score numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path = public, extensions
AS $function$
BEGIN
  RETURN QUERY
  WITH latest_financial_statements AS (
    -- Get the latest financial statement for each symbol
    SELECT DISTINCT ON (fs.symbol)
      fs.symbol,
      fs.date,
      fs.income_statement_payload,
      fs.balance_sheet_payload,
      fs.cash_flow_payload
    FROM public.financial_statements fs
    WHERE fs.period = 'FY'  -- Use annual statements for consistency
    ORDER BY fs.symbol, fs.date DESC
  ),
  latest_valuations AS (
    -- Get the latest DCF valuation for each symbol
    SELECT DISTINCT ON (v.symbol)
      v.symbol,
      v.value AS dcf_value,
      v.stock_price_at_calculation
    FROM public.valuations v
    WHERE v.valuation_type = 'dcf'
    ORDER BY v.symbol, v.date DESC
  ),
  extracted_financial_data AS (
    -- Extract JSONB values into columns for easier calculation
    SELECT
      fs.symbol,
      -- Income statement values
      (fs.income_statement_payload->>'operatingIncome')::NUMERIC AS operating_income,
      (fs.income_statement_payload->>'incomeBeforeTax')::NUMERIC AS income_before_tax,
      (fs.income_statement_payload->>'incomeTaxExpense')::NUMERIC AS income_tax_expense,
      (fs.income_statement_payload->>'ebitda')::NUMERIC AS ebitda,
      (fs.income_statement_payload->>'ebit')::NUMERIC AS ebit,
      (fs.income_statement_payload->>'operatingIncome')::NUMERIC AS operating_income_for_ebitda,
      (fs.income_statement_payload->>'depreciationAndAmortization')::NUMERIC AS depreciation_amortization,
      (fs.income_statement_payload->>'revenue')::NUMERIC AS revenue,
      (fs.income_statement_payload->>'interestExpense')::NUMERIC AS interest_expense,
      -- Balance sheet values
      (fs.balance_sheet_payload->>'totalStockholdersEquity')::NUMERIC AS total_equity,
      (fs.balance_sheet_payload->>'shortTermDebt')::NUMERIC AS short_term_debt,
      (fs.balance_sheet_payload->>'longTermDebt')::NUMERIC AS long_term_debt,
      (fs.balance_sheet_payload->>'cashAndCashEquivalents')::NUMERIC AS cash,
      (fs.balance_sheet_payload->>'totalAssets')::NUMERIC AS total_assets,
      COALESCE(
        (fs.balance_sheet_payload->>'totalCurrentAssets')::NUMERIC,
        (fs.balance_sheet_payload->>'currentAssets')::NUMERIC
      ) AS current_assets,
      COALESCE(
        (fs.balance_sheet_payload->>'totalCurrentLiabilities')::NUMERIC,
        (fs.balance_sheet_payload->>'currentLiabilities')::NUMERIC
      ) AS current_liabilities,
      (fs.balance_sheet_payload->>'retainedEarnings')::NUMERIC AS retained_earnings,
      (fs.balance_sheet_payload->>'totalLiabilities')::NUMERIC AS total_liabilities,
      -- Cash flow values
      (fs.cash_flow_payload->>'freeCashFlow')::NUMERIC AS free_cash_flow
    FROM
      latest_financial_statements fs
  ),
  calculated_metrics AS (
    SELECT
      rt.symbol,
      -- Valuation metrics
      -- DCF Discount: ((DCF - Price) / DCF) * 100
      CASE
        WHEN lv.dcf_value IS NOT NULL AND lq.current_price IS NOT NULL
             AND lv.dcf_value > 0 AND lq.current_price > 0
        THEN ((lv.dcf_value - lq.current_price) / lv.dcf_value) * 100
        ELSE NULL
      END AS dcf_discount_pct,
      -- P/E Ratio
      rt.price_to_earnings_ratio_ttm AS pe_ratio,
      -- PEG Ratio
      rt.price_to_earnings_growth_ratio_ttm AS peg_ratio,

      -- Quality metrics
      -- ROIC: NOPAT / Invested Capital
      -- NOPAT = Operating Income * (1 - Tax Rate)
      -- Tax Rate = Income Tax Expense / Income Before Tax
      -- Invested Capital = Total Equity + Total Debt - Cash
      CASE
        WHEN efd.operating_income IS NOT NULL
             AND efd.income_before_tax IS NOT NULL
             AND efd.income_tax_expense IS NOT NULL
             AND efd.total_equity IS NOT NULL
             AND efd.short_term_debt IS NOT NULL
             AND efd.long_term_debt IS NOT NULL
             AND efd.cash IS NOT NULL
        THEN (
          -- Calculate NOPAT
          (efd.operating_income * (1 - CASE
            WHEN efd.income_before_tax != 0
            THEN efd.income_tax_expense / efd.income_before_tax
            ELSE 0
          END)) /
          -- Calculate Invested Capital
          NULLIF(efd.total_equity + efd.short_term_debt + efd.long_term_debt - efd.cash, 0) * 100
        )
        ELSE NULL
      END AS roic_pct,
      -- Gross Margin (from ratios_ttm)
      rt.gross_profit_margin_ttm AS gross_margin,
      -- FCF Yield: Free Cash Flow / Market Cap
      CASE
        WHEN efd.free_cash_flow IS NOT NULL
             AND lq.market_cap IS NOT NULL
             AND lq.market_cap > 0
        THEN (efd.free_cash_flow / lq.market_cap) * 100  -- Return as percentage
        -- Fallback: Use price_to_free_cash_flow_ratio_ttm if available
        WHEN rt.price_to_free_cash_flow_ratio_ttm IS NOT NULL
             AND rt.price_to_free_cash_flow_ratio_ttm > 0
        THEN (1.0 / rt.price_to_free_cash_flow_ratio_ttm) * 100
        ELSE NULL
      END AS fcf_yield_pct,

      -- Safety metrics
      -- Net Debt to EBITDA
      CASE
        WHEN efd.short_term_debt IS NOT NULL
             AND efd.long_term_debt IS NOT NULL
             AND efd.cash IS NOT NULL
             AND COALESCE(efd.ebitda,
                         efd.operating_income_for_ebitda + COALESCE(efd.depreciation_amortization, 0)) IS NOT NULL
             AND COALESCE(efd.ebitda,
                         efd.operating_income_for_ebitda + COALESCE(efd.depreciation_amortization, 0)) > 0
        THEN (
          (efd.short_term_debt + efd.long_term_debt - efd.cash) /
          COALESCE(efd.ebitda,
                   efd.operating_income_for_ebitda + COALESCE(efd.depreciation_amortization, 0))
        )
        ELSE NULL
      END AS net_debt_to_ebitda,
      -- Altman Z-Score: 1.2A + 1.4B + 3.3C + 0.6D + 1.0E
      CASE
        WHEN efd.total_assets IS NOT NULL
             AND efd.total_assets > 0
             AND lq.market_cap IS NOT NULL
        THEN (
          -- A = Working Capital / Total Assets
          (COALESCE(efd.current_assets, 0) - COALESCE(efd.current_liabilities, 0)) / efd.total_assets * 1.2 +
          -- B = Retained Earnings / Total Assets
          COALESCE(efd.retained_earnings, 0) / efd.total_assets * 1.4 +
          -- C = EBIT / Total Assets
          COALESCE(efd.ebit, efd.operating_income, 0) / efd.total_assets * 3.3 +
          -- D = Market Value of Equity / Total Liabilities
          CASE
            WHEN efd.total_liabilities IS NOT NULL AND efd.total_liabilities > 0
            THEN lq.market_cap / efd.total_liabilities * 0.6
            ELSE 0
          END +
          -- E = Revenue / Total Assets
          COALESCE(efd.revenue, 0) / efd.total_assets * 1.0
        )
        ELSE NULL
      END AS altman_z_score,
      -- Interest Coverage: EBIT / Interest Expense
      CASE
        WHEN efd.interest_expense IS NOT NULL AND efd.interest_expense > 0
        THEN COALESCE(efd.ebit, efd.operating_income, 0) / efd.interest_expense
        WHEN efd.interest_expense IS NOT NULL AND efd.interest_expense <= 0
        THEN 999  -- Perfect coverage (no interest expense)
        -- Fallback: Use interest_coverage_ratio_ttm if available
        WHEN rt.interest_coverage_ratio_ttm IS NOT NULL
        THEN rt.interest_coverage_ratio_ttm
        ELSE NULL
      END AS interest_coverage
    FROM
      public.ratios_ttm AS rt
    INNER JOIN public.listed_symbols ls
      ON rt.symbol = ls.symbol
    LEFT JOIN latest_financial_statements fs
      ON rt.symbol = fs.symbol
    LEFT JOIN extracted_financial_data efd
      ON rt.symbol = efd.symbol
    LEFT JOIN latest_valuations lv
      ON rt.symbol = lv.symbol
    LEFT JOIN public.live_quote_indicators lq
      ON rt.symbol = lq.symbol
    WHERE
      ls.is_active = TRUE
  ),
  normalized_metrics AS (
    SELECT
      cm.symbol,
      -- Valuation pillar: DCF discount (higher is better), P/E (lower is better), PEG (lower is better)
      CASE
        WHEN cm.dcf_discount_pct IS NOT NULL
        THEN PERCENT_RANK() OVER (ORDER BY cm.dcf_discount_pct ASC) * 100
        ELSE 50  -- Neutral score if missing
      END AS norm_dcf_discount,
      CASE
        WHEN cm.pe_ratio IS NOT NULL AND cm.pe_ratio > 0
        THEN (1 - PERCENT_RANK() OVER (ORDER BY cm.pe_ratio ASC)) * 100
        ELSE 50
      END AS norm_pe,
      CASE
        WHEN cm.peg_ratio IS NOT NULL AND cm.peg_ratio > 0
        THEN (1 - PERCENT_RANK() OVER (ORDER BY cm.peg_ratio ASC)) * 100
        ELSE 50
      END AS norm_peg,

      -- Quality pillar: ROIC (higher is better), Gross Margin (higher is better), FCF Yield (higher is better)
      CASE
        WHEN cm.roic_pct IS NOT NULL
        THEN PERCENT_RANK() OVER (ORDER BY cm.roic_pct ASC) * 100
        ELSE 50
      END AS norm_roic,
      CASE
        WHEN cm.gross_margin IS NOT NULL
        THEN PERCENT_RANK() OVER (ORDER BY cm.gross_margin ASC) * 100
        ELSE 50
      END AS norm_gross_margin,
      CASE
        WHEN cm.fcf_yield_pct IS NOT NULL
        THEN PERCENT_RANK() OVER (ORDER BY cm.fcf_yield_pct ASC) * 100
        ELSE 50
      END AS norm_fcf_yield,

      -- Safety pillar: Net Debt/EBITDA (lower is better), Altman Z-Score (higher is better), Interest Coverage (higher is better)
      CASE
        WHEN cm.net_debt_to_ebitda IS NOT NULL
        THEN (1 - PERCENT_RANK() OVER (ORDER BY cm.net_debt_to_ebitda ASC)) * 100
        ELSE 50
      END AS norm_net_debt_ebitda,
      CASE
        WHEN cm.altman_z_score IS NOT NULL
        THEN PERCENT_RANK() OVER (ORDER BY cm.altman_z_score ASC) * 100
        ELSE 50
      END AS norm_altman_z,
      CASE
        WHEN cm.interest_coverage IS NOT NULL
        THEN PERCENT_RANK() OVER (ORDER BY cm.interest_coverage ASC) * 100
        ELSE 50
      END AS norm_interest_coverage
    FROM
      calculated_metrics AS cm
  ),
  pillar_scores AS (
    SELECT
      nm.symbol,
      -- Valuation score: Average of DCF discount, P/E, and PEG
      (nm.norm_dcf_discount + nm.norm_pe + nm.norm_peg) / 3 AS valuation_score,
      -- Quality score: Average of ROIC, Gross Margin, and FCF Yield
      (nm.norm_roic + nm.norm_gross_margin + nm.norm_fcf_yield) / 3 AS quality_score,
      -- Safety score: Average of Net Debt/EBITDA (inverted), Altman Z-Score, and Interest Coverage
      (nm.norm_net_debt_ebitda + nm.norm_altman_z + nm.norm_interest_coverage) / 3 AS safety_score
    FROM
      normalized_metrics AS nm
  ),
  composite_scores AS (
    SELECT
      ps.symbol,
      (
        ps.valuation_score * COALESCE((weights->>'valuation')::NUMERIC, 0.33) +
        ps.quality_score * COALESCE((weights->>'quality')::NUMERIC, 0.33) +
        ps.safety_score * COALESCE((weights->>'safety')::NUMERIC, 0.33)
      ) AS final_score
    FROM
      pillar_scores AS ps
  )
  SELECT
    RANK() OVER (ORDER BY cs.final_score DESC) AS rank,
    cs.symbol,
    cs.final_score::NUMERIC AS composite_score
  FROM
    composite_scores cs
  ORDER BY
    cs.final_score DESC
  LIMIT 50;
END;
$function$;

COMMENT ON FUNCTION public.get_weighted_leaderboard(jsonb) IS
'Updated Compass ranking function aligned with Symbol Analysis Page metrics.
Uses three pillars: Valuation (DCF discount, P/E, PEG), Quality (ROIC, Gross Margin, FCF Yield),
and Safety (Net Debt/EBITDA, Altman Z-Score, Interest Coverage).
Weights should be provided as JSONB with keys: valuation, quality, safety (defaults to 0.33 each).';

