/**
 * src/app/components/types.ts
 * Defines application-level aggregate types for game cards.
 */

// 1. Import all concrete, specific card data structures.
// Ensure these paths are correct and that each imported type extends BaseCardData.
import type {
  PriceCardData,
  PriceCardSnapshotData,
} from "@/components/game/cards/price-card/price-card.types";
// Example: import type { TrendCardData } from "./game/cards/trend-card/trend-card.types";

// 2. Create a union of all currently supported *concrete* card data types.
// This is the primary type a component like GameCard will use for the `card.data` prop.
// As you implement more card types (e.g., TrendCardData), add them to this union.
export type ConcreteCardData = PriceCardData | PriceCardSnapshotData;
// | TrendCardData; // Example for future expansion

// 3. Define UI-specific state that can be associated with any displayable card.
export interface DisplayableCardState {
  isFlipped: boolean;
  // Consider other UI states: isHighlighted?: boolean; order?: number; isDisabled?: boolean;
}

// 4. Combine concrete card data with its UI state.
// This is likely the type for a card object as managed in lists or passed to wrapper components.
export type DisplayableCard = ConcreteCardData & DisplayableCardState;

// 5. Optional: More specific aliases for enhanced readability if needed.

/**
 * Alias for live, interactive price card data combined with UI state.
 * Note: PriceCardData already includes its specific data. LivePriceCardDataType was redundant if it's just PriceCardData.
 */
export type DisplayableLivePriceCard = PriceCardData & DisplayableCardState;

/**
 * Alias for discovered signal/snapshot card data combined with UI state.
 */
export type DisplayableDiscoveredSignal = PriceCardSnapshotData &
  DisplayableCardState;

// It's generally recommended to import BaseCardData or CardType directly from
// 'app/components/game/cards/base-card/base-card.types.ts' where needed,
// rather than re-aliasing them here, to maintain a single source of truth.
