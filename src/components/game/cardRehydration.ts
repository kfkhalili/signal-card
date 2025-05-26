// src/components/game/cardRehydration.ts
import type {
  DisplayableCard,
  DisplayableCardState,
  ConcreteCardData,
} from "@/components/game/types";
import { parseTimestampSafe } from "@/lib/formatters";

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

export function rehydrateCardFromStorage(
  cardFromStorage: Record<string, unknown>
): DisplayableCard | null {
  if (
    !cardFromStorage ||
    typeof cardFromStorage.id !== "string" ||
    typeof cardFromStorage.type !== "string" ||
    typeof cardFromStorage.symbol !== "string"
  ) {
    console.warn(
      "Invalid card structure in local storage, skipping rehydration for:",
      cardFromStorage
    );
    return null;
  }

  const cardType = cardFromStorage.type;
  const specificRehydrator = cardRehydratorRegistry.get(cardType);

  if (!specificRehydrator) {
    console.warn(
      `No rehydrator registered for card type "${cardType}". Skipping card ID: ${cardFromStorage.id}`
    );
    return null;
  }

  const parsedCreatedAt = parseTimestampSafe(cardFromStorage.createdAt);
  const finalCreatedAt = parsedCreatedAt ?? Date.now();

  const commonProps: CommonCardPropsForRehydration = {
    id: cardFromStorage.id,
    symbol: cardFromStorage.symbol,
    isFlipped:
      typeof cardFromStorage.isFlipped === "boolean"
        ? cardFromStorage.isFlipped
        : false,
    createdAt: finalCreatedAt,
    companyName: (cardFromStorage.companyName as string | undefined) ?? null,
    logoUrl: (cardFromStorage.logoUrl as string | undefined) ?? null,
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
      ...concreteCardData,
      isFlipped: commonProps.isFlipped,
    } as DisplayableCard;
  } catch (error) {
    console.error(
      `Error during specific rehydration for type "${cardType}", card ID: ${commonProps.id}:`,
      error
    );
    return null;
  }
}
