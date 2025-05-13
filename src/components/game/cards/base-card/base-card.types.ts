// src/components/game/cards/base-card/base-card.types.ts

export type CardType = "profile" | "price";

export interface BaseCardBackData {
  readonly description?: string;
}

export interface BaseCardData {
  readonly id: string;
  readonly type: CardType;
  readonly symbol: string;
  readonly createdAt: number;
  readonly companyName?: string | null;
  readonly logoUrl?: string | null;
  readonly backData: BaseCardBackData;
  readonly websiteUrl?: string | null;
}

// Context for Actions passed to BaseCard and its children
export interface CardActionContext {
  readonly id: string;
  readonly symbol: string;
  readonly type: CardType;
  readonly companyName?: string | null;
  readonly logoUrl?: string | null;
  readonly websiteUrl?: string | null;
}

// Social Interactions (remains the same)
export interface BaseCardSocialInteractions {
  readonly onLike?: (context: CardActionContext) => void;
  readonly onComment?: (context: CardActionContext) => void;
  readonly onSave?: (context: CardActionContext) => void;
  readonly onShare?: (context: CardActionContext) => void;
}

// Generic Card Data Point Interactions (remains the same)
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
  readonly kind: "symbol" | "type" | "description";
};
