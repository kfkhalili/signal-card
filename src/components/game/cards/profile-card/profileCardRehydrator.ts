// src/components/game/cards/profile-card/profileCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
// import type { ConcreteCardData } from "@/components/game/types"; // Not directly used here
import type {
  ProfileCardData,
  // ProfileCardStaticData, // Assumed to be correctly structured in localStorage
} from "./profile-card.types";
// Import BaseCardBackData for the updated type
import type { BaseCardBackData } from "../base-card/base-card.types";
import { parseTimestampSafe } from "@/lib/formatters"; // Already using centralized formatter

const rehydrateProfileCardInstance: SpecificCardRehydrator = (
  cardFromStorage: any,
  commonProps: CommonCardPropsForRehydration
): ProfileCardData | null => {
  const staticDataFromStorage = cardFromStorage.staticData || {};
  const liveDataFromStorage = cardFromStorage.liveData || {};

  const descriptionForBack =
    cardFromStorage.backData?.description || // Check if backData itself exists
    staticDataFromStorage.description ||
    `Profile for ${commonProps.symbol || "unknown symbol"}`;

  // Adjust type to BaseCardBackData
  const rehydratedBackData: BaseCardBackData = {
    description: descriptionForBack,
  };

  return {
    id: commonProps.id,
    type: "profile",
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    logoUrl: commonProps.logoUrl,
    staticData: staticDataFromStorage,
    liveData: liveDataFromStorage,
    backData: rehydratedBackData,
    // isFlipped, currentRarity, and rarityReason are handled by the main rehydrateCardFromStorage
  };
};

registerCardRehydrator("profile", rehydrateProfileCardInstance);
