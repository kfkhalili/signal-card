// src/components/game/types.ts
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";

export type ConcreteCardData = PriceCardData | ProfileCardData;

// UI-specific state AND COMMON state like rarity for ANY displayable card.
export interface DisplayableCardState {
  isFlipped: boolean;
  currentRarity?: string | null;
  rarityReason?: string | null;
}

export type DisplayableCard = ConcreteCardData & DisplayableCardState;

// Specific aliases will also inherit these
export type DisplayableLivePriceCard = PriceCardData & DisplayableCardState;
export type DisplayableProfileCard = ProfileCardData & DisplayableCardState;
