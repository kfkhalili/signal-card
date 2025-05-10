import { PriceCard, PriceCardSnapshot } from "./cards/PriceCard/types";
import type { DailyPerformanceCard } from "./cards/DailyPerformance/type";
import type { PriceVsSmaSignal } from "./cards/PriceVsSma/types";
import type { PriceRangeContextSignal } from "./cards/PriceRangeContext/types";
import type { IntradayTrendCard } from "./cards/IntradayTrend/types";

export interface CardBackData {
  explanation: string;
}

export type CardType =
  | "price"
  | "trend"
  | "daily_performance"
  | "price_vs_sma"
  | "price_range_context"
  | "intraday_trend"
  | "price_snapshot";

export interface BaseGameCard {
  id: string;
  type: CardType;
  isFlipped: boolean;
  symbol: string;
  backData: CardBackData;
}

export type DiscoveredCard =
  | DailyPerformanceCard
  | PriceVsSmaSignal
  | PriceRangeContextSignal
  | IntradayTrendCard
  | PriceCardSnapshot;

export type PrimaryGameCard = PriceCard;
export type DisplayableCard = PrimaryGameCard | DiscoveredCard;
