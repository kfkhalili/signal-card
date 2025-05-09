
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

export interface TrendCardFaceData { /* ... */ }
export interface TrendCardBackData { /* ... */ }
export interface DailyPerformanceSignalData { /* ... */ }
export interface PriceVsSmaSignalData { /* ... */ }
export interface PriceRangeContextSignalData { /* ... */ }
export interface IntradayTrendSignalData { /* ... */ }
export interface PriceSnapshotSignalData { /* ... */ }

export type CardType = 'price' | 'trend' | 'daily_performance' | 'price_vs_sma' | 'price_range_context' | 'intraday_trend' | 'price_snapshot'; // price_discovery removed implicitly if not used

export interface BaseGameCard {
  id: string;
  type: CardType | 'price_change'; // REMOVED 'price_discovery' from here too
  isFlipped: boolean;
}

export interface PriceGameCard extends BaseGameCard {
  type: 'price';
  faceData: PriceCardFaceData;
  backData: PriceCardBackData;
  isSecured: boolean; // This field may become always true or be removed
  appearedAt: number; 
  initialFadeDurationMs: number | null; 
}

export interface TrendGameCard extends BaseGameCard { /* ... */ }
export type ActiveGameCard = PriceGameCard | TrendGameCard;

// --- Discovered Card Types --- 
export interface PriceChangeSignal { /* ... */ } // Keep for now, review next
// REMOVED: export interface PriceDiscoverySignal { ... }
export interface DailyPerformanceSignal extends BaseGameCard { /* ... */ }
export interface PriceVsSmaSignal extends BaseGameCard { /* ... */ }
export interface PriceRangeContextSignal extends BaseGameCard { /* ... */ }
export interface IntradayTrendSignal extends BaseGameCard { /* ... */ }
export interface PriceSnapshotSignal extends BaseGameCard { /* ... */ }

export type DiscoveredCard = 
  PriceChangeSignal | 
  // PriceDiscoverySignal | // REMOVED
  DailyPerformanceSignal | 
  PriceVsSmaSignal |
  PriceRangeContextSignal |
  IntradayTrendSignal |
  PriceSnapshotSignal;

export type DisplayableCard = ActiveGameCard | DiscoveredCard;
