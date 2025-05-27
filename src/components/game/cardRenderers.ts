// src/components/game/cardRenderers.ts
import React from "react";
import type {
  CardType,
  OnGenericInteraction,
} from "@/components/game/cards/base-card/base-card.types"; //
import type { CardActionContext } from "@/components/game/cards/base-card/base-card.types";
import type { DisplayableCard } from "./types"; //

/**
 * Common props expected by all registered card renderers (containers).
 * GameCard will prepare and pass these down.
 */
export interface RegisteredCardRendererProps {
  cardData: DisplayableCard; // The full data for the card being rendered
  isFlipped: boolean;
  onFlip: () => void;
  cardContext: CardActionContext; // Contextual info about the card for actions
  onDeleteRequest: (context: CardActionContext) => void;
  onHeaderIdentityClick?: (context: CardActionContext) => void; // Optional: For BaseCard header clicks
  className?: string; // For outer styling of the card component
  innerCardClassName?: string; // For styling the inner flippable surfaces
  children?: React.ReactNode; // For potential future extensibility

  // The primary generic interaction handler passed from the top
  onGenericInteraction: OnGenericInteraction;
}

type RegisteredCardRenderer = React.ComponentType<RegisteredCardRendererProps>;

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
