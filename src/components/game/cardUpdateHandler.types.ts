// src/components/game/cardUpdateHandler.types.ts
import type { ToastFunctionType } from "@/hooks/use-toast";
import type {
  DisplayableCard,
  ConcreteCardData,
} from "@/components/game/types";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";

// Import specific payload types that handlers will now receive
import type { ProfileDBRow } from "@/hooks/useStockData"; // This is still correct for profile updates
import type { LiveQuoteIndicatorDBRow } from "@/lib/supabase/realtime-service"; // For live quote updates
import type { ExchangeMarketStatusRecord } from "@/types/market.types"; // For exchange status updates

/**
 * Defines known event types for card data updates.
 */
export type CardUpdateEventType =
  | "LIVE_QUOTE_UPDATE" // Expected Payload: LiveQuoteIndicatorDBRow
  | "STATIC_PROFILE_UPDATE" // Expected Payload: ProfileDBRow
  | "EXCHANGE_STATUS_UPDATE"; // Expected Payload: ExchangeMarketStatusRecord
// Add more event types as your application grows

/**
 * Context provided to card update handler functions.
 */
export interface CardUpdateContext {
  toast: ToastFunctionType;
  // Potentially add other context if handlers need it, e.g.:
  // activeCards?: DisplayableCard[]; // If an update needs to know about other cards
  // currentSymbol?: string;
}

/**
 * Defines the signature for a function that handles a specific type of data update
 * for a particular card type.
 *
 * @template TCardData - The specific ConcreteCardData type for the card.
 * @template TUpdatePayload - The type of the data payload for this event.
 *
 * @param currentCardConcreteData - The existing concrete data part of the card.
 * @param updatePayload - The new data payload relevant to the event.
 * @param currentDisplayableCard - The full current DisplayableCard object.
 * @param context - Shared utilities or context.
 * @returns The updated ConcreteCardData. If no relevant changes, return the original currentCardConcreteData.
 */
export type CardUpdateHandler<
  TCardData extends ConcreteCardData,
  TUpdatePayload
> = (
  currentCardConcreteData: TCardData,
  updatePayload: TUpdatePayload,
  currentDisplayableCard: DisplayableCard,
  context: CardUpdateContext
) => TCardData;

// --- Registry Implementation ---
const cardUpdateHandlerRegistry = new Map<
  CardType,
  Map<CardUpdateEventType, CardUpdateHandler<any, any>>
>();

export function registerCardUpdateHandler<
  TCardData extends ConcreteCardData,
  TUpdatePayload
>(
  cardType: CardType,
  eventType: CardUpdateEventType,
  handler: CardUpdateHandler<TCardData, TUpdatePayload>
): void {
  if (!cardUpdateHandlerRegistry.has(cardType)) {
    cardUpdateHandlerRegistry.set(cardType, new Map());
  }
  const eventMap = cardUpdateHandlerRegistry.get(cardType)!;

  if (eventMap.has(eventType)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `Card update handler for type "${cardType}" and event "${eventType}" is being overwritten.`
      );
    }
  }
  eventMap.set(eventType, handler as CardUpdateHandler<any, any>);
}

export function getCardUpdateHandler(
  cardType: CardType,
  eventType: CardUpdateEventType
): CardUpdateHandler<any, any> | undefined {
  return cardUpdateHandlerRegistry.get(cardType)?.get(eventType);
}
