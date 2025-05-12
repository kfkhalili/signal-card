// src/app/components/game/cards/price-card/price-card.types.ts
// import type { CardType } from "../base-card/base-card.types"; // Not directly used here if types are specific

import { BaseCardBackData, BaseCardData } from "../base-card/base-card.types";

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
  readonly yearHigh?: number | null;
  readonly yearLow?: number | null;
}

export interface PriceCardSpecificBackData extends BaseCardBackData {
  readonly marketCap: number | null;
  readonly sma50d: number | null;
  readonly sma200d: number | null;
}

export interface PriceCardData extends BaseCardData {
  readonly type: "price";
  readonly faceData: PriceCardFaceData;
  readonly backData: PriceCardSpecificBackData;
}

// PriceCardSnapshotData and PriceCardSnapshotSpecificBackData removed

export interface PriceCardInteractionCallbacks {
  readonly onPriceCardSmaClick?: (
    cardData: PriceCardData, // Remains PriceCardData
    smaPeriod: 50 | 200,
    smaValue: number
  ) => void;
  readonly onPriceCardRangeContextClick?: (
    cardData: PriceCardData,
    levelType: "High" | "Low" | "YearHigh" | "YearLow",
    levelValue: number
  ) => void;
  readonly onPriceCardOpenPriceClick?: (cardData: PriceCardData) => void;
  readonly onPriceCardGenerateDailyPerformanceSignal?: (
    cardData: PriceCardData
  ) => void;
}
