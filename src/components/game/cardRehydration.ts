// src/components/game/cardRehydration.ts
import type {
  DisplayableCard,
  DisplayableCardState,
  ConcreteCardData,
} from "@/components/game/types";
import { parseTimestampSafe } from "@/lib/formatters";
import type { CardType } from "./cards/base-card/base-card.types";

export interface CommonCardPropsForRehydration extends DisplayableCardState {
  id: string;
  symbol: string;
  createdAt: number;
  companyName?: string | null;
  logoUrl?: string | null;
}

export type SpecificCardRehydrator = (
  cardDataFromStorage: Record<string, unknown>,
  commonProps: CommonCardPropsForRehydration
) => ConcreteCardData | null;

// Using CardType for the key provides better type safety if CardType is a union of string literals
const cardRehydratorRegistry = new Map<CardType, SpecificCardRehydrator>();

export function registerCardRehydrator(
  cardType: CardType, // Use the imported CardType
  rehydrator: SpecificCardRehydrator
): void {
  if (cardRehydratorRegistry.has(cardType)) {
    // This warning can be useful during development if rehydrators are accidentally overwritten.
    // For production, you might choose to remove it or make it conditional.
    console.warn(
      `[cardRehydration] Rehydrator for card type "${cardType}" is being overwritten.`
    );
  }
  cardRehydratorRegistry.set(cardType, rehydrator);
}

export function rehydrateCardFromStorage(
  cardFromStorage: Record<string, unknown>
): DisplayableCard | null {
  if (
    !cardFromStorage ||
    typeof cardFromStorage.id !== "string" ||
    typeof cardFromStorage.type !== "string" || // This 'type' is used as CardType
    typeof cardFromStorage.symbol !== "string"
  ) {
    // It's good practice to warn about invalid data structures if they are encountered.
    console.warn(
      "[cardRehydration] Invalid card structure in local storage, skipping rehydration for:",
      cardFromStorage
    );
    return null;
  }

  // Cast the string 'type' from storage to your CardType union for use with the registry.
  const cardType = cardFromStorage.type as CardType;
  const specificRehydrator = cardRehydratorRegistry.get(cardType);

  if (!specificRehydrator) {
    console.warn(
      `[cardRehydration] No rehydrator registered for card type "${cardType}". Skipping card ID: ${cardFromStorage.id}`
    );
    return null;
  }

  // Ensure createdAt is a number. parseTimestampSafe handles various input types.
  // If cardFromStorage.createdAt is undefined or invalid, finalCreatedAt defaults to Date.now().
  const parsedCreatedAt = parseTimestampSafe(cardFromStorage.createdAt);
  const finalCreatedAt = parsedCreatedAt ?? Date.now();

  const commonProps: CommonCardPropsForRehydration = {
    id: cardFromStorage.id as string, // Already validated as string
    symbol: cardFromStorage.symbol as string, // Already validated as string
    isFlipped:
      typeof cardFromStorage.isFlipped === "boolean"
        ? cardFromStorage.isFlipped
        : false, // Default to false if not a boolean
    createdAt: finalCreatedAt,
    companyName: (cardFromStorage.companyName as string | undefined) ?? null, // Ensure null if not present
    logoUrl: (cardFromStorage.logoUrl as string | undefined) ?? null, // Ensure null if not present
  };

  try {
    const concreteCardData = specificRehydrator(cardFromStorage, commonProps);

    if (!concreteCardData) {
      // This warning helps identify if a specific rehydrator fails internally.
      console.warn(
        `[cardRehydration] Specific rehydrator for type "${cardType}" returned null for card ID: ${commonProps.id}`
      );
      return null;
    }

    // Combine the rehydrated concrete data with common stateful properties like isFlipped.
    const displayableCard: DisplayableCard = {
      ...concreteCardData,
      isFlipped: commonProps.isFlipped,
    };
    return displayableCard;
  } catch (error) {
    // Catching errors within a specific rehydrator is crucial.
    console.error(
      `[cardRehydration] Error during specific rehydration for type "${cardType}", card ID: ${commonProps.id}:`,
      error
    );
    return null;
  }
}
