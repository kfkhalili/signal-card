// src/components/game/cards/rendererRegistryInitializer.tsx
import {
  registerCardRenderer,
  type RegisteredCardRendererProps,
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

import type { ConcreteCardData } from "@/components/game/types";
import type { OnGenericInteraction } from "./base-card/base-card.types";

// Helper to correctly type the props for the generic renderer within the registration
const createTypedGenericRenderer = <TCardData extends ConcreteCardData>(
  ContentComponent: React.ComponentType<{
    cardData: TCardData;
    isBackFace: boolean;
    onGenericInteraction: OnGenericInteraction;
  }>,
  // This parameter directly receives the string literal like "price", "profile", etc.
  expectedCardTypeForThisRenderer: TCardData["type"]
): React.ComponentType<RegisteredCardRendererProps> => {
  // This inner component is what gets registered. Its props are RegisteredCardRendererProps.
  const SpecificRendererComponent = (props: RegisteredCardRendererProps) => {
    // When GenericCardContainerRenderer is used here, its TCardDataType generic parameter
    // will be inferred as TCardData from the ContentComponent and expectedCardTypeForThisRenderer props.
    return (
      <GenericCardContainerRenderer // NO <TCardData> or any other generic type argument here
        {...props} // props.cardData here is DisplayableCard
        ContentComponent={ContentComponent}
        expectedCardType={expectedCardTypeForThisRenderer} // Pass the string literal
      />
    );
  };
  return SpecificRendererComponent;
};

// Ensure the second argument here is the exact string literal for the card type
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
