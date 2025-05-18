// src/components/game/cardRenderers.ts
import React from "react";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
} from "@/components/game/cards/base-card/base-card.types";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
} from "./cards/price-card/price-card.types";
import type {
  ProfileCardData,
  ProfileCardInteractionCallbacks as ProfileCardSpecificInteractions,
} from "./cards/profile-card/profile-card.types";
import type { DisplayableCard } from "./types"; // Import DisplayableCard

export interface CommonCardRendererProps {
  isFlipped: boolean;
  onFlip: () => void;
  cardContext: CardActionContext;
  currentRarity?: string | null;
  rarityReason?: string | null;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest: (context: CardActionContext) => void;
  onHeaderIdentityClick?: (context: CardActionContext) => void;
  className?: string;
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean;
  likeCount?: number;
  commentCount?: number;
  collectionCount?: number;
  isSaveDisabled?: boolean;
}

export type PriceCardRendererProps = CommonCardRendererProps & {
  cardData: PriceCardData;
  priceSpecificInteractions?: Pick<
    PriceCardInteractionCallbacks,
    | "onPriceCardSmaClick"
    | "onPriceCardRangeContextClick"
    | "onPriceCardOpenPriceClick"
    | "onPriceCardGenerateDailyPerformanceSignal"
  >;
};

export type ProfileCardRendererProps = CommonCardRendererProps & {
  cardData: ProfileCardData;
  specificInteractions?: ProfileCardSpecificInteractions;
};

// Union type for all specific card data types
type SpecificCardData = PriceCardData | ProfileCardData;

// Props that all registered renderers should accept.
// This includes common props and a `cardData` prop typed to DisplayableCard.
export type RegisteredCardRendererProps = CommonCardRendererProps & {
  cardData: DisplayableCard; // Use DisplayableCard for the actual card data being passed
  // Include specific interaction props if they can be generalized or are optional
  priceSpecificInteractions?: PriceSpecificInteractionsForContainer;
  specificInteractions?: ProfileCardSpecificInteractions; // For ProfileCard
};

export type RegisteredCardRenderer =
  React.ComponentType<RegisteredCardRendererProps>;

const cardRendererRegistry = new Map<CardType, RegisteredCardRenderer>();

export function registerCardRenderer(
  cardType: CardType,
  renderer: RegisteredCardRenderer // Expecting the more specific type
): void {
  if (cardRendererRegistry.has(cardType)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `Card renderer for type "${cardType}" is being overwritten.`
      );
    }
  }
  cardRendererRegistry.set(cardType, renderer);
}

export function getCardRenderer(
  cardType: CardType
): RegisteredCardRenderer | undefined {
  return cardRendererRegistry.get(cardType);
}

// Helper type for PriceCard specific interactions, if needed elsewhere
type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;
