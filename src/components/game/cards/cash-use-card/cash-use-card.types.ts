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

export interface AnnualDataPoint {
  readonly year: number;
  readonly value: number;
}

export interface CashUseCardStaticData {
  readonly reportedCurrency: string | null;
  readonly latestStatementDate: string | null;
  readonly latestStatementPeriod: string | null;
  readonly latestSharesFloatDate: string | null;
}

export interface CashUseCardLiveData {
  readonly currentOutstandingShares: number | null;
  readonly currentTotalDebt: number | null;
  readonly totalDebt_annual_data: readonly AnnualDataPoint[];
  readonly currentFreeCashFlow: number | null;
  readonly freeCashFlow_annual_data: readonly AnnualDataPoint[];
  readonly currentNetDividendsPaid: number | null;
  readonly netDividendsPaid_annual_data: readonly AnnualDataPoint[];
}

export interface CashUseCardData extends BaseCardData {
  readonly type: "cashuse";
  readonly staticData: CashUseCardStaticData;
  liveData: CashUseCardLiveData;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CashUseCardInteractions {}
