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

// These ...SignalData interfaces appear to be redundant if the specific data
// for each signal is included directly in the signal card's interface.
// They are removed in this suggestion. If they serve a distinct purpose,
// they should be fleshed out and their relationship to the main signal interfaces clarified.

export interface SignalCardBackData {
  explanation: string;
}

export type CardType =
  | "price"
  | "trend"
  | "daily_performance"
  | "price_vs_sma"
  | "price_range_context"
  | "intraday_trend"
  | "price_snapshot"; // price_discovery removed implicitly if not used

export interface BaseGameCard {
  id: string;
  type: CardType; // 'price_change' signal is being removed. 'price_discovery' was previously removed.
  isFlipped: boolean;
}

export interface PriceGameCard extends BaseGameCard {
  type: "price";
  faceData: PriceCardFaceData;
  backData: PriceCardBackData;
  isSecured: boolean; // Per context: "may become always true or be removed"
  appearedAt: number; // Per context: May be removed if fade logic is removed
  initialFadeDurationMs: number | null; // Per context: May be removed if fade logic is removed
}

export interface TrendCardFaceData {
  // TODO: Define specific data for the face of a Trend card
  trendDescription?: string; // Example
}

export interface TrendCardBackData {
  explanation: string;
  // TODO: Define specific data for the back of a Trend card
}

export interface TrendGameCard extends BaseGameCard {
  type: "trend";
  faceData: TrendCardFaceData; // Placeholder for trend-specific face data
  backData: TrendCardBackData; // Placeholder for trend-specific back data
  // appearedAt?: number; // Consider if this card type also has an appearance time
  // initialFadeDurationMs?: number | null; // And fade duration
}
export type ActiveGameCard = PriceGameCard | TrendGameCard;

// --- Discovered Card Types ---
// PriceChangeSignal is being removed as per project context.

export interface DailyPerformanceSignal extends BaseGameCard {
  type: "daily_performance";
  discoveredAt: Date;
  // Data specific to this signal
  currentPrice: number;
  previousClose: number;
  changePercentage: number;
  dayChange: number;
  backData: SignalCardBackData;
}
export interface PriceVsSmaSignal extends BaseGameCard {
  type: "price_vs_sma";
  discoveredAt: Date;
  // Data specific to this signal
  currentPrice: number;
  smaValue: number;
  smaPeriod: 20 | 50 | 100 | 200; // Example of specific SMA periods
  priceRelation: "above" | "below" | "at"; // Example: "price is above SMA"
  backData: SignalCardBackData;
}
export interface PriceRangeContextSignal extends BaseGameCard {
  type: "price_range_context";
  discoveredAt: Date;
  // Data specific to this signal (e.g., relation to day high/low)
  currentPrice: number;
  dayHigh: number | null;
  dayLow: number | null;
  // TODO: Add more specific fields like proximityToHigh, proximityToLow etc.
  backData: SignalCardBackData;
}
export interface IntradayTrendSignal extends BaseGameCard {
  type: "intraday_trend";
  discoveredAt: Date;
  // Data specific to this signal (e.g., short-term price movement pattern)
  // TODO: Define fields like trendDirection ("upward", "downward", "sideways"), strength, duration observed.
  observedTrendDescription: string; // Example
  backData: SignalCardBackData;
}
export interface PriceSnapshotSignal extends BaseGameCard {
  type: "price_snapshot";
  discoveredAt: Date;
  // Captures the full state of the live card at a moment
  snapshotFaceData: PriceCardFaceData;
  snapshotBackData: PriceCardBackData;
  backData: SignalCardBackData; // Explanation for the snapshot itself
}

export type DiscoveredCard =
  | DailyPerformanceSignal
  | PriceVsSmaSignal
  | PriceRangeContextSignal
  | IntradayTrendSignal
  | PriceSnapshotSignal;

// DisplayableCard represents any card that can be shown in the UI,
// whether it's a primary live card or a generated signal card.
export type DisplayableCard = ActiveGameCard | DiscoveredCard;
