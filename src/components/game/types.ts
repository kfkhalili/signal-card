
export interface PriceCardFaceData {
  symbol: string;
  price: number; // This will be current_price
  timestamp: Date; // This will be api_timestamp (converted)
  changePercentage?: number | null; // Optional, from quote
  dayChange?: number | null;        // Optional, from quote
  dayLow?: number | null;           // Optional, from quote
  dayHigh?: number | null;          // Optional, from quote
  volume?: number | null;           // Optional, from quote
  dayOpen?: number | null;          // Optional, from quote
  previousClose?: number | null;    // Optional, from quote
}

export interface PriceCardBackData {
  explanation: string;
  marketCap?: number | null;        // Optional, from quote
  sma50d?: number | null;           // Optional, from quote
  sma200d?: number | null;          // Optional, from quote
}

export interface TrendCardFaceData {
  symbol: string;
  trend: 'UP' | 'DOWN' | 'FLAT';
  referenceTimeStart: Date;
  referenceTimeEnd: Date;
}
export interface TrendCardBackData {
  explanation: string;
}

export interface DailyPerformanceSignalData {
  currentPrice: number;
  previousClose: number;
  change: number;         // Absolute change
  changePercentage: number; // Percentage change
  quoteTimestamp: Date;   // Timestamp of the quote this signal is based on
}

// New Signal Type for Price vs. SMA
export interface PriceVsSmaSignalData {
  currentPrice: number;
  smaValue: number;
  smaPeriod: 50 | 200; // Or number if you plan more SMAs
  priceAboveSma: boolean;
  quoteTimestamp: Date; // Timestamp of the quote this signal is based on
}

export type CardType = 'price' | 'trend' | 'daily_performance' | 'price_vs_sma'; // Added new types

export interface BaseGameCard {
  id: string;
  type: CardType | 'price_change' | 'price_discovery'; 
  isFlipped: boolean;
}

export interface PriceGameCard extends BaseGameCard {
  type: 'price';
  faceData: PriceCardFaceData;
  backData: PriceCardBackData;
  isSecured: boolean;
  appearedAt: number; 
  initialFadeDurationMs: number | null; 
}

export interface TrendGameCard extends BaseGameCard {
  type: 'trend';
  faceData: TrendCardFaceData;
  backData: TrendCardBackData;
}

export type ActiveGameCard = PriceGameCard | TrendGameCard;

// --- Discovered Card Types --- 

export interface PriceChangeSignal { 
  id: string;
  type: 'price_change'; 
  symbol: string;
  price1: number;
  price2: number;
  timestamp1: Date;
  timestamp2: Date;
  generatedAt: Date;
  isFlipped: boolean; 
  hasBeenFlippedAtLeastOnce?: boolean;
}

export interface PriceDiscoverySignal { 
  id: string;
  type: 'price_discovery'; 
  symbol: string;
  price: number;
  timestamp: Date; 
  discoveredAt: Date; 
  isFlipped: boolean; 
  hasBeenFlippedAtLeastOnce?: boolean;
}

export interface DailyPerformanceSignal extends BaseGameCard { 
  type: 'daily_performance';
  symbol: string; 
  data: DailyPerformanceSignalData;
  generatedAt: Date;      
  hasBeenFlippedAtLeastOnce?: boolean;
}

export interface PriceVsSmaSignal extends BaseGameCard { 
  type: 'price_vs_sma';
  symbol: string;
  data: PriceVsSmaSignalData;
  generatedAt: Date; 
  hasBeenFlippedAtLeastOnce?: boolean;
}

// Updated DiscoveredCard union type
export type DiscoveredCard = PriceChangeSignal | PriceDiscoverySignal | DailyPerformanceSignal | PriceVsSmaSignal;
