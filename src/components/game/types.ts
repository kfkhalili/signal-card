// src/components/game/types.ts
import type {
  PriceCardData,
  // PriceCardSnapshotData, // Remove if no longer used on dashboard
} from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";

// Add other concrete card data types here as they are created
// e.g. import type { NewsCardData } from "./cards/news-card/news-card.types";

export type ConcreteCardData =
  | PriceCardData
  // | PriceCardSnapshotData // Remove if not part of active dashboard display
  | ProfileCardData;
// | NewsCardData // Example

export interface DisplayableCardState {
  isFlipped: boolean;
  // Consider other UI states: isHighlighted?: boolean; order?: number; isDisabled?: boolean;
}

export type DisplayableCard = ConcreteCardData & DisplayableCardState;

// Specific aliases for clarity. Remove snapshot alias if type is removed.
export type DisplayableLivePriceCard = PriceCardData & DisplayableCardState;
// export type DisplayablePriceSnapshotCard = PriceCardSnapshotData & DisplayableCardState; // Remove
export type DisplayableProfileCard = ProfileCardData & DisplayableCardState;
