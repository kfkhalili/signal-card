// supabase/functions/fetch-fmp-ratios-ttm/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CORS_HEADERS, ensureCronAuth } from "../_shared/auth.ts";
import type {
  FmpRatiosTtmData,
  SupabaseRatiosTtmRecord,
  SupportedSymbol,
  SymbolProcessingResult,
  FunctionResponse,
} from "./types.ts";

const ENV_CONTEXT: string = Deno.env.get("ENV_CONTEXT") || "PROD";
const FMP_API_KEY: string | undefined = Deno.env.get("FMP_API_KEY");
const SUPABASE_URL: string | undefined = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY: string | undefined = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
);

const FMP_RATIOS_TTM_BASE_URL =
  "https://financialmodelingprep.com/stable/ratios-ttm";
const FMP_API_DELAY_MS = 250; // Delay between API calls

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "An unknown error occurred.";
  }
}

function censorApiKey(url: string, apiKey: string | undefined): string {
  if (!apiKey || apiKey.length < 8) return url;
  const censoredPart = apiKey
    .substring(4, apiKey.length - 4)
    .replace(/./g, "*");
  const displayApiKey =
    apiKey.substring(0, 4) + censoredPart + apiKey.substring(apiKey.length - 4);
  const apiKeyPattern = new RegExp(
    `(apikey=)(${encodeURIComponent(apiKey)})([&]|$)`,
    "i"
  );
  return url.replace(apiKeyPattern, `$1${displayApiKey}$3`);
}

