/**
 * src/app/components/game/cards/base-card/base-card.types.ts
 */

// Defines the possible literal types for any card in the game.
export type CardType =
  | "price"
  | "daily_performance"
  | "price_vs_sma"
  | "price_range_context"
  | "intraday_trend"
  | "price_snapshot"
  | "trend"
  | "base"; // Added for the generic BaseCardData example

// Base interface for the data shown on the back of any card.
export interface CardBackData {
  explanation: string;
}

// The most fundamental interface that all specific card types will extend.
export interface BaseCardData {
  id: string;
  type: CardType;
  symbol: string;
  backData: CardBackData;
}

// --- Generic Card Interaction Types ---
export interface DataPoint<TDetails = unknown> {
  elementType: string; // e.g., 'symbol', 'cardType', 'explanationLink', 'smaValue'
  value?: any; // The primary value of the clicked element, if any
  details?: TDetails; // More structured data specific to this element type
}

export interface CardInteractionEvent<
  TCardData extends BaseCardData = BaseCardData,
  TDetails = unknown
> {
  cardData: TCardData;
  clickedDataPoint: DataPoint<TDetails>;
  originalUIEvent?: React.MouseEvent | React.KeyboardEvent;
}

export type OnCardInteraction<
  TCardData extends BaseCardData = BaseCardData,
  TDetails = unknown
> = (event: CardInteractionEvent<TCardData, TDetails>) => void;

// --- Details for BaseCardContainer's own simple interactions ---
export type BaseCardContainerDataPointDetails = {
  kind: "symbol" | "type" | "explanation";
};
