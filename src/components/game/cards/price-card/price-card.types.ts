// src/app/components/game/cards/price-card/price-card.types.ts
// import type { CardType } from "../base-card/base-card.types"; // Not directly used here if types are specific

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

export interface PriceCardSpecificBackData {
  readonly description?: string | null; // User-defined or default description for the card type
  readonly marketCap: number | null;
  readonly sma50d: number | null;
  readonly sma200d: number | null;
}

export interface PriceCardData {
  // This is a ConcreteCardData type
  readonly id: string;
  readonly type: "price"; // Discriminating literal type
  readonly symbol: string;
  readonly createdAt: number; // Timestamp of when this card instance was created on dashboard
  readonly companyName?: string | null;
  readonly logoUrl?: string | null;
  readonly faceData: PriceCardFaceData;
  readonly backData: PriceCardSpecificBackData;
  // If you added is_market_open here for the snapshot to the API, it would be:
  // readonly is_market_open?: boolean | null;
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
