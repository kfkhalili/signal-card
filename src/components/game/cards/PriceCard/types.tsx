import { BaseGameCard } from "../../types";

export interface PriceCardFaceData {
  symbol: string;
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

export interface PriceCardBackData {
  explanation: string;
  marketCap?: number | null;
  sma50d?: number | null;
  sma200d?: number | null;
}

export interface PriceCard extends BaseGameCard {
  type: "price";
  faceData: PriceCardFaceData;
  backData: PriceCardBackData;
  appearedAt: number; // Per context: May be removed if fade logic is removed
}

export interface PriceCardSnapshot extends BaseGameCard {
  type: "price_snapshot";
  discoveredAt: Date;
  snapshotFaceData: PriceCardFaceData;
  snapshotBackData: PriceCardBackData;
}
