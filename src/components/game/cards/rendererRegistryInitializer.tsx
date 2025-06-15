// src/components/game/cards/rendererRegistryInitializer.tsx
import {
  registerCardRenderer,
  type RegisteredCardRendererProps,
  type SpecificCardContentComponent,
} from "@/components/game/cardRenderers";
import { GenericCardContainerRenderer } from "./GenericCardContainerRenderer";

// Import all specific Content components and their Data types
import { PriceCardContent } from "./price-card/PriceCardContent";
import type { PriceCardData } from "./price-card/price-card.types";

import { ProfileCardContent } from "./profile-card/ProfileCardContent";
import type { ProfileCardData } from "./profile-card/profile-card.types";

import { RevenueCardContent } from "./revenue-card/RevenueCardContent";
import type { RevenueCardData } from "./revenue-card/revenue-card.types";

import { SolvencyCardContent } from "./solvency-card/SolvencyCardContent";
import type { SolvencyCardData } from "./solvency-card/solvency-card.types";

import { CashUseCardContent } from "./cash-use-card/CashUseCardContent";
import type { CashUseCardData } from "./cash-use-card/cash-use-card.types";

import { KeyRatiosCardContent } from "./key-ratios-card/KeyRatiosCardContent";
import type { KeyRatiosCardData } from "./key-ratios-card/key-ratios-card.types";

import { DividendsHistoryCardContent } from "./dividends-history-card/DividendsHistoryCardContent";
import type { DividendsHistoryCardData } from "./dividends-history-card/dividends-history-card.types";

import { RevenueBreakdownCardContent } from "./revenue-breakdown-card/RevenueBreakdownCardContent";
import type { RevenueBreakdownCardData } from "./revenue-breakdown-card/revenue-breakdown-card.types";

import { AnalystGradesCardContent } from "./analyst-grades-card/AnalystGradesCardContent";
import type { AnalystGradesCardData } from "./analyst-grades-card/analyst-grades-card.types";

import { CustomCardContent } from "./custom-card/CustomCardContent";
import type { CustomCardData } from "./custom-card/custom-card.types";

import { ExchangeVariantsCardContent } from "./exchange-variants-card/ExchangeVariantsCardContent";
import type { ExchangeVariantsCardData } from "./exchange-variants-card/exchange-variants-card.types";

import type { ConcreteCardData } from "@/components/game/types";

// Helper to correctly type the props for the generic renderer within the registration
const createTypedGenericRenderer = <TCardData extends ConcreteCardData>(
  ContentComponent: SpecificCardContentComponent<TCardData>,
  expectedCardTypeForThisRenderer: TCardData["type"]
): React.ComponentType<RegisteredCardRendererProps> => {
  const SpecificRendererComponent = (props: RegisteredCardRendererProps) => {
    return (
      <GenericCardContainerRenderer<TCardData>
        {...props}
        ContentComponent={ContentComponent}
        expectedCardType={expectedCardTypeForThisRenderer}
      />
    );
  };
  return SpecificRendererComponent;
};

registerCardRenderer(
  "price",
  createTypedGenericRenderer<PriceCardData>(PriceCardContent, "price")
);
registerCardRenderer(
  "profile",
  createTypedGenericRenderer<ProfileCardData>(ProfileCardContent, "profile")
);
registerCardRenderer(
  "revenue",
  createTypedGenericRenderer<RevenueCardData>(RevenueCardContent, "revenue")
);
registerCardRenderer(
  "solvency",
  createTypedGenericRenderer<SolvencyCardData>(SolvencyCardContent, "solvency")
);
registerCardRenderer(
  "cashuse",
  createTypedGenericRenderer<CashUseCardData>(CashUseCardContent, "cashuse")
);
registerCardRenderer(
  "keyratios",
  createTypedGenericRenderer<KeyRatiosCardData>(
    KeyRatiosCardContent,
    "keyratios"
  )
);
registerCardRenderer(
  "dividendshistory",
  createTypedGenericRenderer<DividendsHistoryCardData>(
    DividendsHistoryCardContent,
    "dividendshistory"
  )
);
registerCardRenderer(
  "revenuebreakdown",
  createTypedGenericRenderer<RevenueBreakdownCardData>(
    RevenueBreakdownCardContent,
    "revenuebreakdown"
  )
);
registerCardRenderer(
  "analystgrades",
  createTypedGenericRenderer<AnalystGradesCardData>(
    AnalystGradesCardContent,
    "analystgrades"
  )
);
registerCardRenderer(
  "custom",
  createTypedGenericRenderer<CustomCardData>(CustomCardContent, "custom")
);

registerCardRenderer(
  "exchangevariants",
  createTypedGenericRenderer<ExchangeVariantsCardData>(
    ExchangeVariantsCardContent,
    "exchangevariants"
  )
);