async function fetchAndProcessSymbolRatiosTtm(
  symbolToRequest: string,
  apiKey: string,
  supabaseAdmin: SupabaseClient
): Promise<SymbolProcessingResult> {
  const ratiosUrl = `${FMP_RATIOS_TTM_BASE_URL}?symbol=${symbolToRequest}&apikey=${apiKey}`;

  try {
    const ratiosResponse: Response = await fetch(ratiosUrl);

    if (!ratiosResponse.ok) {
      const errorText: string = await ratiosResponse.text();
      throw new Error(
        `Failed to fetch TTM ratios for ${symbolToRequest}: ${ratiosResponse.status} ${errorText} from URL: ${ratiosUrl}`
      );
    }

    const fmpRatiosResult: unknown = await ratiosResponse.json();

    if (!Array.isArray(fmpRatiosResult) || fmpRatiosResult.length === 0) {
      throw new Error(
        `No TTM ratios data array returned or empty array from FMP for ${symbolToRequest}. Response: ${JSON.stringify(
          fmpRatiosResult
        )}`
      );
    }

    const ratiosData = fmpRatiosResult[0] as FmpRatiosTtmData;

    if (
      !ratiosData ||
      typeof ratiosData.symbol !== "string" ||
      ratiosData.symbol.trim() === ""
    ) {
      throw new Error(
        `Empty or invalid TTM ratios data object from FMP for ${symbolToRequest}. Payload: ${JSON.stringify(
          ratiosData
        )}`
      );
    }

    const recordToUpsert: SupabaseRatiosTtmRecord = {
      symbol: ratiosData.symbol,
      gross_profit_margin_ttm: ratiosData.grossProfitMarginTTM,
      ebit_margin_ttm: ratiosData.ebitMarginTTM,
      ebitda_margin_ttm: ratiosData.ebitdaMarginTTM,
      operating_profit_margin_ttm: ratiosData.operatingProfitMarginTTM,
      pretax_profit_margin_ttm: ratiosData.pretaxProfitMarginTTM,
      continuous_operations_profit_margin_ttm:
        ratiosData.continuousOperationsProfitMarginTTM,
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
      price_to_earnings_growth_ratio_ttm:
        ratiosData.priceToEarningsGrowthRatioTTM,
      forward_price_to_earnings_growth_ratio_ttm:
        ratiosData.forwardPriceToEarningsGrowthRatioTTM,
      price_to_book_ratio_ttm: ratiosData.priceToBookRatioTTM,
      price_to_sales_ratio_ttm: ratiosData.priceToSalesRatioTTM,
      price_to_free_cash_flow_ratio_ttm: ratiosData.priceToFreeCashFlowRatioTTM,
      price_to_operating_cash_flow_ratio_ttm:
        ratiosData.priceToOperatingCashFlowRatioTTM,
      debt_to_assets_ratio_ttm: ratiosData.debtToAssetsRatioTTM,
      debt_to_equity_ratio_ttm: ratiosData.debtToEquityRatioTTM,
      debt_to_capital_ratio_ttm: ratiosData.debtToCapitalRatioTTM,
      long_term_debt_to_capital_ratio_ttm:
        ratiosData.longTermDebtToCapitalRatioTTM,
      financial_leverage_ratio_ttm: ratiosData.financialLeverageRatioTTM,
      working_capital_turnover_ratio_ttm:
        ratiosData.workingCapitalTurnoverRatioTTM,
      operating_cash_flow_ratio_ttm: ratiosData.operatingCashFlowRatioTTM,
      operating_cash_flow_sales_ratio_ttm:
        ratiosData.operatingCashFlowSalesRatioTTM,
      free_cash_flow_operating_cash_flow_ratio_ttm:
        ratiosData.freeCashFlowOperatingCashFlowRatioTTM,
      debt_service_coverage_ratio_ttm: ratiosData.debtServiceCoverageRatioTTM,
      interest_coverage_ratio_ttm: ratiosData.interestCoverageRatioTTM,
      short_term_operating_cash_flow_coverage_ratio_ttm:
        ratiosData.shortTermOperatingCashFlowCoverageRatioTTM,
      operating_cash_flow_coverage_ratio_ttm:
        ratiosData.operatingCashFlowCoverageRatioTTM,
      capital_expenditure_coverage_ratio_ttm:
        ratiosData.capitalExpenditureCoverageRatioTTM,
      dividend_paid_and_capex_coverage_ratio_ttm:
        ratiosData.dividendPaidAndCapexCoverageRatioTTM,
      dividend_payout_ratio_ttm: ratiosData.dividendPayoutRatioTTM,
      dividend_yield_ttm: ratiosData.dividendYieldTTM,
      enterprise_value_ttm: ratiosData.enterpriseValueTTM,
      revenue_per_share_ttm: ratiosData.revenuePerShareTTM,
      net_income_per_share_ttm: ratiosData.netIncomePerShareTTM,
      interest_debt_per_share_ttm: ratiosData.interestDebtPerShareTTM,
      cash_per_share_ttm: ratiosData.cashPerShareTTM,
      book_value_per_share_ttm: ratiosData.bookValuePerShareTTM,
      tangible_book_value_per_share_ttm:
        ratiosData.tangibleBookValuePerShareTTM,
      shareholders_equity_per_share_ttm:
        ratiosData.shareholdersEquityPerShareTTM,
      operating_cash_flow_per_share_ttm:
        ratiosData.operatingCashFlowPerShareTTM,
      capex_per_share_ttm: ratiosData.capexPerShareTTM,
      free_cash_flow_per_share_ttm: ratiosData.freeCashFlowPerShareTTM,
      net_income_per_ebt_ttm: ratiosData.netIncomePerEBTTTM,
      ebt_per_ebit_ttm: ratiosData.ebtPerEbitTTM,
      price_to_fair_value_ttm: ratiosData.priceToFairValueTTM,
      debt_to_market_cap_ttm: ratiosData.debtToMarketCapTTM,
      effective_tax_rate_ttm: ratiosData.effectiveTaxRateTTM,
      enterprise_value_multiple_ttm: ratiosData.enterpriseValueMultipleTTM,
      dividend_per_share_ttm: ratiosData.dividendPerShareTTM,
    };

    const { error: upsertError, count } = await supabaseAdmin
      .from("ratios_ttm")
      .upsert(recordToUpsert, { onConflict: "symbol", count: "exact" });

    if (upsertError) {
      console.error(
        `Supabase upsert error for ${ratiosData.symbol}:`,
        upsertError
      );
      throw new Error(
        `Supabase upsert failed for ${ratiosData.symbol}: ${upsertError.message}`
      );
    }

    return {
      symbol: ratiosData.symbol,
      success: true,
      message: `TTM Ratios processed for ${ratiosData.symbol}.`,
      data: ratiosData,
    };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      `Error processing TTM Ratios for ${symbolToRequest}: ${errorMessage}`
    );
    return {
      symbol: symbolToRequest,
      success: false,
      message: `Failed to process TTM Ratios for ${symbolToRequest}: ${errorMessage}`,
    };
  }
}

