// src/components/game/cardLiveDataDefaults.ts
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { PriceCardLiveData } from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardLiveData } from "@/components/game/cards/profile-card/profile-card.types";
// Import LiveData types for other cards as they are created in the future
// e.g., import type { NewsCardLiveData } from "@/components/game/cards/news-card/news-card.types";

// Union type for all possible LiveData structures
export type LiveDataDefaults =
  | PriceCardLiveData
  | ProfileCardLiveData /* | NewsCardLiveData | etc. */;

// Registry: Maps a CardType to a function that returns its default LiveData structure
const liveDataInitializers = new Map<CardType, () => LiveDataDefaults>();

/**
 * Registers a function that provides the default liveData structure for a given card type.
 * @param cardType The type of the card.
 * @param initializer A function that returns the default liveData object.
 */
export function registerLiveDataInitializer(
  cardType: CardType,
  initializer: () => LiveDataDefaults
): void {
  if (liveDataInitializers.has(cardType)) {
    console.warn(
      `LiveData initializer for type "${cardType}" is being overwritten.`
    );
  }
  liveDataInitializers.set(cardType, initializer);
}

/**
 * Retrieves the liveData initializer function for a given card type.
 * @param cardType The type of the card.
 * @returns The initializer function, or undefined if not found.
 */
export function getLiveDataInitializer(
  cardType: CardType
): (() => LiveDataDefaults) | undefined {
  return liveDataInitializers.get(cardType);
}

// --- Register initializers for existing and future card types ---

// For PriceCard
registerLiveDataInitializer(
  "price",
  (): PriceCardLiveData => ({
    timestamp: null,
    price: null,
    dayChange: null,
    changePercentage: null,
    dayHigh: null,
    dayLow: null,
    dayOpen: null,
    previousClose: null,
    volume: null,
    yearHigh: null,
    yearLow: null,
    marketCap: null,
    sma50d: null,
    sma200d: null,
  })
);

// For ProfileCard
registerLiveDataInitializer(
  "profile",
  (): ProfileCardLiveData => ({
    price: null,
  })
);

/**
 * A generic fallback LiveData structure to be used ONLY when a specific initializer is missing.
 * This indicates a setup error. We use ProfileCardLiveData as it's the simplest.
 */
export const GENERIC_FALLBACK_LIVE_DATA: ProfileCardLiveData = { price: null };

// Example for a future NewsCard that might not have liveData, or a different structure
// registerLiveDataInitializer("news", (): NewsCardLiveData => ({
//   headlineSource: null,
//   articleCount: 0,
// }));
