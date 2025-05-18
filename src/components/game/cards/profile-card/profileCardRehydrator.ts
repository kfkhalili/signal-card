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
import type { DisplayableCard } from "../../types"; // Import DisplayableCard

const rehydrateProfileCardInstance: SpecificCardRehydrator = (
  cardFromStorage: Partial<DisplayableCard> & { type: "profile" }, // More specific type
  commonProps: CommonCardPropsForRehydration
): ProfileCardData | null => {
  const staticDataFromStorage =
    (cardFromStorage as ProfileCardData)?.staticData || {}; // Cast to access staticData
  const liveDataFromStorage =
    (cardFromStorage as ProfileCardData)?.liveData || {}; // Cast to access liveData

  const rehydratedStaticData: ProfileCardStaticData = {
    db_id: staticDataFromStorage.db_id || "",
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
    dayChange: liveDataFromStorage.dayChange ?? null,
    changePercentage: liveDataFromStorage.changePercentage ?? null,
    dayHigh: liveDataFromStorage.dayHigh ?? null,
    dayLow: liveDataFromStorage.dayLow ?? null,
    timestamp: liveDataFromStorage.timestamp ?? null,
    volume: liveDataFromStorage.volume ?? null,
    yearHigh: liveDataFromStorage.yearHigh ?? null,
    yearLow: liveDataFromStorage.yearLow ?? null,
    previousClose: liveDataFromStorage.previousClose ?? null,
    dayOpen: liveDataFromStorage.dayOpen ?? null,
  };

  const cardTypeDescription = `Provides an overview of ${
    commonProps.companyName || commonProps.symbol
  }'s company profile, including sector, industry, and key operational highlights.`;

  const rehydratedBackData: BaseCardBackData = {
    description: cardTypeDescription,
  };

  const rehydratedCard: ProfileCardData = {
    id: commonProps.id,
    type: "profile",
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    logoUrl: commonProps.logoUrl,
    staticData: rehydratedStaticData,
    liveData: rehydratedLiveData,
    backData: rehydratedBackData,
    websiteUrl: staticDataFromStorage.website ?? null, // Ensure websiteUrl is correctly assigned
  };

  return rehydratedCard;
};

registerCardRehydrator("profile", rehydrateProfileCardInstance);
