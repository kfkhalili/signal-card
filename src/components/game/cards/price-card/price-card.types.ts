// src/app/components/game/cards/price-card/price-card.types.ts

// Assuming BaseCardData is imported or defined elsewhere if PriceCardData extends it.
// For this example, let's assume PriceCardData includes all necessary base fields.
import type { CardType } from "../base-card/base-card.types"; // if needed

export interface PriceCardFaceData {
  readonly timestamp: number | null; // Milliseconds since epoch
  readonly price: number | null;
  readonly dayChange: number | null;
  readonly changePercentage: number | null;
  readonly dayHigh: number | null;
  readonly dayLow: number | null;
  readonly dayOpen: number | null;
  readonly previousClose: number | null;
  readonly volume: number | null;
}

export interface PriceCardSpecificBackData {
  readonly explanation: string;
  readonly marketCap: number | null;
  readonly sma50d: number | null;
  readonly sma200d: number | null;
}

export interface PriceCardData {
  // Assuming common fields from a BaseCardData structure are here
  readonly id: string;
  readonly type: "price"; // Literal type for PriceCard
  readonly symbol: string;
  readonly createdAt: number; // Milliseconds since epoch

  // New fields for profile information
  readonly companyName?: string | null;
  readonly logoUrl?: string | null;

  readonly faceData: PriceCardFaceData;
  readonly backData: PriceCardSpecificBackData;
}

// For PriceCardSnapshotData, you might also want to add companyName and logoUrl
// if snapshots should also display this information.
export interface PriceCardSnapshotSpecificBackData {
  readonly explanation: string;
  readonly discoveredReason?: string;
}

export interface PriceCardSnapshotData {
  readonly id: string;
  readonly type: "price_snapshot";
  readonly symbol: string;
  readonly createdAt: number;

  // New fields for profile information
  readonly companyName?: string | null;
  readonly logoUrl?: string | null;

  readonly capturedPrice: number;
  readonly snapshotTime: number; // Milliseconds since epoch
  readonly backData: PriceCardSnapshotSpecificBackData;
}

// Callbacks specific to data points within PriceCardContent
export interface PriceCardInteractionCallbacks {
  readonly onPriceCardSmaClick?: (
    cardData: PriceCardData,
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
