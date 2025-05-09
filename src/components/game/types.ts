
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
  change: number;        
  changePercentage: number; 
  quoteTimestamp: Date;   
}

export interface PriceVsSmaSignalData {
  currentPrice: number;
  smaValue: number;
  smaPeriod: 50 | 200; 
  priceAboveSma: boolean;
  quoteTimestamp: Date; 
}

export interface PriceRangeContextSignalData {
  currentPrice: number;
  levelType: 'High' | 'Low'; 
  levelValue: number;        
  quoteTimestamp: Date;      
  difference?: number;        
  percentageFromLevel?: number; 
}

export interface IntradayTrendSignalData {
  currentPrice: number;
  openPrice: number;
  relationToOpen: 'Above' | 'Below' | 'At';
  quoteTimestamp: Date;
}

// New Signal Type for Price Snapshot
export interface PriceSnapshotSignalData {
  faceData: PriceCardFaceData; // Snapshot of the front of the card
  backData: PriceCardBackData; // Snapshot of the back of the card
  quoteTimestamp: Date; // Explicit timestamp of the snapshot event (from original card's faceData.timestamp)
}

export type CardType = 'price' | 'trend' | 'daily_performance' | 'price_vs_sma' | 'price_range_context' | 'intraday_trend' | 'price_snapshot'; // Added new type

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

export interface PriceRangeContextSignal extends BaseGameCard { 
  type: 'price_range_context';
  symbol: string;
  data: PriceRangeContextSignalData;
  generatedAt: Date;        
  hasBeenFlippedAtLeastOnce?: boolean;
}

export interface IntradayTrendSignal extends BaseGameCard {
  type: 'intraday_trend';
  symbol: string;
  data: IntradayTrendSignalData;
  generatedAt: Date;
  hasBeenFlippedAtLeastOnce?: boolean;
}

export interface PriceSnapshotSignal extends BaseGameCard { 
  type: 'price_snapshot';
  symbol: string;
  data: PriceSnapshotSignalData;
  generatedAt: Date;       
  hasBeenFlippedAtLeastOnce?: boolean;
}


// Updated DiscoveredCard union type
export type DiscoveredCard = 
  PriceChangeSignal | 
  PriceDiscoverySignal | 
  DailyPerformanceSignal | 
  PriceVsSmaSignal |
  PriceRangeContextSignal |
  IntradayTrendSignal |
  PriceSnapshotSignal; // Added new signal type
