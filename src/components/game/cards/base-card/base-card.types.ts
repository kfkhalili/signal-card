/**
 * src/app/components/game/cards/base-card/base-card.types.ts
 * Defines foundational types and interfaces for all game cards.
 */

// Defines the possible literal string values for card types.
export type CardType =
  | "price"
  | "daily_performance"
  | "price_vs_sma"
  | "price_range_context"
  | "intraday_trend"
  | "price_snapshot"
  | "trend"
  | "base";

// Base interface for data commonly found on the back of any card.
export interface BaseCardBackData {
  readonly explanation: string;
}

// The core interface that all specific card data structures MUST extend.
export interface BaseCardData {
  readonly id: string;
  readonly type: CardType;
  readonly symbol: string;
  readonly backData: BaseCardBackData;
  readonly createdAt: number; // Timestamp (milliseconds since epoch)
}

// --- Context for Actions ---
export interface CardActionContext {
  readonly id: string;
  readonly symbol: string;
  readonly type: CardType;
}

// --- Social Interactions ---
export interface BaseCardSocialInteractions {
  readonly onLike?: (context: CardActionContext) => void;
  readonly onComment?: (context: CardActionContext) => void;
  readonly onSave?: (context: CardActionContext) => void;
  readonly onShare?: (context: CardActionContext) => void;
}

// --- Generic Card Data Point Interactions (existing) ---
export interface DataPoint<TDetails = unknown> {
  readonly elementType: string;
  readonly value?: any;
  readonly details?: TDetails;
}

export interface CardInteractionEvent<
  TCardData extends BaseCardData = BaseCardData,
  TDetails = unknown
> {
  readonly cardData: TCardData;
  readonly clickedDataPoint: DataPoint<TDetails>;
  readonly originalUIEvent?:
    | React.MouseEvent<HTMLElement>
    | React.KeyboardEvent<HTMLElement>;
}

export type OnCardInteraction<
  TCardData extends BaseCardData = BaseCardData,
  TDetails = unknown
> = (event: CardInteractionEvent<TCardData, TDetails>) => void;

export type BaseCardContainerDataPointDetails = {
  readonly kind: "symbol" | "type" | "explanation";
};
