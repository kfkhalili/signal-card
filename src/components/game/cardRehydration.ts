// src/components/game/cardRehydration.ts
import type {
  DisplayableCard,
  DisplayableCardState,
  ConcreteCardData, // To type the output of specific rehydrators
} from "@/components/game/types"; // Assuming ConcreteCardData is a union of all specific card data types (PriceCardData, ProfileCardData, etc.)

// Properties common to all cards that the main rehydrator can extract
// and pass to specific rehydrators.
export interface CommonCardPropsForRehydration extends DisplayableCardState {
  id: string;
  symbol: string;
  createdAt: number; // Already parsed and validated
  companyName?: string | null;
  logoUrl?: string | null;
  // cardFromStorage: any; // The raw object from storage, if needed by specific rehydrators for deeply nested or complex fields
}

// Interface for a specific card type's rehydration logic
export type SpecificCardRehydrator = (
  cardDataFromStorage: any, // The raw 'cardFromStorage' object
  commonProps: CommonCardPropsForRehydration
) => ConcreteCardData | null; // Returns the core data part, commonProps adds DisplayableCardState

// Registry to hold rehydrators
const cardRehydratorRegistry = new Map<string, SpecificCardRehydrator>();

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

// Helper to safely parse timestamps (from string or number to number | null)
function parseTimestamp(timestamp: any): number | null {
  if (typeof timestamp === "string") {
    const parsed = new Date(timestamp).getTime();
    return isNaN(parsed) ? null : parsed;
  }
  if (typeof timestamp === "number" && !isNaN(timestamp)) {
    return timestamp > 0 ? timestamp : null; // Ensure positive timestamp
  }
  return null;
}

export function rehydrateCardFromStorage(
  cardFromStorage: any
): DisplayableCard | null {
  if (
    !cardFromStorage ||
    typeof cardFromStorage.id !== "string" ||
    !cardFromStorage.type || // type is crucial for dispatching
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
  };

  try {
    const concreteCardData = specificRehydrator(cardFromStorage, commonProps);

    if (!concreteCardData) {
      console.warn(
        `Specific rehydrator for type "${cardType}" returned null for card ID: ${commonProps.id}`
      );
      return null;
    }

    // Combine the rehydrated concrete data with the common stateful properties
    return {
      ...concreteCardData, // This is PriceCardData, ProfileCardData, etc.
      // Common props already include DisplayableCardState (isFlipped) and other top-level fields
      id: commonProps.id,
      symbol: commonProps.symbol,
      createdAt: commonProps.createdAt,
      companyName: commonProps.companyName,
      logoUrl: commonProps.logoUrl,
      isFlipped: commonProps.isFlipped,
      type: cardType, // Ensure type is correctly set from the rehydrated data or commonProps
    } as DisplayableCard; // Cast to the final union type
  } catch (error) {
    console.error(
      `Error during specific rehydration for type "${cardType}", card ID: ${commonProps.id}:`,
      error
    );
    return null;
  }
}
