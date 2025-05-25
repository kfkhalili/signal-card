// src/components/game/cards/price-card/price-card.types.ts
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

export interface PriceCardStaticData {
  readonly db_id: string;
  readonly exchange_code: string | null;
}

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

export interface PriceCardSpecificBackData extends BaseCardBackData {
  readonly marketCap: number | null;
  readonly sma50d: number | null;
  readonly sma200d: number | null;
}

export interface PriceCardData extends BaseCardData {
  readonly type: "price";
  //readonly staticData: PriceCardStaticData;
  //liveData: PriceCardLiveData;
  readonly faceData: PriceCardFaceData;
  readonly backData: PriceCardSpecificBackData;
  //readonly backData: BaseCardBackData;
  readonly exchange_code?: string | null;
}

export interface PriceCardInteractions {
  readonly onPriceCardSmaClick?: (
    cardData: PriceCardData,
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
