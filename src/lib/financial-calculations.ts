/**
 * Financial Calculation Utilities
 *
 * This module provides functions to calculate financial metrics from raw financial statement data.
 * All calculations follow the formulas documented in docs/architecture/FINANCIAL_CALCULATIONS.md
 */

import { Option } from "effect";
import type { Database } from "@/lib/supabase/database.types";

type FinancialStatementDBRow = Database["public"]["Tables"]["financial_statements"]["Row"];

// Type guards for JSONB payloads
interface IncomeStatementPayload {
  operatingIncome?: number | null;
  incomeBeforeTax?: number | null;
  incomeTaxExpense?: number | null;
  ebitda?: number | null;
  ebit?: number | null;
  interestExpense?: number | null;
  revenue?: number | null;
  depreciationAndAmortization?: number | null;
}

interface BalanceSheetPayload {
  totalStockholdersEquity?: number | null;
  shortTermDebt?: number | null;
  longTermDebt?: number | null;
  cashAndCashEquivalents?: number | null;
  totalAssets?: number | null;
  currentAssets?: number | null; // Legacy field name
  totalCurrentAssets?: number | null; // FMP API field name
  currentLiabilities?: number | null; // Legacy field name
  totalCurrentLiabilities?: number | null; // FMP API field name
  totalLiabilities?: number | null;
  retainedEarnings?: number | null;
}

interface CashFlowPayload {
  freeCashFlow?: number | null;
}

/**
 * Safely extracts a number value from a JSONB field
 */
function safeExtractNumber(
  payload: unknown,
  field: string
): Option.Option<number> {
  if (!payload || typeof payload !== "object") {
    return Option.none();
  }
  const value = (payload as Record<string, unknown>)[field];
  if (typeof value === "number" && isFinite(value)) {
    return Option.some(value);
  }
  return Option.none();
}

/**
 * Calculates ROIC (Return on Invested Capital) from financial statements
 *
 * Formula: ROIC = NOPAT / Invested Capital
 *
 * Where:
 * - NOPAT = Operating Income × (1 - Tax Rate)
 * - Tax Rate = Income Tax Expense / Income Before Tax
 * - Invested Capital = Total Equity + Total Debt - Cash (Financing Approach)
 *
 * @param financialStatement - The financial statement row from the database
 * @returns ROIC as a percentage (e.g., 0.22 = 22%), or None if calculation is not possible
 */
export function calculateROIC(
  financialStatement: FinancialStatementDBRow | null | undefined
): Option.Option<number> {
  if (!financialStatement) {
    return Option.none();
  }

  const incomePayload = financialStatement.income_statement_payload as
    | IncomeStatementPayload
    | null
    | undefined;
  const balancePayload = financialStatement.balance_sheet_payload as
    | BalanceSheetPayload
    | null
    | undefined;

  if (!incomePayload || !balancePayload) {
    return Option.none();
  }

  // Extract income statement values
  const operatingIncome = safeExtractNumber(incomePayload, "operatingIncome");
  const incomeBeforeTax = safeExtractNumber(incomePayload, "incomeBeforeTax");
  const incomeTaxExpense = safeExtractNumber(incomePayload, "incomeTaxExpense");

  // Extract balance sheet values
  const totalEquity = safeExtractNumber(balancePayload, "totalStockholdersEquity");
  const shortTermDebt = safeExtractNumber(balancePayload, "shortTermDebt");
  const longTermDebt = safeExtractNumber(balancePayload, "longTermDebt");
  const cash = safeExtractNumber(balancePayload, "cashAndCashEquivalents");

  // Calculate NOPAT
  const nopat = Option.all([operatingIncome, incomeBeforeTax, incomeTaxExpense]).pipe(
    Option.map(([opInc, ibt, taxExp]) => {
      // Calculate tax rate
      const taxRate = ibt !== 0 ? taxExp / ibt : 0;
      // NOPAT = Operating Income × (1 - Tax Rate)
      return opInc * (1 - taxRate);
    })
  );

  // Calculate Invested Capital (Financing Approach)
  const investedCapital = Option.all([totalEquity, shortTermDebt, longTermDebt, cash]).pipe(
    Option.map(([equity, std, ltd, cashVal]) => {
      // Invested Capital = Total Equity + Total Debt - Cash
      const totalDebt = std + ltd;
      return equity + totalDebt - cashVal;
    })
  );

  // Calculate ROIC = NOPAT / Invested Capital
  return Option.all([nopat, investedCapital]).pipe(
    Option.flatMap(([nopatVal, invCap]) => {
      // Edge case: If Invested Capital <= 0, return None (distressed company)
      if (invCap <= 0 || !isFinite(invCap)) {
        return Option.none();
      }
      const roic = nopatVal / invCap;
      // Return as decimal (e.g., 0.22 = 22%)
      return isFinite(roic) ? Option.some(roic) : Option.none();
    })
  );
}

