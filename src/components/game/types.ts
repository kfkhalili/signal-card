// src/components/game/types.ts
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";
import type { RevenueCardData } from "@/components/game/cards/revenue-card/revenue-card.types";
import type { SolvencyCardData } from "./cards/solvency-card/solvency-card.types";
import type { CashUseCardData } from "./cards/cash-use-card/cash-use-card.types";
import type { KeyRatiosCardData } from "./cards/key-ratios-card/key-ratios-card.types";
import type { DividendsHistoryCardData } from "./cards/dividends-history-card/dividends-history-card.types";
import type { RevenueBreakdownCardData } from "./cards/revenue-breakdown-card/revenue-breakdown-card.types";
import type { AnalystGradesCardData } from "./cards/analyst-grades-card/analyst-grades-card.types";
import type { ExchangeVariantsCardData } from "./cards/exchange-variants-card/exchange-variants-card.types";
import type { CustomCardData } from "./cards/custom-card/custom-card.types";

export type ConcreteCardData =
  | PriceCardData
  | ProfileCardData
  | RevenueCardData
  | SolvencyCardData
  | CashUseCardData
  | KeyRatiosCardData
  | DividendsHistoryCardData
  | RevenueBreakdownCardData
  | AnalystGradesCardData
  | ExchangeVariantsCardData
  | CustomCardData;

export interface DisplayableCardState {
  isFlipped: boolean;
}

// DisplayableCard combines the core data of a card with its UI/interaction state
export type DisplayableCard = ConcreteCardData & DisplayableCardState;
