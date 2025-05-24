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

export interface CardActionContext {
  readonly id: string;
  readonly symbol: string;
  readonly type: CardType;
  readonly companyName?: string | null;
  readonly logoUrl?: string | null;
  readonly websiteUrl?: string | null;
}

export interface BaseCardSocialInteractions {
  readonly onLike?: (context: CardActionContext) => void;
  readonly onComment?: (context: CardActionContext) => void;
  readonly onSave?: (context: CardActionContext) => void;
  readonly onShare?: (context: CardActionContext) => void;
}

export interface DataPoint<TDetails = unknown> {
  readonly elementType: string;
  readonly value?: unknown; // Changed from any
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

export interface InteractionPayload {
  sourceCardId: string;
  sourceCardSymbol: string;
  sourceCardType: CardType;
  interactionTarget: "card"; // Initially "card", can be expanded to an enum later
  targetType: CardType; // The type of card to create
  // No contextData for now, as per our discussion
}

export type OnGenericInteraction = (payload: InteractionPayload) => void;
