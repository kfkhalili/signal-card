// src/components/game/cards/custom-card/customCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type { CustomCardData } from "./custom-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";

interface StoredCustomCardObject {
  narrative?: string;
  items?: SelectedDataItem[];
  backData?: Partial<BaseCardBackData>;
}

const rehydrateCustomCardInstance: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>,
  commonProps: CommonCardPropsForRehydration
): CustomCardData | null => {
  const stored = cardFromStorage as StoredCustomCardObject;

  const rehydratedBackData: BaseCardBackData = {
    description:
      stored.backData?.description ||
      `A custom static card with selected data points.`,
  };

  return {
    ...commonProps,
    type: "custom",
    narrative: stored.narrative ?? "Custom Card",
    items: stored.items ?? [],
    backData: rehydratedBackData,
    websiteUrl: null, // Custom cards don't have a website
  };
};

registerCardRehydrator("custom", rehydrateCustomCardInstance);
