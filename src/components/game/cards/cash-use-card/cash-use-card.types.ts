// src/components/game/cards/cash-use-card/cash-use-card.types.ts
import type { BaseCardData } from "../base-card/base-card.types";

export interface CashUseCardFmpBalanceSheetData {
  readonly totalDebt?: number | null;
  readonly date?: string;
  readonly period?: string;
  readonly reportedCurrency?: string | null;
}

export interface CashUseCardFmpCashFlowData {
  readonly freeCashFlow?: number | null;
  readonly netDividendsPaid?: number | null;
  readonly date?: string;
  readonly period?: string;
  readonly reportedCurrency?: string | null;
}

export interface CashUseCardStaticData {
  readonly reportedCurrency: string | null;
  // Labels for the periods covered by the 5-year range for each financial metric
  readonly debtRangePeriodLabel: string;
  readonly fcfRangePeriodLabel: string;
  readonly dividendsRangePeriodLabel: string;
  // Date of the latest financial statement used for current values
  readonly latestStatementDate: string | null;
  readonly latestStatementPeriod: string | null;
  // Date of the latest shares float data used
  readonly latestSharesFloatDate: string | null; // For currentOutstandingShares
}

export interface CashUseCardLiveData {
  // Current value for Outstanding Shares - NO MIN/MAX
  readonly currentOutstandingShares: number | null;

  // Current values & 5-year Min/Max for financial metrics
  readonly currentTotalDebt: number | null;
  readonly totalDebt_5y_min: number | null;
  readonly totalDebt_5y_max: number | null;

  readonly currentFreeCashFlow: number | null;
  readonly freeCashFlow_5y_min: number | null;
  readonly freeCashFlow_5y_max: number | null;

  readonly currentNetDividendsPaid: number | null;
  readonly netDividendsPaid_5y_min: number | null;
  readonly netDividendsPaid_5y_max: number | null;
}

export interface CashUseCardData extends BaseCardData {
  readonly type: "cashuse";
  readonly staticData: CashUseCardStaticData;
  liveData: CashUseCardLiveData;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CashUseCardInteractions {}
