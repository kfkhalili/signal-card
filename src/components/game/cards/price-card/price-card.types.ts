// src/app/components/game/cards/price-card/price-card.types.ts
import type { CardType } from "../base-card/base-card.types";

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

export interface PriceCardSpecificBackData {
  readonly description?: string | null; // Renamed from explanation, kept optional
  readonly marketCap: number | null;
  readonly sma50d: number | null;
  readonly sma200d: number | null;
}

export interface PriceCardData {
  readonly id: string;
  readonly type: "price";
  readonly symbol: string;
  readonly createdAt: number;
  readonly companyName?: string | null;
  readonly logoUrl?: string | null;
  readonly faceData: PriceCardFaceData;
  readonly backData: PriceCardSpecificBackData; // Uses the updated type
}

export interface PriceCardSnapshotSpecificBackData {
  readonly description?: string | null; // Renamed from explanation, kept optional
  readonly discoveredReason?: string;
}

export interface PriceCardSnapshotData {
  readonly id: string;
  readonly type: "price_snapshot";
  readonly symbol: string;
  readonly createdAt: number;
  readonly companyName?: string | null;
  readonly logoUrl?: string | null;
  readonly capturedPrice: number;
  readonly snapshotTime: number;
  readonly backData: PriceCardSnapshotSpecificBackData; // Uses the updated type
}

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
