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
  symbol: string;
  price1: number;
  price2: number;
  timestamp1: Date;
  timestamp2: Date;
  generatedAt: Date;
}