/**
 * Calculates FCF Yield (Free Cash Flow Yield) from financial statements and market cap
 *
 * Formula: FCF Yield = Free Cash Flow / Market Cap
 *
 * @param financialStatement - The financial statement row from the database
 * @param marketCap - Market capitalization from live quote indicators
 * @returns FCF Yield as a percentage (e.g., 0.032 = 3.2%), or None if calculation is not possible
 */
export function calculateFCFYield(
  financialStatement: FinancialStatementDBRow | null | undefined,
  marketCap: Option.Option<number>
): Option.Option<number> {
  if (!financialStatement || Option.isNone(marketCap)) {
    return Option.none();
  }

  const cashFlowPayload = financialStatement.cash_flow_payload as
    | CashFlowPayload
    | null
    | undefined;

  if (!cashFlowPayload) {
    return Option.none();
  }

  const freeCashFlow = safeExtractNumber(cashFlowPayload, "freeCashFlow");
  const marketCapVal = marketCap.value;

  return Option.match(freeCashFlow, {
    onNone: () => Option.none(),
    onSome: (fcf) => {
      // Edge case: If Market Cap <= 0, return None
      if (marketCapVal <= 0 || !isFinite(marketCapVal)) {
        return Option.none();
      }
      // Edge case: If FCF is negative, yield will be negative (acceptable)
      const yieldVal = fcf / marketCapVal;
      return isFinite(yieldVal) ? Option.some(yieldVal) : Option.none();
    },
  });
}

/**
 * Calculates Net Debt to EBITDA ratio from financial statements
 *
 * Formula: Net Debt / EBITDA
 *
 * Where:
 * - Net Debt = Total Debt - Cash and Cash Equivalents
 * - Total Debt = Short Term Debt + Long Term Debt
 * - EBITDA = EBITDA from income statement (or Operating Income + Depreciation & Amortization)
 *
 * @param financialStatement - The financial statement row from the database
 * @returns Net Debt/EBITDA ratio (e.g., 0.8 = 0.8x), or None if calculation is not possible
 */
