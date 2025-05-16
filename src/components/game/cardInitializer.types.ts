// src/components/game/cardInitializer.types.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToastFunctionType } from "@/hooks/use-toast";
import type { DisplayableCard } from "@/components/game/types";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";

/**
 * Context provided to card initializer functions.
 */
export interface CardInitializationContext {
  symbol: string;
  supabase: SupabaseClient;
  toast: ToastFunctionType;
  /** Optional: Provides access to currently active cards, which might be needed for context
   * (e.g., a PriceCard initializer might want to check for an existing ProfileCard
   * for the same symbol to copy companyName or logoUrl).
   */
  activeCards?: DisplayableCard[];
}

/**
 * Defines the signature for a function that can initialize a specific type of card.
 * It should fetch necessary data and return a DisplayableCard or null if initialization fails.
 */
export type CardInitializer = (
  context: CardInitializationContext
) => Promise<DisplayableCard | null>;

// Registry to hold initializer functions for each card type
const cardInitializerRegistry = new Map<CardType, CardInitializer>();

/**
 * Registers an initializer function for a specific card type.
 * This should be called by each card type's utility module.
 * @param cardType - The string identifier for the card type (e.g., "price", "profile").
 * @param initializer - The async function to initialize the card.
 */
export function registerCardInitializer(
  cardType: CardType,
  initializer: CardInitializer
): void {
  if (cardInitializerRegistry.has(cardType)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `Card initializer for type "${cardType}" is being overwritten.`
      );
    }
  }
  cardInitializerRegistry.set(cardType, initializer);
}

/**
 * Retrieves the registered initializer function for a given card type.
 * @param cardType - The card type.
 * @returns The initializer function, or undefined if not found.
 */
export function getCardInitializer(
  cardType: CardType
): CardInitializer | undefined {
  return cardInitializerRegistry.get(cardType);
}
