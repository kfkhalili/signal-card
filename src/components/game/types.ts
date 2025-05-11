/**
 * src/components/game/types.ts
 * Defines application-level aggregate types for game cards.
 */

import type {
  PriceCardData,
  PriceCardSnapshotData,
} from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types"; // Import the new ProfileCardData

// Add ProfileCardData to this union.
export type ConcreteCardData =
  | PriceCardData
  | PriceCardSnapshotData
  | ProfileCardData; // Added ProfileCardData

// UI-specific state that can be associated with any displayable card.
export interface DisplayableCardState {
  isFlipped: boolean;
  // Consider other UI states: isHighlighted?: boolean; order?: number; isDisabled?: boolean;
}

// Combine concrete card data with its UI state.
export type DisplayableCard = ConcreteCardData & DisplayableCardState;

// Optional: More specific aliases (can be useful for clarity)

export type DisplayableLivePriceCard = PriceCardData & DisplayableCardState;
export type DisplayablePriceSnapshotCard = PriceCardSnapshotData &
  DisplayableCardState;
export type DisplayableProfileCard = ProfileCardData & DisplayableCardState;
