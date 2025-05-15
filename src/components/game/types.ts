// src/components/game/types.ts
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";

export type ConcreteCardData = PriceCardData | ProfileCardData;

// UI-specific state AND COMMON state like rarity for ANY displayable card.
// This state is typically managed by the component holding the card (e.g., ActiveCardsSection or SnapshotHistoryItem)
// and passed down to GameCard.
export interface DisplayableCardState {
  isFlipped: boolean;
  currentRarity?: string | null;
  rarityReason?: string | null;

  // Like status & count
  isLikedByCurrentUser?: boolean;
  currentUserLikeId?: string; // ID of the like record if current user liked it
  likeCount?: number; // Global like count for the associated snapshot

  // Comment count
  commentCount?: number; // Global comment count for the associated snapshot

  // Collection/Save status & count
  isSavedByCurrentUser?: boolean; // Has the current user saved/collected this snapshot?
  collectionCount?: number; // Global collection/save count for the associated snapshot
}

// DisplayableCard combines the core data of a card with its UI/interaction state
export type DisplayableCard = ConcreteCardData & DisplayableCardState;

// Specific aliases for convenience, inheriting all properties
export type DisplayableLivePriceCard = PriceCardData & DisplayableCardState;
export type DisplayableProfileCard = ProfileCardData & DisplayableCardState;
