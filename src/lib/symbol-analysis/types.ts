import { Option } from "effect";

export interface ValuationMetrics {
  dcfFairValue: Option.Option<number>;
  currentPrice: Option.Option<number>;
  peRatio: Option.Option<number>;
  pegRatio: Option.Option<number>;
  priceHistory: { date: string; price: number; dcf: number }[];
}

export interface QualityMetrics {
  roic: Option.Option<number>;
  wacc: Option.Option<number>;
  grossMargin: Option.Option<number>;
  fcfYield: Option.Option<number>;
  roicHistory: { date: string; dateLabel: string; roic: number; wacc: number }[];
}

export interface SafetyMetrics {
  netDebtToEbitda: Option.Option<number>;
  altmanZScore: Option.Option<number>;
  interestCoverage: Option.Option<number>;
}

export interface InsiderActivity {
  netBuyVolume: Option.Option<number>;
  netSellVolume: Option.Option<number>;
  netSentiment: number; // Net shares (bought - sold) for sentiment calculation
  latestTrade: Option.Option<{ name: string; action: string; shares: number; date: string }>;
}

export interface ContrarianIndicators {
  shortInterest: Option.Option<number>;
  analystConsensus: Option.Option<string>;
  priceTarget: Option.Option<number>;
}

export type HealthStatus = "Undervalued" | "Fair" | "Overvalued" | "Unknown";
export type QualityStatus = "Excellent" | "Good" | "Average" | "Poor" | "Unknown";
export type SafetyStatus = "Safe" | "Moderate" | "Risky" | "Unknown";

export interface StatusResult {
  status: HealthStatus | QualityStatus | SafetyStatus | string;
  color: string;
  borderColor: string;
}
