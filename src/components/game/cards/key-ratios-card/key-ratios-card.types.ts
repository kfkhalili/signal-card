// src/components/game/cards/key-ratios-card/key-ratios-card.types.ts
import type { BaseCardData } from "../base-card/base-card.types";

/**
 * Defines the static data specific to a Key Ratios card.
 * This might include the date the TTM ratios were last calculated or fetched.
 */
export interface KeyRatiosCardStaticData {
  readonly lastUpdated: string | null; // ISO date string
  readonly reportedCurrency?: string | null; // Though ratios are unitless, currency context for per-share values might be useful.
}

/**
 * Defines the live data for a KeyRatiosCard.
 * These are the TTM ratios fetched from the database.
 */
export interface KeyRatiosCardLiveData {
  // Valuation Ratios
  readonly priceToEarningsRatioTTM: number | null;
  readonly priceToSalesRatioTTM: number | null;
  readonly priceToBookRatioTTM: number | null;
  readonly priceToFreeCashFlowRatioTTM: number | null;
  readonly enterpriseValueMultipleTTM: number | null; // Or EV/EBITDA if this field represents that

  // Profitability Ratios
  readonly netProfitMarginTTM: number | null;
  readonly grossProfitMarginTTM: number | null;
  readonly ebitdaMarginTTM: number | null;

  // Solvency/Leverage Ratios
  readonly debtToEquityRatioTTM: number | null;

  // Shareholder Return
  readonly dividendYieldTTM: number | null;
  readonly dividendPayoutRatioTTM: number | null;

  // Per Share Metrics
  readonly earningsPerShareTTM: number | null; // from net_income_per_share_ttm
  readonly revenuePerShareTTM: number | null;
  readonly bookValuePerShareTTM: number | null;
  readonly freeCashFlowPerShareTTM: number | null;

  // Other Key Metrics
  readonly effectiveTaxRateTTM: number | null;
  readonly currentRatioTTM: number | null;
  readonly quickRatioTTM: number | null;
  readonly assetTurnoverTTM: number | null;
}

/**
 * Main interface for the complete KeyRatiosCard data structure.
 */
export interface KeyRatiosCardData extends BaseCardData {
  readonly type: "keyratios"; // New card type
  readonly staticData: KeyRatiosCardStaticData;
  liveData: KeyRatiosCardLiveData;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface KeyRatiosCardInteractions {}
