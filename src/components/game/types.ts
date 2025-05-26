// src/components/game/types.ts
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";

export type ConcreteCardData = PriceCardData | ProfileCardData;

export interface DisplayableCardState {
  isFlipped: boolean;
}

// DisplayableCard combines the core data of a card with its UI/interaction state
export type DisplayableCard = ConcreteCardData & DisplayableCardState;

// Specific aliases for convenience, inheriting all properties
export type DisplayableLivePriceCard = PriceCardData & DisplayableCardState;
