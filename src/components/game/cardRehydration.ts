// src/components/game/cardRehydration.ts
import type {
  DisplayableCard,
  DisplayableCardState,
  ConcreteCardData,
} from "@/components/game/types";
import { parseTimestampSafe } from "@/lib/formatters";
import type { CardType } from "./cards/base-card/base-card.types";
import { Result } from "neverthrow";

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

const cardRehydratorRegistry = new Map<CardType, SpecificCardRehydrator>();

export function registerCardRehydrator(
  cardType: CardType,
  rehydrator: SpecificCardRehydrator
): void {
  if (cardRehydratorRegistry.has(cardType)) {
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
    typeof cardFromStorage.type !== "string" ||
    typeof cardFromStorage.symbol !== "string"
  ) {
    console.warn(
      "[cardRehydration] Invalid card structure in local storage, skipping rehydration for:",
      cardFromStorage
    );
    return null;
  }

  const cardType = cardFromStorage.type as CardType;
  const specificRehydrator = cardRehydratorRegistry.get(cardType);

  if (!specificRehydrator) {
    console.warn(
      `[cardRehydration] No rehydrator registered for card type "${cardType}". Skipping card ID: ${cardFromStorage.id}`
    );
    return null;
  }

  const parsedCreatedAt = parseTimestampSafe(cardFromStorage.createdAt);
  const finalCreatedAt = parsedCreatedAt ?? Date.now();

  const commonProps: CommonCardPropsForRehydration = {
    id: cardFromStorage.id as string,
    symbol: cardFromStorage.symbol as string,
    isFlipped:
      typeof cardFromStorage.isFlipped === "boolean"
        ? cardFromStorage.isFlipped
        : false,
    createdAt: finalCreatedAt,
    companyName: (cardFromStorage.companyName as string | undefined) ?? null,
    logoUrl: (cardFromStorage.logoUrl as string | undefined) ?? null,
  };

  const rehydrationResult = Result.fromThrowable(
    () => specificRehydrator(cardFromStorage, commonProps),
    (e) => e as Error
  )();

  return rehydrationResult.match(
    (concreteCardData) => {
      if (!concreteCardData) {
        console.warn(
          `[cardRehydration] Specific rehydrator for type "${cardType}" returned null for card ID: ${commonProps.id}`
        );
        return null;
      }

      const displayableCard: DisplayableCard = {
        ...concreteCardData,
        isFlipped: commonProps.isFlipped,
      };
      return displayableCard;
    },
    (error) => {
      console.error(
        `[cardRehydration] Error during specific rehydration for type "${cardType}", card ID: ${commonProps.id}:`,
        error
      );
      return null;
    }
  );
}
