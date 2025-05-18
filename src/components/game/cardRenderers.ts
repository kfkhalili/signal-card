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

// Define a common props interface that GameCard will provide.
// Specific card containers will receive this and their specific 'cardData' and 'specificInteractions'.
export interface CommonCardRendererProps {
  isFlipped: boolean;
  onFlip: () => void; // The flip handler is now specific to the card instance via closure
  cardContext: CardActionContext;
  currentRarity?: string | null;
  rarityReason?: string | null;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest: (context: CardActionContext) => void; // GameCard ensures context is passed
  onHeaderIdentityClick?: (context: CardActionContext) => void;
  className?: string; // For the outer container styling
  isLikedByCurrentUser?: boolean; // Passed from DisplayableCard state
  isSavedByCurrentUser?: boolean;
  likeCount?: number;
  commentCount?: number;
  collectionCount?: number;
}

// This is the expected prop structure for PriceCardContainer
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

// This is the expected prop structure for ProfileCardContainer
export type ProfileCardRendererProps = CommonCardRendererProps & {
  cardData: ProfileCardData;
  specificInteractions?: ProfileCardSpecificInteractions;
};

// A union type for all possible renderer props might be useful for advanced typing,
// but React.ComponentType<any> is often sufficient for the registry value.
// For this example, we'll keep it simple with React.ComponentType<any> for the registry.
export type RegisteredCardRenderer = React.ComponentType<any>;

const cardRendererRegistry = new Map<CardType, RegisteredCardRenderer>();

export function registerCardRenderer(
  cardType: CardType,
  renderer: RegisteredCardRenderer
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
