// src/components/game/types.ts
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";
import type { RevenueCardData } from "@/components/game/cards/revenue-card/revenue-card.types";
import type { SolvencyCardData } from "./cards/solvency-card/solvency-card.types";
import type { CashUseCardData } from "./cards/cash-use-card/cash-use-card.types";
import type { KeyRatiosCardData } from "./cards/key-ratios-card/key-ratios-card.types";

export type ConcreteCardData =
  | PriceCardData
  | ProfileCardData
  | RevenueCardData
  | SolvencyCardData
  | CashUseCardData
  | KeyRatiosCardData;

export interface DisplayableCardState {
  isFlipped: boolean;
}

// DisplayableCard combines the core data of a card with its UI/interaction state
export type DisplayableCard = ConcreteCardData & DisplayableCardState;
