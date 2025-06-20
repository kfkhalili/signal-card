// src/components/game/cards/price-card/price-card.types.ts
import type { BaseCardData } from "../base-card/base-card.types";

/**
 * Defines the static, less frequently changing data specific to a price card.
 * Example: exchange code for the symbol.
 */
export interface PriceCardStaticData {
  readonly exchange_code?: string | null;
  readonly currency: string | null; // Added currency field
}

/**
 * Defines the live, frequently updated data for a PriceCard.
 * This includes current price, changes, volume, and technical indicators.
 */
export interface PriceCardLiveData {
  readonly timestamp: number | null;
  readonly price: number | null;
  readonly dayChange: number | null;
  readonly changePercentage: number | null;
  readonly dayHigh: number | null;
  readonly dayLow: number | null;
  readonly dayOpen: number | null;
  readonly previousClose: number | null;
  readonly volume: number | null;
  readonly yearHigh?: number | null;
  readonly yearLow?: number | null;
  readonly marketCap: number | null;
  readonly sma50d: number | null;
  readonly sma200d: number | null;
}

/**
 * Main interface for the complete PriceCard data structure.
 * It extends BaseCardData and includes card-specific static and live data.
 * The `backData` (for description) is inherited from BaseCardData.
 */
export interface PriceCardData extends BaseCardData {
  readonly type: "price";
  readonly staticData: PriceCardStaticData;
  liveData: PriceCardLiveData;
}
