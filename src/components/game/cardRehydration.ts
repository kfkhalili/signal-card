// src/components/game/cardRehydration.ts
import type {
  DisplayableCard,
  DisplayableCardState,
  ConcreteCardData,
} from "@/components/game/types";
import { RARITY_LEVELS } from "@/components/game/rarityCalculator";
import { parseTimestampSafe } from "@/lib/formatters";

export interface CommonCardPropsForRehydration extends DisplayableCardState {
  id: string;
  symbol: string;
  createdAt: number;
  companyName?: string | null;
  logoUrl?: string | null;
}

export type SpecificCardRehydrator = (
  cardDataFromStorage: any, // The raw object from localStorage for this card
  commonProps: CommonCardPropsForRehydration // Common properties including initialized rarity
) => ConcreteCardData | null; // Specific rehydrator returns the core data part

// Registry to hold rehydration functions for each card type
const cardRehydratorRegistry = new Map<string, SpecificCardRehydrator>();

/**
 * Registers a rehydration function for a specific card type.
 * This function should be called by each card type's rehydrator module.
 * @param cardType The string identifier for the card type (e.g., "price", "profile").
 * @param rehydrator The function that takes raw storage data and common props, returning ConcreteCardData.
 */
export function registerCardRehydrator(
  cardType: string,
  rehydrator: SpecificCardRehydrator
): void {
  if (cardRehydratorRegistry.has(cardType)) {
    console.warn(
      `Rehydrator for card type "${cardType}" is being overwritten.`
    );
  }
  cardRehydratorRegistry.set(cardType, rehydrator);
}

/**
 * Takes a raw object from local storage and attempts to reconstruct
 * a fully typed DisplayableCard using registered rehydrators.
 * @param cardFromStorage The raw object retrieved from local storage.
 * @returns A DisplayableCard object or null if rehydration fails.
 */
export function rehydrateCardFromStorage(
  cardFromStorage: any
): DisplayableCard | null {
  if (
    !cardFromStorage ||
    typeof cardFromStorage.id !== "string" ||
    !cardFromStorage.type ||
    !cardFromStorage.symbol
  ) {
    console.warn(
      "Invalid card structure in local storage, skipping rehydration for:",
      cardFromStorage
    );
    return null;
  }

  const cardType = cardFromStorage.type as string;
  const specificRehydrator = cardRehydratorRegistry.get(cardType);

  if (!specificRehydrator) {
    console.warn(
      `No rehydrator registered for card type "${cardType}". Skipping card ID: ${cardFromStorage.id}`
    );
    // Optionally, return a basic representation or null
    // Returning null seems safer to avoid rendering broken cards.
    return null;
  }

  const parsedCreatedAt = parseTimestampSafe(cardFromStorage.createdAt);
  const finalCreatedAt = parsedCreatedAt ?? Date.now();

  // Prepare common properties, including UI state and rarity read from storage
  const commonProps: CommonCardPropsForRehydration = {
    id: cardFromStorage.id,
    symbol: cardFromStorage.symbol,
    isFlipped:
      typeof cardFromStorage.isFlipped === "boolean"
        ? cardFromStorage.isFlipped
        : false,
    createdAt: finalCreatedAt,
    companyName: cardFromStorage.companyName ?? null,
    logoUrl: cardFromStorage.logoUrl ?? null,
    currentRarity: cardFromStorage.currentRarity || RARITY_LEVELS.COMMON,
    rarityReason: cardFromStorage.rarityReason || null,
  };

  try {
    // Call the specific rehydrator to get the core data part (PriceCardData, ProfileCardData, etc.)
    const concreteCardData = specificRehydrator(cardFromStorage, commonProps);

    if (!concreteCardData) {
      console.warn(
        `Specific rehydrator for type "${cardType}" returned null for card ID: ${commonProps.id}`
      );
      return null;
    }

    // Combine the ConcreteCardData from the specific rehydrator
    // with the DisplayableCardState derived from commonProps.
    // Ensure ConcreteCardData properties (like type, symbol, etc.) take precedence
    // if they were potentially modified by the rehydrator, then add UI state.
    return {
      ...concreteCardData, // Has id, type, symbol, createdAt, companyName, logoUrl, face/back/static/live data
      // Explicitly add/override the state fields from commonProps
      isFlipped: commonProps.isFlipped,
      currentRarity: commonProps.currentRarity,
      rarityReason: commonProps.rarityReason,
    } as DisplayableCard; // Assert the final type
  } catch (error) {
    console.error(
      `Error during specific rehydration for type "${cardType}", card ID: ${commonProps.id}:`,
      error
    );
    return null;
  }
}
