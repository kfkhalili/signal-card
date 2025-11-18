// src/components/game/cards/analyst-grades-card/analyst-grades-card.types.ts
import type { BaseCardData } from "../base-card/base-card.types";

export type RatingCategory =
  | "strongBuy"
  | "buy"
  | "hold"
  | "sell"
  | "strongSell";

export interface AnalystRatingDetail {
  readonly category: RatingCategory;
  readonly label: string; // e.g., "Strong Buy"
  readonly currentValue: number;
  readonly previousValue: number | null;
  readonly change: number | null; // currentValue - previousValue
  readonly colorClass: string; // For styling the bar segment
}

export interface AnalystGradesCardStaticData {
  readonly currentPeriodDate: string | null; // e.g., "May 2025" or null if no data
  readonly previousPeriodDate: string | null; // e.g., "April 2025"
}

export interface AnalystGradesCardLiveData {
  readonly ratingsDistribution: readonly AnalystRatingDetail[];
  readonly totalAnalystsCurrent: number;
  readonly totalAnalystsPrevious: number | null;
  readonly consensusLabelCurrent: string | null; // e.g., "Positive", "Neutral", "Buy" or null if no data
  // Optional: Could add consensus change if meaningful
  readonly lastUpdated: string | null;
}

export interface AnalystGradesCardData extends BaseCardData {
  readonly type: "analystgrades";
  readonly staticData: AnalystGradesCardStaticData;
  liveData: AnalystGradesCardLiveData;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AnalystGradesCardInteractions {}
