/**
 * src/app/components/game/cards/base-card/base-card.types.ts
 * Defines foundational types and interfaces for all game cards.
 */

export type CardType =
  | "profile"
  | "price"
  | "daily_performance"
  | "price_vs_sma"
  | "price_range_context"
  | "intraday_trend"
  | "price_snapshot"
  | "trend"
  | "base";

export interface BaseCardBackData {
  readonly description?: string;
}

// BaseCardData itself doesn't need companyName/logoUrl if specific card types
// (like PriceCardData) will hold them and provide them to BaseCard via props.
// However, CardActionContext will carry them for actions.
export interface BaseCardData {
  readonly id: string;
  readonly type: CardType;
  readonly symbol: string; // Common to most financial cards
  readonly createdAt: number; // When this card instance was created/came into view
  readonly companyName?: string | null; // Often common
  readonly logoUrl?: string | null; // Often common

  // Rarity fields - common to all displayable cards on the dashboard
  readonly currentRarity?: string | null;
  readonly rarityReason?: string | null;

  // This backData is for the generic "back" defined by BaseCard itself,
  // usually a simple description. Specific cards have their own detailed backData.
  readonly backData: BaseCardBackData;
}

// --- Context for Actions ---
// This context is passed to interaction handlers (e.g., social bar, delete)
export interface CardActionContext {
  readonly id: string;
  readonly symbol: string;
  readonly type: CardType;
  // Add company info here if actions need it directly without full cardData
  readonly companyName?: string | null;
  readonly logoUrl?: string | null;
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
  TCardData extends BaseCardData = BaseCardData, // TCardData might be PriceCardData which has company info
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
  readonly kind: "symbol" | "type" | "description";
};
