// src/components/game/cardRehydration.ts
import type {
  DisplayableCard,
  DisplayableCardState,
  ConcreteCardData,
} from "@/components/game/types";
import { RARITY_LEVELS } from "@/components/game/rarityCalculator";

export interface CommonCardPropsForRehydration extends DisplayableCardState {
  id: string;
  symbol: string;
  createdAt: number;
  companyName?: string | null;
  logoUrl?: string | null;
  // currentRarity and rarityReason are part of DisplayableCardState
  // and will be initialized when commonProps is created.
}

export type SpecificCardRehydrator = (
  cardDataFromStorage: any, // The raw object from localStorage for this card
  commonProps: CommonCardPropsForRehydration // Common properties including initialized rarity
) => ConcreteCardData | null; // Specific rehydrator returns the core data part

// Define the registry BEFORE any function that uses it is exported or called.
const cardRehydratorRegistry = new Map<string, SpecificCardRehydrator>();

export function registerCardRehydrator(
  cardType: string,
  rehydrator: SpecificCardRehydrator
): void {
  // Now cardRehydratorRegistry is guaranteed to be initialized before this function is called
  // by external modules.
  if (cardRehydratorRegistry.has(cardType)) {
    console.warn(
      `Rehydrator for card type "${cardType}" is being overwritten.`
    );
  }
  cardRehydratorRegistry.set(cardType, rehydrator);
}

function parseTimestamp(timestamp: any): number | null {
  if (typeof timestamp === "string") {
    const parsed = new Date(timestamp).getTime();
    return isNaN(parsed) ? null : parsed;
  }
  if (typeof timestamp === "number" && !isNaN(timestamp)) {
    return timestamp > 0 ? timestamp : null;
  }
  return null;
}

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
    return null;
  }

  const parsedCreatedAt = parseTimestamp(cardFromStorage.createdAt);
  const finalCreatedAt = parsedCreatedAt ?? Date.now();

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
    const concreteCardData = specificRehydrator(cardFromStorage, commonProps);

    if (!concreteCardData) {
      console.warn(
        `Specific rehydrator for type "${cardType}" returned null for card ID: ${commonProps.id}`
      );
      return null;
    }

    return {
      // Start with ConcreteCardData properties (which include id, symbol, type etc. from specific rehydrator)
      ...concreteCardData,
      // Ensure DisplayableCardState properties from commonProps are correctly merged/override
      isFlipped: commonProps.isFlipped,
      currentRarity: commonProps.currentRarity,
      rarityReason: commonProps.rarityReason,
    } as DisplayableCard;
  } catch (error) {
    console.error(
      `Error during specific rehydration for type "${cardType}", card ID: ${commonProps.id}:`,
      error
    );
    return null;
  }
}
