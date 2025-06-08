// src/components/game/cardRenderers.ts
import React from "react";
import type {
  CardType,
  OnGenericInteraction,
  CardActionContext,
} from "@/components/game/cards/base-card/base-card.types";
import type { DisplayableCard, ConcreteCardData } from "./types";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager"; // NEW IMPORT

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
  className?: string; // For outer styling of the card component
  innerCardClassName?: string; // For styling the inner flippable surfaces
  children?: React.ReactNode;

  onGenericInteraction: OnGenericInteraction;

  // NEW PROPS
  isSelectionMode: boolean;
  selectedDataItems: SelectedDataItem[];
  onToggleItemSelection: (item: SelectedDataItem) => void;
}

/**
 * Props for the specific content component (e.g., PriceCardContent, ProfileCardContent).
 * These components are responsible for rendering the unique face/back of a card.
 */
export interface SpecificCardContentComponentProps<
  TCardDataType extends ConcreteCardData
> {
  cardData: TCardDataType; // The specific, concrete data for this card type
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
  // NEW PROPS
  isSelectionMode: boolean;
  selectedDataItems: SelectedDataItem[];
  onToggleItemSelection: (item: SelectedDataItem) => void;
}

/**
 * Type definition for a specific card's content rendering component.
 */
export type SpecificCardContentComponent<
  TCardDataType extends ConcreteCardData
> = React.ComponentType<SpecificCardContentComponentProps<TCardDataType>>;

/**
 * Type definition for a registered card renderer.
 * This is typically the GenericCardContainerRenderer configured for a specific card type.
 */
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
