/**
 * src/app/components/game/cards/price-card/price-card.types.ts
 * Defines types specific to Price Cards, including live quotes and snapshots.
 */

import type {
  BaseCardData,
  BaseCardBackData,
} from "../base-card/base-card.types";

// --- Price Card Face Data (Live Quote) ---
export interface PriceCardFaceData {
  readonly timestamp: number | null;
  readonly price: number | null;
  readonly dayChange: number | null;
  readonly changePercentage: number | null;
  readonly dayHigh: number | null;
  readonly dayLow: number | null;
  readonly dayOpen: number | null;
  readonly previousClose: number | null;
  readonly volume: number | null;
}

// --- Price Card Specific Back Data ---
export interface PriceCardSpecificBackData extends BaseCardBackData {
  // Inherits 'explanation' from BaseCardBackData
  readonly marketCap: number | null;
  readonly sma50d: number | null;
  readonly sma200d: number | null;
}

// --- Full PriceCardData for Live Quotes ---
export interface PriceCardData extends BaseCardData {
  readonly type: "price"; // Matches a literal from CardType in base-card.types.ts
  readonly faceData: PriceCardFaceData;
  readonly backData: PriceCardSpecificBackData; // Overrides BaseCardData.backData with a more specific type
}

// --- Price Card Snapshot Specific Back Data ---
export interface PriceCardSnapshotSpecificBackData extends BaseCardBackData {
  // Inherits 'explanation'
  readonly discoveredReason?: string; // Example: why this snapshot was taken
}

// --- PriceCardSnapshotData for Static Snapshots ---
export interface PriceCardSnapshotData extends BaseCardData {
  readonly type: "price_snapshot"; // Matches a literal from CardType
  // Snapshot-specific fields for its "face"
  readonly capturedPrice: number;
  readonly snapshotTime: number;
  readonly backData: PriceCardSnapshotSpecificBackData; // Overrides BaseCardData.backData
}

// --- Interaction Callbacks specific to PriceCard ---
// These are the callbacks PriceCardContainer expects.
export interface PriceCardInteractionCallbacks {
  readonly onPriceCardSmaClick?: (
    cardData: PriceCardData, // Specific to PriceCardData for type safety
    smaPeriod: 50 | 200,
    smaValue: number
  ) => void;
  readonly onPriceCardRangeContextClick?: (
    cardData: PriceCardData,
    levelType: "High" | "Low",
    levelValue: number
  ) => void;
  readonly onPriceCardOpenPriceClick?: (cardData: PriceCardData) => void;
  readonly onPriceCardGenerateDailyPerformanceSignal?: (
    cardData: PriceCardData
  ) => void;
}
