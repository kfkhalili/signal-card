/**
 * src/app/components/game/cards/price-card/price-card.types.ts
 */
import type {
  BaseCardData,
  BaseCardBackData,
} from "../base-card/base-card.types";

// Face data specific to the PriceCard
export interface PriceCardFaceData {
  // symbol: string; // Removed: will use symbol from BaseCardData
  price: number;
  timestamp: Date;
  changePercentage?: number | null;
  dayChange?: number | null;
  dayLow?: number | null;
  dayHigh?: number | null;
  volume?: number | null;
  dayOpen?: number | null;
  previousClose?: number | null;
}

// Back data specific to the PriceCard, extending the base requirements
export interface PriceCardBackData extends BaseCardBackData {
  // explanation: string; // Already in BaseCardBackData via extension
  marketCap?: number | null;
  sma50d?: number | null;
  sma200d?: number | null;
}

// The main data structure for a PriceCard
export interface PriceCardData extends BaseCardData {
  type: "price"; // Specific type for this card
  faceData: PriceCardFaceData;
  backData: PriceCardBackData; // Overrides BaseCardData.backData with more specific type
  appearedAt?: number; // Optional: Per your context, keep if fade logic is relevant
}

// Snapshot type - adapting it similarly for future use if needed
export interface PriceCardSnapshotData extends BaseCardData {
  type: "price_snapshot";
  discoveredAt: Date;
  // If snapshots have a different visual or data structure for face/back than live PriceCard:
  snapshotFaceData: PriceCardFaceData; // or a new specific type
  snapshotBackData: PriceCardBackData; // or a new specific type
  // If snapshot shares face/back structure, could be:
  // faceData: PriceCardFaceData;
  // backData: PriceCardBackData;
}
