// supabase/functions/lib/fetch-fmp-ratios-ttm.ts
// Library function for processing ratios-ttm jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueueJob, ProcessJobResult } from './types.ts';

// Import types from the original Edge Function
import type {
  FmpRatiosTtmData,
  SupabaseRatiosTtmRecord,
} from '../fetch-fmp-ratios-ttm/types.ts';
// Note: SupabaseRatiosTtmRecord includes fetched_at?: string

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_RATIOS_TTM_BASE_URL = 'https://financialmodelingprep.com/stable/ratios-ttm';

export async function fetchRatiosTtmLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'ratios-ttm') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchRatiosTtmLogic was called for job type ${job.data_type}. Expected 'ratios-ttm'.`,
    };
  }

  try {
    if (!FMP_API_KEY) {
      throw new Error('FMP_API_KEY environment variable is not set');
    }

    // CRITICAL: Aggressive internal timeout (prevents "Slow API" throughput collapse)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    let response: Response;
    try {
      const ratiosUrl = `${FMP_RATIOS_TTM_BASE_URL}?symbol=${job.symbol}&apikey=${FMP_API_KEY}`;
      response = await fetch(ratiosUrl, { signal: controller.signal });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FMP API request timed out after 10 seconds. This indicates API brownout or network issue.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FMP API error: ${response.status} ${errorText}`);
    }

    // CRITICAL: Get the ACTUAL data transfer size (what FMP bills for)
    const contentLength = response.headers.get('Content-Length');
    let actualSizeBytes = contentLength ? parseInt(contentLength, 10) : 0;
    if (actualSizeBytes === 0) {
      console.warn(`[fetchRatiosTtmLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 50000; // 50 KB conservative estimate
    }

    const fmpRatiosResult: unknown = await response.json();

    // Handle empty array response - create sentinel record to prevent infinite retries
    if (!Array.isArray(fmpRatiosResult) || fmpRatiosResult.length === 0) {
      // Create a sentinel record with fetched_at to mark that we checked and found no data
      // This prevents the staleness checker from continuously re-queueing jobs
      const sentinelRecord: SupabaseRatiosTtmRecord = {
        symbol: job.symbol,
        // Set all numeric fields to null (sentinel record)
        gross_profit_margin_ttm: null,
        ebit_margin_ttm: null,
        ebitda_margin_ttm: null,
        operating_profit_margin_ttm: null,
        pretax_profit_margin_ttm: null,
        continuous_operations_profit_margin_ttm: null,
        net_profit_margin_ttm: null,
        bottom_line_profit_margin_ttm: null,
        receivables_turnover_ttm: null,
        payables_turnover_ttm: null,
        inventory_turnover_ttm: null,
        fixed_asset_turnover_ttm: null,
        asset_turnover_ttm: null,
        current_ratio_ttm: null,
        quick_ratio_ttm: null,
        solvency_ratio_ttm: null,
        cash_ratio_ttm: null,
        price_to_earnings_ratio_ttm: null,
        price_to_earnings_growth_ratio_ttm: null,
        forward_price_to_earnings_growth_ratio_ttm: null,
        price_to_book_ratio_ttm: null,
        price_to_sales_ratio_ttm: null,
        price_to_free_cash_flow_ratio_ttm: null,
        price_to_operating_cash_flow_ratio_ttm: null,
        debt_to_assets_ratio_ttm: null,
        debt_to_equity_ratio_ttm: null,
        debt_to_capital_ratio_ttm: null,
        long_term_debt_to_capital_ratio_ttm: null,
        financial_leverage_ratio_ttm: null,
        working_capital_turnover_ratio_ttm: null,
        operating_cash_flow_ratio_ttm: null,
        operating_cash_flow_sales_ratio_ttm: null,
        free_cash_flow_operating_cash_flow_ratio_ttm: null,
        debt_service_coverage_ratio_ttm: null,
        interest_coverage_ratio_ttm: null,
        short_term_operating_cash_flow_coverage_ratio_ttm: null,
        operating_cash_flow_coverage_ratio_ttm: null,
        capital_expenditure_coverage_ratio_ttm: null,
        dividend_paid_and_capex_coverage_ratio_ttm: null,
        dividend_payout_ratio_ttm: null,
        dividend_yield_ttm: null,
        enterprise_value_ttm: null,
        revenue_per_share_ttm: null,
        net_income_per_share_ttm: null,
        interest_debt_per_share_ttm: null,
        cash_per_share_ttm: null,
        book_value_per_share_ttm: null,
        tangible_book_value_per_share_ttm: null,
        shareholders_equity_per_share_ttm: null,
        operating_cash_flow_per_share_ttm: null,
        capex_per_share_ttm: null,
        free_cash_flow_per_share_ttm: null,
        net_income_per_ebt_ttm: null,
        ebt_per_ebit_ttm: null,
        price_to_fair_value_ttm: null,
        debt_to_market_cap_ttm: null,
        effective_tax_rate_ttm: null,
        enterprise_value_multiple_ttm: null,
        dividend_per_share_ttm: null,
        fetched_at: new Date().toISOString(), // Mark as fetched to prevent re-queueing
      } as SupabaseRatiosTtmRecord;

      const { error: upsertError } = await supabase
        .from('ratios_ttm')
        .upsert(sentinelRecord, { onConflict: 'symbol' });

      if (upsertError) {
        throw new Error(`Database upsert failed for sentinel record: ${upsertError.message}`);
      }

      console.log(`[fetchRatiosTtmLogic] FMP API returned empty array for ${job.symbol}. Created sentinel record.`);

      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
      };
    }

    const ratiosData = fmpRatiosResult[0] as FmpRatiosTtmData;

    if (!ratiosData || typeof ratiosData.symbol !== 'string' || ratiosData.symbol.trim() === '') {
      throw new Error(`Empty or invalid TTM ratios data object from FMP for ${job.symbol}`);
    }

    // CRITICAL VALIDATION #3: Source Timestamp Check (if available in registry)
    // NOTE: Ratios TTM data type does not have a source timestamp in the FMP API response.
    // The ratios-ttm endpoint returns calculated financial ratios (TTM = trailing twelve months)
    // which are derived from financial statements, not raw timestamps. There is no field in the
    // API response that indicates when the data was last updated. Therefore, source timestamp
    // validation is not applicable for ratios-ttm data type.

    // CRITICAL: Map FMP data to Supabase record format
    const recordToUpsert: SupabaseRatiosTtmRecord = {
      symbol: ratiosData.symbol,
      gross_profit_margin_ttm: ratiosData.grossProfitMarginTTM,
      ebit_margin_ttm: ratiosData.ebitMarginTTM,
      ebitda_margin_ttm: ratiosData.ebitdaMarginTTM,
      operating_profit_margin_ttm: ratiosData.operatingProfitMarginTTM,
      pretax_profit_margin_ttm: ratiosData.pretaxProfitMarginTTM,
      continuous_operations_profit_margin_ttm: ratiosData.continuousOperationsProfitMarginTTM,
      net_profit_margin_ttm: ratiosData.netProfitMarginTTM,
      bottom_line_profit_margin_ttm: ratiosData.bottomLineProfitMarginTTM,
      receivables_turnover_ttm: ratiosData.receivablesTurnoverTTM,
      payables_turnover_ttm: ratiosData.payablesTurnoverTTM,
      inventory_turnover_ttm: ratiosData.inventoryTurnoverTTM,
      fixed_asset_turnover_ttm: ratiosData.fixedAssetTurnoverTTM,
      asset_turnover_ttm: ratiosData.assetTurnoverTTM,
      current_ratio_ttm: ratiosData.currentRatioTTM,
      quick_ratio_ttm: ratiosData.quickRatioTTM,
      solvency_ratio_ttm: ratiosData.solvencyRatioTTM,
      cash_ratio_ttm: ratiosData.cashRatioTTM,
      price_to_earnings_ratio_ttm: ratiosData.priceToEarningsRatioTTM,
      price_to_earnings_growth_ratio_ttm: ratiosData.priceToEarningsGrowthRatioTTM,
      forward_price_to_earnings_growth_ratio_ttm: ratiosData.forwardPriceToEarningsGrowthRatioTTM,
      price_to_book_ratio_ttm: ratiosData.priceToBookRatioTTM,
      price_to_sales_ratio_ttm: ratiosData.priceToSalesRatioTTM,
      price_to_free_cash_flow_ratio_ttm: ratiosData.priceToFreeCashFlowRatioTTM,
      price_to_operating_cash_flow_ratio_ttm: ratiosData.priceToOperatingCashFlowRatioTTM,
      debt_to_assets_ratio_ttm: ratiosData.debtToAssetsRatioTTM,
      debt_to_equity_ratio_ttm: ratiosData.debtToEquityRatioTTM,
      debt_to_capital_ratio_ttm: ratiosData.debtToCapitalRatioTTM,
      long_term_debt_to_capital_ratio_ttm: ratiosData.longTermDebtToCapitalRatioTTM,
      financial_leverage_ratio_ttm: ratiosData.financialLeverageRatioTTM,
      working_capital_turnover_ratio_ttm: ratiosData.workingCapitalTurnoverRatioTTM,
      operating_cash_flow_ratio_ttm: ratiosData.operatingCashFlowRatioTTM,
      operating_cash_flow_sales_ratio_ttm: ratiosData.operatingCashFlowSalesRatioTTM,
      free_cash_flow_operating_cash_flow_ratio_ttm: ratiosData.freeCashFlowOperatingCashFlowRatioTTM,
      debt_service_coverage_ratio_ttm: ratiosData.debtServiceCoverageRatioTTM,
      interest_coverage_ratio_ttm: ratiosData.interestCoverageRatioTTM,
      short_term_operating_cash_flow_coverage_ratio_ttm: ratiosData.shortTermOperatingCashFlowCoverageRatioTTM,
      operating_cash_flow_coverage_ratio_ttm: ratiosData.operatingCashFlowCoverageRatioTTM,
      capital_expenditure_coverage_ratio_ttm: ratiosData.capitalExpenditureCoverageRatioTTM,
      dividend_paid_and_capex_coverage_ratio_ttm: ratiosData.dividendPaidAndCapexCoverageRatioTTM,
      dividend_payout_ratio_ttm: ratiosData.dividendPayoutRatioTTM,
      dividend_yield_ttm: ratiosData.dividendYieldTTM,
      enterprise_value_ttm: ratiosData.enterpriseValueTTM,
      revenue_per_share_ttm: ratiosData.revenuePerShareTTM,
      net_income_per_share_ttm: ratiosData.netIncomePerShareTTM,
      interest_debt_per_share_ttm: ratiosData.interestDebtPerShareTTM,
      cash_per_share_ttm: ratiosData.cashPerShareTTM,
      book_value_per_share_ttm: ratiosData.bookValuePerShareTTM,
      tangible_book_value_per_share_ttm: ratiosData.tangibleBookValuePerShareTTM,
      shareholders_equity_per_share_ttm: ratiosData.shareholdersEquityPerShareTTM,
      operating_cash_flow_per_share_ttm: ratiosData.operatingCashFlowPerShareTTM,
      capex_per_share_ttm: ratiosData.capexPerShareTTM,
      free_cash_flow_per_share_ttm: ratiosData.freeCashFlowPerShareTTM,
      net_income_per_ebt_ttm: ratiosData.netIncomePerEBTTTM,
      ebt_per_ebit_ttm: ratiosData.ebtPerEbitTTM,
      price_to_fair_value_ttm: ratiosData.priceToFairValueTTM,
      debt_to_market_cap_ttm: ratiosData.debtToMarketCapTTM,
      effective_tax_rate_ttm: ratiosData.effectiveTaxRateTTM,
      enterprise_value_multiple_ttm: ratiosData.enterpriseValueMultipleTTM,
      dividend_per_share_ttm: ratiosData.dividendPerShareTTM,
      fetched_at: new Date().toISOString(), // CRITICAL: Update fetched_at on upsert to prevent infinite job creation
    } as SupabaseRatiosTtmRecord;

    const { error: upsertError } = await supabase
      .from('ratios_ttm')
      .upsert(recordToUpsert, { onConflict: 'symbol', count: 'exact' });

    if (upsertError) {
      throw new Error(`Database upsert failed: ${upsertError.message}`);
    }


    return {
      success: true,
      dataSizeBytes: actualSizeBytes,
    };
  } catch (error) {
    return {
      success: false,
      dataSizeBytes: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

