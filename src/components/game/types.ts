
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

export interface PriceChangeSignal { // This name describes the *type* of card, so it's okay.
  id: string;
  type: 'price_change';
  symbol: string;
  price1: number;
  price2: number;
  timestamp1: Date;
  timestamp2: Date;
  generatedAt: Date;
  isFlipped: boolean; 
  hasBeenFlippedAtLeastOnce?: boolean; // Added to track flip state
}

export interface PriceDiscoverySignal { // This name describes the *type* of card, so it's okay.
  id: string;
  type: 'price_discovery';
  symbol: string;
  price: number;
  timestamp: Date; // Price data timestamp
  discoveredAt: Date; // When card was revealed/secured
  isFlipped: boolean; 
  hasBeenFlippedAtLeastOnce?: boolean; // Added to track flip state
}

// This is the union type for items in the "Discovered Cards" area.
export type DiscoveredCard = PriceChangeSignal | PriceDiscoverySignal;
