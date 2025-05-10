/**
 * src/app/components/game/cards/base-card/base-card.types.ts
 * Defines foundational types and interfaces for all game cards.
 */

// Defines the possible literal string values for card types.
// Ensure these literals are used in the `type` property of specific card data interfaces.
export type CardType =
  | "price" // For live price data
  | "daily_performance" // Potentially a signal derived from daily changes
  | "price_vs_sma" // Signal comparing price to SMA
  | "price_range_context" // Signal about price position in its daily range
  | "intraday_trend" // Signal about intraday trend
  | "price_snapshot" // For a static snapshot of price data
  | "trend" // For broader trend analysis
  | "base"; // Generic type, useful if BaseCardData needs to be instantiated directly (less common)

// Base interface for data commonly found on the back of any card.
export interface BaseCardBackData {
  explanation: string; // A general explanation or description.
}

// The core interface that all specific card data structures MUST extend.
// This ensures that components like GameCard can rely on these common properties.
export interface BaseCardData {
  readonly id: string; // Unique identifier for the card instance.
  readonly type: CardType; // Discriminator property.
  readonly symbol: string; // The financial symbol this card pertains to.
  readonly backData: BaseCardBackData; // Common data for the card's back face.
  readonly createdAt: number; // Timestamp (milliseconds since epoch) of when the card was created
}

// --- Generic Card Interaction Types ---

/**
 * Represents a specific data point within a card that can be interacted with.
 * TDetails can be used to provide more structured information about the interacted element.
 */
export interface DataPoint<TDetails = unknown> {
  readonly elementType: string; // Describes the part of the card, e.g., 'smaValue', 'priceDisplay'.
  readonly value?: any; // The primary value associated with the element, if applicable.
  readonly details?: TDetails; // Optional structured data for the interaction.
}

/**
 * Describes a card interaction event.
 * TCardData specifies the type of the card involved.
 * TDetails specifies the type of details for the clicked DataPoint.
 */
export interface CardInteractionEvent<
  TCardData extends BaseCardData = BaseCardData,
  TDetails = unknown
> {
  readonly cardData: TCardData; // The data of the card that was interacted with.
  readonly clickedDataPoint: DataPoint<TDetails>; // Information about the specific element clicked.
  readonly originalUIEvent?:
    | React.MouseEvent<HTMLElement>
    | React.KeyboardEvent<HTMLElement>; // The original browser event.
}

/**
 * Defines the signature for a callback function to handle card interactions.
 */
export type OnCardInteraction<
  TCardData extends BaseCardData = BaseCardData,
  TDetails = unknown
> = (event: CardInteractionEvent<TCardData, TDetails>) => void;

// --- Details for BaseCardContainer's own simple interactions ---
// Example of specific details for interactions handled by a base container.
export type BaseCardContainerDataPointDetails = {
  readonly kind: "symbol" | "type" | "explanation";
};
