// src/components/game/cardInitializer.types.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToastFunctionType } from "@/hooks/use-toast";
import type { DisplayableCard } from "@/components/game/types";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { Result } from "neverthrow";

export interface CardInitializationContext {
  symbol: string;
  supabase: SupabaseClient;
  toast: ToastFunctionType;
  activeCards?: DisplayableCard[];
}

export type CardInitializer = (
  context: CardInitializationContext
) => Promise<Result<DisplayableCard, Error>>;

const cardInitializerRegistry = new Map<CardType, CardInitializer>();

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

export function getCardInitializer(
  cardType: CardType
): CardInitializer | undefined {
  return cardInitializerRegistry.get(cardType);
}