Deno.serve(async (_req: Request) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // --- 🔒 Centralized Authorization Check ---
  const authError = ensureCronAuth(_req);
  if (authError) {
    return authError; // Return the 401/500 response
  }
  // --- ✅ Auth Check Passed ---
  
  const invocationTime: string = new Date().toISOString();
  console.log(
    `Edge function 'fetch-fmp-ratios-ttm' invoked at: ${invocationTime}`
  );

  if (!FMP_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables.");
    const errorResponse: FunctionResponse = {
      message: "Server configuration error: Missing API keys or Supabase URL.",
      details: [],
      totalProcessed: 0,
      totalSucceeded: 0,
      totalUpserted: 0,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabaseAdmin: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: symbolsData, error: symbolsError } = await supabaseAdmin
      .from("supported_symbols")
      .select("symbol")
      .eq("is_active", true);

    if (symbolsError) {
      console.error("Error fetching symbols:", symbolsError);
      throw new Error(
        `Supabase error fetching symbols: ${symbolsError.message}`
      );
    }

    const activeSymbols: SupportedSymbol[] = (symbolsData ||
      []) as SupportedSymbol[];

    if (activeSymbols.length === 0) {
      console.log("No active symbols found in 'supported_symbols' table.");
      const response: FunctionResponse = {
        message: "No active symbols to process.",
        details: [],
        totalProcessed: 0,
        totalSucceeded: 0,
        totalUpserted: 0,
      };
      return new Response(JSON.stringify(response), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const processingPromises = activeSymbols.map(
      (s, index) =>
        new Promise<SymbolProcessingResult>((resolve) =>
          setTimeout(async () => {
            const result = await fetchAndProcessSymbolRatiosTtm(
              s.symbol,
              FMP_API_KEY,
              supabaseAdmin
            );
            resolve(result);
          }, index * FMP_API_DELAY_MS)
        )
    );

    const results: SymbolProcessingResult[] = await Promise.all(
      processingPromises
    );
    const totalSucceeded = results.filter((r) => r.success).length;
    const totalUpserted = totalSucceeded; // Assumes one upsert per success

    const overallMessage = `TTM Ratios processing complete. Processed: ${activeSymbols.length}, Succeeded: ${totalSucceeded}, Upserted: ${totalUpserted}.`;
    console.log(overallMessage);
    if (ENV_CONTEXT === "DEV" || totalSucceeded < activeSymbols.length) {
      results.forEach((r) =>
        console.log(
          `Symbol: ${r.symbol}, Success: ${r.success}, Message: ${r.message}`
        )
      );
    }

    const response: FunctionResponse = {
      message: overallMessage,
      details: results,
      totalProcessed: activeSymbols.length,
      totalSucceeded: totalSucceeded,
      totalUpserted: totalUpserted,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: totalSucceeded === activeSymbols.length ? 200 : 207, // 207 Multi-Status
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(
      "Critical error in 'fetch-fmp-ratios-ttm' Edge Function:",
      errorMessage,
      error instanceof Error ? error.stack : ""
    );
    const errorResponse: FunctionResponse = {
      message: "An internal server error occurred during TTM Ratios fetching.",
      details: [{ symbol: "N/A", success: false, message: errorMessage }],
      totalProcessed: 0,
      totalSucceeded: 0,
      totalUpserted: 0,
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
