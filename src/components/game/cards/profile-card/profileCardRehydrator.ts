// src/components/game/cards/profile-card/profileCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type {
  ProfileCardData,
  ProfileCardStaticData,
  ProfileCardLiveData,
} from "./profile-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";
// DisplayableCard is not directly used for parameter typing here anymore,
// but ProfileCardData might extend or relate to it.

// Define an interim type for what we expect cardFromStorage to look like
// after casting from Record<string, unknown> for profile cards.
// This helps in safely accessing nested properties.
interface StoredProfileCardShape {
  staticData?: Partial<ProfileCardStaticData>;
  liveData?: Partial<ProfileCardLiveData>;
  // Add other properties if they are expected at the top level of cardFromStorage
  // for profile cards, beyond what's in CommonCardPropsForRehydration.
}

const rehydrateProfileCardInstance: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>, // Changed to match SpecificCardRehydrator
  commonProps: CommonCardPropsForRehydration
): ProfileCardData | null => {
  // Assert the shape of cardFromStorage for profile-specific data
  const profileStorageData = cardFromStorage as StoredProfileCardShape;

  const staticDataFromStorage = profileStorageData.staticData || {};
  const liveDataFromStorage = profileStorageData.liveData || {};

  const rehydratedStaticData: ProfileCardStaticData = {
    db_id: staticDataFromStorage.db_id || "", // Ensure db_id is always a string
    sector: staticDataFromStorage.sector ?? null,
    industry: staticDataFromStorage.industry ?? null,
    country: staticDataFromStorage.country ?? null,
    exchange_full_name: staticDataFromStorage.exchange_full_name ?? null,
    exchange: staticDataFromStorage.exchange ?? null,
    website: staticDataFromStorage.website ?? null,
    description: staticDataFromStorage.description ?? null,
    ceo: staticDataFromStorage.ceo ?? null,
    full_address: staticDataFromStorage.full_address ?? null,
    phone: staticDataFromStorage.phone ?? null,
    profile_last_updated: staticDataFromStorage.profile_last_updated ?? null,
    currency: staticDataFromStorage.currency ?? null,
    formatted_ipo_date: staticDataFromStorage.formatted_ipo_date ?? null,
    formatted_full_time_employees:
      staticDataFromStorage.formatted_full_time_employees ?? null,
    is_etf: staticDataFromStorage.is_etf ?? null,
    is_adr: staticDataFromStorage.is_adr ?? null,
    is_fund: staticDataFromStorage.is_fund ?? null,
  };

  const rehydratedLiveData: ProfileCardLiveData = {
    price: liveDataFromStorage.price ?? null,
  };

  const cardTypeDescription = `Provides an overview of ${
    commonProps.companyName || commonProps.symbol
  }'s company profile, including sector, industry, and key operational highlights.`;

  const rehydratedBackData: BaseCardBackData = {
    description: cardTypeDescription,
  };

  const rehydratedCard: ProfileCardData = {
    id: commonProps.id,
    type: "profile", // Crucially set the type for the concrete card data
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    logoUrl: commonProps.logoUrl,
    staticData: rehydratedStaticData,
    liveData: rehydratedLiveData,
    backData: rehydratedBackData,
    websiteUrl: rehydratedStaticData.website, // Use the rehydrated static data
  };

  return rehydratedCard;
};

registerCardRehydrator("profile", rehydrateProfileCardInstance);
