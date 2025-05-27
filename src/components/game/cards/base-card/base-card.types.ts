// src/components/game/cards/base-card/base-card.types.ts

export type CardType = "profile" | "price" | "revenue";

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

export interface InteractionPayload {
  sourceCardId: string;
  sourceCardSymbol: string;
  sourceCardType: CardType;
  interactionTarget: "card"; // Initially "card", can be expanded to an enum later
  targetType: CardType; // The type of card to create
  // No contextData for now, as per our discussion
}

export type OnGenericInteraction = (payload: InteractionPayload) => void;
