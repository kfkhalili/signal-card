// src/components/game/cards/dividends-history-card/dividends-history-card.types.ts
import type { BaseCardData } from "../base-card/base-card.types";

export interface LatestDividendInfo {
  readonly amount: number | null;
  readonly adjAmount: number | null;
  readonly exDividendDate: string | null; // 'date' column from dividend_history
  readonly paymentDate: string | null;
  readonly declarationDate: string | null;
  readonly yieldAtDistribution: number | null; // 'yield' column from dividend_history
  readonly frequency: string | null;
}

export interface AnnualDividendTotal {
  readonly year: number;
  readonly totalDividend: number;
}

export interface DividendsHistoryCardStaticData {
  readonly reportedCurrency: string | null; // From profile, for context
  readonly typicalFrequency: string | null; // Derived, e.g., "Quarterly"
}

export interface DividendsHistoryCardLiveData {
  readonly latestDividend: LatestDividendInfo | null;
  readonly annualTotalsLast3Years: readonly AnnualDividendTotal[]; // For histogram
  readonly lastFullYearDividendGrowthYoY: number | null; // YoY growth of total annual dividends
  readonly lastUpdated: string | null; // Timestamp of the latest dividend data point used
}

export interface DividendsHistoryCardData extends BaseCardData {
  readonly type: "dividendshistory"; // New card type
  readonly staticData: DividendsHistoryCardStaticData;
  liveData: DividendsHistoryCardLiveData;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DividendsHistoryCardInteractions {}