export function calculateNetDebtToEbitda(
  financialStatement: FinancialStatementDBRow | null | undefined
): Option.Option<number> {
  if (!financialStatement) {
    return Option.none();
  }

  const incomePayload = financialStatement.income_statement_payload as
    | IncomeStatementPayload
    | null
    | undefined;
  const balancePayload = financialStatement.balance_sheet_payload as
    | BalanceSheetPayload
    | null
    | undefined;

  if (!incomePayload || !balancePayload) {
    return Option.none();
  }

  // Extract balance sheet values for Net Debt
  const shortTermDebt = safeExtractNumber(balancePayload, "shortTermDebt");
  const longTermDebt = safeExtractNumber(balancePayload, "longTermDebt");
  const cash = safeExtractNumber(balancePayload, "cashAndCashEquivalents");

  // Extract income statement values for EBITDA
  const ebitda = safeExtractNumber(incomePayload, "ebitda");
  const operatingIncome = safeExtractNumber(incomePayload, "operatingIncome");
  const depreciationAndAmortization = safeExtractNumber(
    incomePayload,
    "depreciationAndAmortization"
  );

  // Calculate Net Debt = Total Debt - Cash
  const netDebt = Option.all([shortTermDebt, longTermDebt, cash]).pipe(
    Option.map(([std, ltd, cashVal]) => {
      const totalDebt = std + ltd;
      return totalDebt - cashVal;
    })
  );

  // Calculate EBITDA (use direct value if available, otherwise calculate)
  const calculatedEbitda = Option.all([operatingIncome, depreciationAndAmortization]).pipe(
    Option.map(([opInc, depAmort]) => opInc + depAmort)
  );

  const finalEbitda = Option.isSome(ebitda) ? ebitda : calculatedEbitda;

  // Calculate Net Debt / EBITDA
  return Option.all([netDebt, finalEbitda]).pipe(
    Option.flatMap(([netDebtVal, ebitdaVal]) => {
      // Edge case: If EBITDA <= 0, return None (company is losing money)
      if (ebitdaVal <= 0 || !isFinite(ebitdaVal)) {
        return Option.none();
      }
      const ratio = netDebtVal / ebitdaVal;
      return isFinite(ratio) ? Option.some(ratio) : Option.none();
    })
  );
}

/**
 * Calculates Altman Z-Score from financial statements and market cap
 *
 * Formula: Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E
 *
 * Where:
 * - A = Working Capital / Total Assets
 * - B = Retained Earnings / Total Assets
 * - C = EBIT / Total Assets
 * - D = Market Value of Equity / Total Liabilities
 * - E = Sales (Revenue) / Total Assets
 *
 * Interpretation:
 * - Z > 2.99 → Safe Zone (low bankruptcy risk)
 * - 1.81 < Z ≤ 2.99 → Grey Zone (moderate risk)
 * - Z ≤ 1.81 → Distress Zone (high bankruptcy risk)
 *
 * @param financialStatement - The financial statement row from the database
 * @param marketCap - Market capitalization from live quote indicators
 * @returns Altman Z-Score (e.g., 4.5), or None if calculation is not possible
 */
