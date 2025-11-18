// src/components/game/cardUpdateHandler.types.ts
import type { ToastFunctionType } from "@/hooks/use-toast";
import type {
  DisplayableCard,
  ConcreteCardData,
} from "@/components/game/types";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";

/**
 * Defines known event types for card data updates.
 */
export type CardUpdateEventType =
  | "LIVE_QUOTE_UPDATE"
  | "STATIC_PROFILE_UPDATE"
  | "EXCHANGE_STATUS_UPDATE"
  | "FINANCIAL_STATEMENT_UPDATE"
  | "SHARES_FLOAT_UPDATE"
  | "RATIOS_TTM_UPDATE"
  | "DIVIDEND_ROW_UPDATE"
  | "REVENUE_SEGMENTATION_UPDATE"
  | "GRADES_HISTORICAL_UPDATE"
  | "EXCHANGE_VARIANTS_UPDATE";

/**
 * Context provided to card update handler functions.
 */
export interface CardUpdateContext {
  toast: ToastFunctionType | undefined;
}

/**
 * Defines the signature for a function that handles a specific type of data update
 * for a particular card type.
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

// Type alias for the handler stored in the registry.
// TCardData is effectively generalized to ConcreteCardData for storage,
// and TUpdatePayload is unknown.
type StoredCardUpdateHandler = CardUpdateHandler<ConcreteCardData, unknown>;

const cardUpdateHandlerRegistry = new Map<
  CardType,
  Map<CardUpdateEventType, StoredCardUpdateHandler>
>();

export function registerCardUpdateHandler<
  TCardData extends ConcreteCardData,
  TUpdatePayload
>(
  cardType: CardType,
  eventType: CardUpdateEventType,
  handler: CardUpdateHandler<TCardData, TUpdatePayload> // This is the specific handler
): void {
  if (!cardUpdateHandlerRegistry.has(cardType)) {
    cardUpdateHandlerRegistry.set(cardType, new Map());
  }
  const eventMap = cardUpdateHandlerRegistry.get(cardType);
  // The 'handler' has a specific TCardData (e.g., PriceCardData).
  // StoredCardUpdateHandler expects ConcreteCardData as its first parameter.
  // Due to contravariance of function parameter types, a direct cast from
  // CardUpdateHandler<PriceCardData, X> to CardUpdateHandler<ConcreteCardData, Y>
  // is unsafe if PriceCardData is a subtype of ConcreteCardData.
  // The 'as unknown as StoredCardUpdateHandler' cast bypasses this check.
  // We assert this is safe because getCardUpdateHandler is expected to be used
  // in a context where the specific TCardData is known (e.g., via cardType).
  eventMap?.set(eventType, handler as unknown as StoredCardUpdateHandler);
}

export function getCardUpdateHandler(
  cardType: CardType,
  eventType: CardUpdateEventType
): StoredCardUpdateHandler | undefined {
  return cardUpdateHandlerRegistry.get(cardType)?.get(eventType);
}
