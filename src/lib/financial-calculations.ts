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
}

interface BalanceSheetPayload {
  totalStockholdersEquity?: number | null;
  shortTermDebt?: number | null;
  longTermDebt?: number | null;
  cashAndCashEquivalents?: number | null;
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

