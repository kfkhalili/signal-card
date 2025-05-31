// src/components/game/cards/revenue-breakdown-card/revenue-breakdown-card.types.ts
import type { BaseCardData } from "../base-card/base-card.types";

export interface SegmentRevenueDataItem {
  readonly segmentName: string;
  readonly currentRevenue: number;
  readonly previousRevenue: number | null; // Null if segment was new in current period
  readonly yoyChange: number | null; // Null if previous revenue was null/zero or segment is new
}

export interface RevenueBreakdownCardStaticData {
  readonly currencySymbol: string; // e.g., "$"
  readonly latestPeriodLabel: string; // e.g., "FY2024 ending 2024-09-28"
  readonly previousPeriodLabel: string | null; // e.g., "FY2023 ending 2023-09-30", null if no prev data
}

export interface RevenueBreakdownCardLiveData {
  readonly totalRevenueLatestPeriod: number | null;
  // Sorted by currentRevenue descending
  readonly breakdown: readonly SegmentRevenueDataItem[];
  readonly lastUpdated: string | null; // From the 'updated_at' of the latest DB row used
}

export interface RevenueBreakdownCardData extends BaseCardData {
  readonly type: "revenuebreakdown"; // New card type
  readonly staticData: RevenueBreakdownCardStaticData;
  liveData: RevenueBreakdownCardLiveData;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RevenueBreakdownCardInteractions {}