export function calculateAltmanZScore(
  financialStatement: FinancialStatementDBRow | null | undefined,
  marketCap: Option.Option<number>
): Option.Option<number> {
  if (!financialStatement || Option.isNone(marketCap)) {
    return Option.none();
  }

  const incomePayload = financialStatement.income_statement_payload as
    | IncomeStatementPayload
    | null
    | undefined;
  const balancePayload = financialStatement.balance_sheet_payload as
    | BalanceSheetPayload
    | null
    | undefined;

  if (!incomePayload || !balancePayload) {
    return Option.none();
  }

  // Extract all required values
  const totalAssets = safeExtractNumber(balancePayload, "totalAssets");
  // FMP API uses totalCurrentAssets/totalCurrentLiabilities, but support both field names
  const currentAssets = Option.isSome(safeExtractNumber(balancePayload, "totalCurrentAssets"))
    ? safeExtractNumber(balancePayload, "totalCurrentAssets")
    : safeExtractNumber(balancePayload, "currentAssets");
  const currentLiabilities = Option.isSome(safeExtractNumber(balancePayload, "totalCurrentLiabilities"))
    ? safeExtractNumber(balancePayload, "totalCurrentLiabilities")
    : safeExtractNumber(balancePayload, "currentLiabilities");
  const retainedEarnings = safeExtractNumber(balancePayload, "retainedEarnings");
  const totalLiabilities = safeExtractNumber(balancePayload, "totalLiabilities");
  const ebit = safeExtractNumber(incomePayload, "ebit");
  const operatingIncome = safeExtractNumber(incomePayload, "operatingIncome");
  const revenue = safeExtractNumber(incomePayload, "revenue");
  const marketCapVal = marketCap.value;

  // Calculate components
  // A = Working Capital / Total Assets
  const workingCapital = Option.all([currentAssets, currentLiabilities]).pipe(
    Option.map(([ca, cl]) => ca - cl)
  );
  const componentA = Option.all([workingCapital, totalAssets]).pipe(
    Option.map(([wc, ta]) => (ta !== 0 ? wc / ta : 0))
  );

  // B = Retained Earnings / Total Assets
  const componentB = Option.all([retainedEarnings, totalAssets]).pipe(
    Option.map(([re, ta]) => (ta !== 0 ? re / ta : 0))
  );

  // C = EBIT / Total Assets (use EBIT if available, otherwise Operating Income)
  const ebitValue = Option.isSome(ebit) ? ebit : operatingIncome;
  const componentC = Option.all([ebitValue, totalAssets]).pipe(
    Option.map(([ebitVal, ta]) => (ta !== 0 ? ebitVal / ta : 0))
  );

  // D = Market Value of Equity / Total Liabilities
  const componentD = totalLiabilities.pipe(
    Option.map((tl) => (tl !== 0 ? marketCapVal / tl : 0))
  );

  // E = Sales (Revenue) / Total Assets
  const componentE = Option.all([revenue, totalAssets]).pipe(
    Option.map(([rev, ta]) => (ta !== 0 ? rev / ta : 0))
  );

  // Calculate Z-Score = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E
  return Option.all([componentA, componentB, componentC, componentD, componentE]).pipe(
    Option.map(([a, b, c, d, e]) => {
      const zScore = 1.2 * a + 1.4 * b + 3.3 * c + 0.6 * d + 1.0 * e;
      return isFinite(zScore) ? Option.some(zScore) : Option.none();
    }),
    Option.flatten
  );
}

/**
 * Calculates Interest Coverage ratio from financial statements
 *
 * Formula: Interest Coverage = EBIT / Interest Expense
 *
 * Where:
 * - EBIT = Earnings Before Interest and Taxes (or Operating Income)
 * - Interest Expense = Interest expense from income statement
 *
 * Higher is better - indicates ability to pay interest obligations
 * Generally considered safe if > 5x
 *
 * @param financialStatement - The financial statement row from the database
 * @returns Interest Coverage ratio (e.g., 18.0 = 18x), or None if calculation is not possible
 */
export function calculateInterestCoverage(
  financialStatement: FinancialStatementDBRow | null | undefined
): Option.Option<number> {
  if (!financialStatement) {
    return Option.none();
  }

  const incomePayload = financialStatement.income_statement_payload as
    | IncomeStatementPayload
    | null
    | undefined;

  if (!incomePayload) {
    return Option.none();
  }

  // Extract income statement values
  const ebit = safeExtractNumber(incomePayload, "ebit");
  const operatingIncome = safeExtractNumber(incomePayload, "operatingIncome");
  const interestExpense = safeExtractNumber(incomePayload, "interestExpense");

  // Use EBIT if available, otherwise use Operating Income
  const ebitValue = Option.isSome(ebit) ? ebit : operatingIncome;

  // Calculate Interest Coverage = EBIT / Interest Expense
  return Option.all([ebitValue, interestExpense]).pipe(
    Option.flatMap(([ebitVal, intExp]) => {
      // Edge case: If Interest Expense <= 0, company has no interest expense
      // This means perfect/infinite coverage - return a very high value (999) to indicate this
      if (intExp <= 0 || !isFinite(intExp)) {
        // Company has no interest expense (or has interest income)
        // Return a high value to indicate perfect coverage
        return Option.some(999);
      }
      const coverage = ebitVal / intExp;
      return isFinite(coverage) ? Option.some(coverage) : Option.none();
    })
  );
}

