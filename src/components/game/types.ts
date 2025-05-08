export interface PriceCardFaceData {
  symbol: string;
  price: number;
  timestamp: Date;
}
export interface PriceCardBackData {
  explanation: string;
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

export type CardType = 'price' | 'trend';

export interface BaseGameCard {
  id: string;
  type: CardType;
  isFlipped: boolean;
}

export interface PriceGameCard extends BaseGameCard {
  type: 'price';
  faceData: PriceCardFaceData;
  backData: PriceCardBackData;
  isSecured: boolean;
  appearedAt: number; // JS timestamp (Date.now())
  initialFadeDurationMs: number; 
}

export interface TrendGameCard extends BaseGameCard {
  type: 'trend';
  faceData: TrendCardFaceData;
  backData: TrendCardBackData;
  // Trend cards are always secured and don't fade
}

export type ActiveGameCard = PriceGameCard | TrendGameCard;

export interface PriceChangeSignal {
  id: string;
  type: 'price_change';
  symbol: string;
  price1: number;
  price2: number;
  timestamp1: Date;
  timestamp2: Date;
  generatedAt: Date;
  isFlipped: boolean; // Added for log card flipping
}

export interface PriceDiscoverySignal {
  id: string;
  type: 'price_discovery';
  symbol: string;
  price: number;
  timestamp: Date; // Price data timestamp
  discoveredAt: Date; // When card was revealed/secured
  isFlipped: boolean; // Added for log card flipping
}

export type DiscoveredSignal = PriceChangeSignal | PriceDiscoverySignal;

