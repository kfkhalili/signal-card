// supabase/functions/fetch-financial-statements/types.ts

// Base interface for common fields across FMP statement entries
export interface FmpStatementEntryBase {
  date: string; // "YYYY-MM-DD"
  symbol: string;
  reportedCurrency: string;
  cik: string;
  filingDate: string; // "YYYY-MM-DD"
  acceptedDate: string; // "YYYY-MM-DD HH:MM:SS"
  fiscalYear: string;
  period: string; // "FY", "Q1", etc.
}

// Interface for FMP Income Statement Entry
export interface FmpIncomeStatementEntry extends FmpStatementEntryBase {
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  researchAndDevelopmentExpenses: number;
  generalAndAdministrativeExpenses: number;
  sellingAndMarketingExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  otherExpenses: number;
  operatingExpenses: number;
  costAndExpenses: number;
  netInterestIncome?: number | null;
  interestIncome: number;
  interestExpense: number;
  depreciationAndAmortization: number;
  ebitda: number;
  ebit?: number | null; // Derived if not present: ebitda - depreciationAndAmortization
  nonOperatingIncomeExcludingInterest?: number | null;
  operatingIncome: number;
  totalOtherIncomeExpensesNet: number;
  incomeBeforeTax: number;
  incomeTaxExpense: number;
  netIncomeFromContinuingOperations: number;
  netIncomeFromDiscontinuedOperations?: number | null;
  otherAdjustmentsToNetIncome?: number | null;
  netIncome: number;
  netIncomeDeductions?: number | null;
  bottomLineNetIncome?: number | null; // Often same as netIncome
  eps: number;
  epsDiluted: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
}

// Interface for FMP Balance Sheet Entry
export interface FmpBalanceSheetEntry extends FmpStatementEntryBase {
  cashAndCashEquivalents: number;
  shortTermInvestments: number;
  cashAndShortTermInvestments: number;
  netReceivables: number;
  accountsReceivables?: number | null;
  otherReceivables?: number | null;
  inventory: number;
  prepaids?: number | null;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  propertyPlantEquipmentNet: number;
  goodwill: number;
  intangibleAssets: number;
  goodwillAndIntangibleAssets: number;
  longTermInvestments: number;
  taxAssets: number;
  otherNonCurrentAssets: number;
  totalNonCurrentAssets: number;
  otherAssets: number;
  totalAssets: number;
  totalPayables?: number | null;
  accountPayables: number;
  otherPayables?: number | null;
  accruedExpenses?: number | null;
  shortTermDebt: number;
  capitalLeaseObligationsCurrent?: number | null;
  taxPayables: number;
  deferredRevenue: number;
  otherCurrentLiabilities: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  capitalLeaseObligationsNonCurrent?: number | null;
  deferredRevenueNonCurrent: number;
  deferredTaxLiabilitiesNonCurrent: number;
  otherNonCurrentLiabilities: number;
  totalNonCurrentLiabilities: number;
  otherLiabilities: number;
  capitalLeaseObligations: number;
  totalLiabilities: number;
  treasuryStock: number;
  preferredStock: number;
  commonStock: number;
  retainedEarnings: number;
  additionalPaidInCapital: number;
  accumulatedOtherComprehensiveIncomeLoss: number;
  otherTotalStockholdersEquity: number;
  totalStockholdersEquity: number;
  totalEquity: number;
  minorityInterest: number;
  totalLiabilitiesAndTotalEquity: number;
  totalInvestments: number;
  totalDebt: number;
  netDebt: number;
}

// Interface for FMP Cash Flow Statement Entry
export interface FmpCashFlowEntry extends FmpStatementEntryBase {
  netIncome: number;
  depreciationAndAmortization: number;
  deferredIncomeTax: number;
  stockBasedCompensation: number;
  changeInWorkingCapital: number;
  accountsReceivables: number; // Note: Can be negative if AR increased
  inventory: number; // Note: Can be negative if inventory increased
  accountsPayables: number; // Note: Can be positive if AP increased
  otherWorkingCapital: number;
  otherNonCashItems: number;
  netCashProvidedByOperatingActivities: number;
  investmentsInPropertyPlantAndEquipment: number;
  acquisitionsNet: number;
  purchasesOfInvestments: number;
  salesMaturitiesOfInvestments: number;
  otherInvestingActivities: number;
  netCashProvidedByInvestingActivities: number;
  netDebtIssuance?: number | null;
  longTermNetDebtIssuance?: number | null;
  shortTermNetDebtIssuance?: number | null;
  netStockIssuance?: number | null;
  netCommonStockIssuance?: number | null;
  commonStockIssuance?: number | null;
  commonStockRepurchased?: number | null;
  netPreferredStockIssuance?: number | null;
  netDividendsPaid?: number | null;
  commonDividendsPaid?: number | null;
  preferredDividendsPaid?: number | null;
  otherFinancingActivities: number;
  netCashProvidedByFinancingActivities: number;
  effectOfForexChangesOnCash: number;
  netChangeInCash: number;
  cashAtEndOfPeriod: number;
  cashAtBeginningOfPeriod: number;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  incomeTaxesPaid?: number | null;
  interestPaid?: number | null;
}

// Interface for records to be upserted into your Supabase 'financial_statements' table
export interface FinancialStatementRecord {
  symbol: string;
  date: string; // PK part 1
  period: string; // PK part 2
  reported_currency?: string | null;
  cik?: string | null;
  filing_date?: string | null;
  accepted_date?: string | null; // Consider storing as ISO string or timestamp
  fiscal_year?: string | null;
  income_statement_payload?: FmpIncomeStatementEntry | null;
  balance_sheet_payload?: FmpBalanceSheetEntry | null;
  cash_flow_payload?: FmpCashFlowEntry | null;
  // fetched_at and updated_at are typically handled by DB defaults/triggers
}

// Interface for rows from 'supported_symbols' table
export interface SupportedSymbol {
  symbol: string;
  // Add other fields from supported_symbols if needed by the function
  // e.g., last_processed_at to implement more granular fetching logic
}

// Interface for summarizing the result of processing each symbol
export interface SymbolProcessingResult {
  symbol: string;
  success: boolean;
  message: string;
}

// Interface for the overall response of the Edge Function
export interface FunctionResponse {
  message: string;
  details: SymbolProcessingResult[];
  totalUpserted: number;
}
