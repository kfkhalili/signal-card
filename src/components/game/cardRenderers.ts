// src/components/game/cardRenderers.ts
import React from "react";
import type {
  CardType,
  OnGenericInteraction,
} from "@/components/game/cards/base-card/base-card.types";
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
import type { DisplayableCard } from "./types";

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
  innerCardClassName?: string;
  children?: React.ReactNode;
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean;
  likeCount?: number;
  commentCount?: number;
  collectionCount?: number;
  isSaveDisabled?: boolean;
  onGenericInteraction: OnGenericInteraction;
  sourceCardId: string;
  sourceCardSymbol: string;
  sourceCardType: CardType;
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

// Removed unused 'SpecificCardData' type alias

export type RegisteredCardRendererProps = CommonCardRendererProps & {
  cardData: DisplayableCard;
  priceSpecificInteractions?: PriceSpecificInteractionsForContainer;
  specificInteractions?: ProfileCardSpecificInteractions;
};

export type RegisteredCardRenderer =
  React.ComponentType<RegisteredCardRendererProps>;

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

type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;
