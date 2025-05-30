// supabase/functions/fetch-fmp-ratios-ttm/types.ts

// Interface for the data structure from FMP API /ratios-ttm endpoint
export interface FmpRatiosTtmData {
  symbol: string;
  grossProfitMarginTTM?: number | null;
  ebitMarginTTM?: number | null;
  ebitdaMarginTTM?: number | null;
  operatingProfitMarginTTM?: number | null;
  pretaxProfitMarginTTM?: number | null;
  continuousOperationsProfitMarginTTM?: number | null;
  netProfitMarginTTM?: number | null;
  bottomLineProfitMarginTTM?: number | null;
  receivablesTurnoverTTM?: number | null;
  payablesTurnoverTTM?: number | null;
  inventoryTurnoverTTM?: number | null;
  fixedAssetTurnoverTTM?: number | null;
  assetTurnoverTTM?: number | null;
  currentRatioTTM?: number | null;
  quickRatioTTM?: number | null;
  solvencyRatioTTM?: number | null;
  cashRatioTTM?: number | null;
  priceToEarningsRatioTTM?: number | null;
  priceToEarningsGrowthRatioTTM?: number | null;
  forwardPriceToEarningsGrowthRatioTTM?: number | null;
  priceToBookRatioTTM?: number | null;
  priceToSalesRatioTTM?: number | null;
  priceToFreeCashFlowRatioTTM?: number | null;
  priceToOperatingCashFlowRatioTTM?: number | null;
  debtToAssetsRatioTTM?: number | null;
  debtToEquityRatioTTM?: number | null;
  debtToCapitalRatioTTM?: number | null;
  longTermDebtToCapitalRatioTTM?: number | null;
  financialLeverageRatioTTM?: number | null;
  workingCapitalTurnoverRatioTTM?: number | null;
  operatingCashFlowRatioTTM?: number | null;
  operatingCashFlowSalesRatioTTM?: number | null;
  freeCashFlowOperatingCashFlowRatioTTM?: number | null;
  debtServiceCoverageRatioTTM?: number | null;
  interestCoverageRatioTTM?: number | null;
  shortTermOperatingCashFlowCoverageRatioTTM?: number | null;
  operatingCashFlowCoverageRatioTTM?: number | null;
  capitalExpenditureCoverageRatioTTM?: number | null;
  dividendPaidAndCapexCoverageRatioTTM?: number | null;
  dividendPayoutRatioTTM?: number | null;
  dividendYieldTTM?: number | null;
  enterpriseValueTTM?: number | null; // Can be a large integer
  revenuePerShareTTM?: number | null;
  netIncomePerShareTTM?: number | null;
  interestDebtPerShareTTM?: number | null;
  cashPerShareTTM?: number | null;
  bookValuePerShareTTM?: number | null;
  tangibleBookValuePerShareTTM?: number | null;
  shareholdersEquityPerShareTTM?: number | null;
  operatingCashFlowPerShareTTM?: number | null;
  capexPerShareTTM?: number | null;
  freeCashFlowPerShareTTM?: number | null;
  netIncomePerEBTTTM?: number | null;
  ebtPerEbitTTM?: number | null;
  priceToFairValueTTM?: number | null;
  debtToMarketCapTTM?: number | null;
  effectiveTaxRateTTM?: number | null;
  enterpriseValueMultipleTTM?: number | null;
  dividendPerShareTTM?: number | null;
}

// Interface for the record to be upserted into your 'ratios_ttm' table
export interface SupabaseRatiosTtmRecord {
  symbol: string;
  gross_profit_margin_ttm?: number | null;
  ebit_margin_ttm?: number | null;
  ebitda_margin_ttm?: number | null;
  operating_profit_margin_ttm?: number | null;
  pretax_profit_margin_ttm?: number | null;
  continuous_operations_profit_margin_ttm?: number | null;
  net_profit_margin_ttm?: number | null;
  bottom_line_profit_margin_ttm?: number | null;
  receivables_turnover_ttm?: number | null;
  payables_turnover_ttm?: number | null;
  inventory_turnover_ttm?: number | null;
  fixed_asset_turnover_ttm?: number | null;
  asset_turnover_ttm?: number | null;
  current_ratio_ttm?: number | null;
  quick_ratio_ttm?: number | null;
  solvency_ratio_ttm?: number | null;
  cash_ratio_ttm?: number | null;
  price_to_earnings_ratio_ttm?: number | null;
  price_to_earnings_growth_ratio_ttm?: number | null;
  forward_price_to_earnings_growth_ratio_ttm?: number | null;
  price_to_book_ratio_ttm?: number | null;
  price_to_sales_ratio_ttm?: number | null;
  price_to_free_cash_flow_ratio_ttm?: number | null;
  price_to_operating_cash_flow_ratio_ttm?: number | null;
  debt_to_assets_ratio_ttm?: number | null;
  debt_to_equity_ratio_ttm?: number | null;
  debt_to_capital_ratio_ttm?: number | null;
  long_term_debt_to_capital_ratio_ttm?: number | null;
  financial_leverage_ratio_ttm?: number | null;
  working_capital_turnover_ratio_ttm?: number | null;
  operating_cash_flow_ratio_ttm?: number | null;
  operating_cash_flow_sales_ratio_ttm?: number | null;
  free_cash_flow_operating_cash_flow_ratio_ttm?: number | null;
  debt_service_coverage_ratio_ttm?: number | null;
  interest_coverage_ratio_ttm?: number | null;
  short_term_operating_cash_flow_coverage_ratio_ttm?: number | null;
  operating_cash_flow_coverage_ratio_ttm?: number | null;
  capital_expenditure_coverage_ratio_ttm?: number | null;
  dividend_paid_and_capex_coverage_ratio_ttm?: number | null;
  dividend_payout_ratio_ttm?: number | null;
  dividend_yield_ttm?: number | null;
  enterprise_value_ttm?: number | null; // Matched to BIGINT in SQL
  revenue_per_share_ttm?: number | null;
  net_income_per_share_ttm?: number | null;
  interest_debt_per_share_ttm?: number | null;
  cash_per_share_ttm?: number | null;
  book_value_per_share_ttm?: number | null;
  tangible_book_value_per_share_ttm?: number | null;
  shareholders_equity_per_share_ttm?: number | null;
  operating_cash_flow_per_share_ttm?: number | null;
  capex_per_share_ttm?: number | null;
  free_cash_flow_per_share_ttm?: number | null;
  net_income_per_ebt_ttm?: number | null;
  ebt_per_ebit_ttm?: number | null;
  price_to_fair_value_ttm?: number | null;
  debt_to_market_cap_ttm?: number | null;
  effective_tax_rate_ttm?: number | null;
  enterprise_value_multiple_ttm?: number | null;
  dividend_per_share_ttm?: number | null;
  // fetched_at and updated_at are handled by DB defaults/triggers
}

export interface SupportedSymbol {
  symbol: string;
}

export interface SymbolProcessingResult {
  symbol: string;
  success: boolean;
  message: string;
  data?: FmpRatiosTtmData | null;
}

export interface FunctionResponse {
  message: string;
  details: SymbolProcessingResult[];
  totalProcessed: number;
  totalSucceeded: number;
  totalUpserted: number;
}
