// src/components/game/cards/profile-card/profileCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type { ConcreteCardData } from "@/components/game/types";
import type {
  ProfileCardData,
  ProfileCardBackDataType,
  // ProfileCardStaticData is assumed to be correctly structured in localStorage
} from "./profile-card.types";

const rehydrateProfileCardInstance: SpecificCardRehydrator = (
  cardFromStorage: any,
  commonProps: CommonCardPropsForRehydration
): ProfileCardData | null => {
  const staticDataFromStorage = cardFromStorage.staticData || {};
  const liveDataFromStorage = cardFromStorage.liveData || {};

  const descriptionForBack =
    cardFromStorage.backData?.description ||
    staticDataFromStorage.description ||
    `Profile for ${commonProps.symbol || "unknown symbol"}`;

  const rehydratedBackData: ProfileCardBackDataType = {
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
  };
};

registerCardRehydrator("profile", rehydrateProfileCardInstance);
