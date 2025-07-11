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

interface StoredProfileCardShape {
  staticData?: Partial<ProfileCardStaticData>;
  liveData?: Partial<ProfileCardLiveData>;
  backData?: Partial<BaseCardBackData>;
  websiteUrl?: string | null;
}

const rehydrateProfileCardInstance: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>,
  commonProps: CommonCardPropsForRehydration
): ProfileCardData | null => {
  const profileStorageData = cardFromStorage as StoredProfileCardShape;
  const staticDataFromStorage = profileStorageData.staticData || {};
  const liveDataFromStorage = profileStorageData.liveData || {};
  const backDataFromStorage = profileStorageData.backData || {};

  const rehydratedStaticData: ProfileCardStaticData = {
    db_id:
      typeof staticDataFromStorage.db_id === "string"
        ? staticDataFromStorage.db_id
        : "",
    sector:
      typeof staticDataFromStorage.sector === "string"
        ? staticDataFromStorage.sector
        : null,
    industry:
      typeof staticDataFromStorage.industry === "string"
        ? staticDataFromStorage.industry
        : null,
    country:
      typeof staticDataFromStorage.country === "string"
        ? staticDataFromStorage.country
        : null,
    exchange_full_name:
      typeof staticDataFromStorage.exchange_full_name === "string"
        ? staticDataFromStorage.exchange_full_name
        : null,
    exchange:
      typeof staticDataFromStorage.exchange === "string"
        ? staticDataFromStorage.exchange
        : null,
    website:
      typeof staticDataFromStorage.website === "string"
        ? staticDataFromStorage.website
        : null,
    description:
      typeof staticDataFromStorage.description === "string"
        ? staticDataFromStorage.description
        : null,
    ceo:
      typeof staticDataFromStorage.ceo === "string"
        ? staticDataFromStorage.ceo
        : null,
    full_address:
      typeof staticDataFromStorage.full_address === "string"
        ? staticDataFromStorage.full_address
        : null,
    phone:
      typeof staticDataFromStorage.phone === "string"
        ? staticDataFromStorage.phone
        : null,
    profile_last_updated:
      typeof staticDataFromStorage.profile_last_updated === "string"
        ? staticDataFromStorage.profile_last_updated
        : null,
    currency:
      typeof staticDataFromStorage.currency === "string"
        ? staticDataFromStorage.currency
        : null,
    formatted_ipo_date:
      typeof staticDataFromStorage.formatted_ipo_date === "string"
        ? staticDataFromStorage.formatted_ipo_date
        : null,
    formatted_full_time_employees:
      typeof staticDataFromStorage.formatted_full_time_employees === "string"
        ? staticDataFromStorage.formatted_full_time_employees
        : null,
    is_etf:
      typeof staticDataFromStorage.is_etf === "boolean"
        ? staticDataFromStorage.is_etf
        : null,
    is_adr:
      typeof staticDataFromStorage.is_adr === "boolean"
        ? staticDataFromStorage.is_adr
        : null,
    is_fund:
      typeof staticDataFromStorage.is_fund === "boolean"
        ? staticDataFromStorage.is_fund
        : null,
    last_dividend:
      typeof staticDataFromStorage.last_dividend === "number"
        ? staticDataFromStorage.last_dividend
        : null,
    beta:
      typeof staticDataFromStorage.beta === "number"
        ? staticDataFromStorage.beta
        : null,
    average_volume:
      typeof staticDataFromStorage.average_volume === "number"
        ? staticDataFromStorage.average_volume
        : null,
    isin:
      typeof staticDataFromStorage.isin === "string"
        ? staticDataFromStorage.isin
        : null,
  };

  const rehydratedLiveData: ProfileCardLiveData = {
    price:
      typeof liveDataFromStorage.price === "number"
        ? liveDataFromStorage.price
        : null,
    marketCap:
      typeof liveDataFromStorage.marketCap === "number"
        ? liveDataFromStorage.marketCap
        : null,
    revenue:
      typeof liveDataFromStorage.revenue === "number"
        ? liveDataFromStorage.revenue
        : null,
    eps:
      typeof liveDataFromStorage.eps === "number"
        ? liveDataFromStorage.eps
        : null,
    priceToEarningsRatioTTM:
      typeof liveDataFromStorage.priceToEarningsRatioTTM === "number"
        ? liveDataFromStorage.priceToEarningsRatioTTM
        : null,
    priceToBookRatioTTM:
      typeof liveDataFromStorage.priceToBookRatioTTM === "number"
        ? liveDataFromStorage.priceToBookRatioTTM
        : null,
  };

  const cardTypeDescription = `Provides an overview of ${
    commonProps.companyName || commonProps.symbol
  }'s company profile, including sector, industry, and key operational highlights.`;
  const rehydratedBackData: BaseCardBackData = {
    description: backDataFromStorage.description || cardTypeDescription,
  };

  const rehydratedCard: ProfileCardData = {
    ...commonProps,
    type: "profile",
    staticData: rehydratedStaticData,
    liveData: rehydratedLiveData,
    backData: rehydratedBackData,
    websiteUrl: profileStorageData.websiteUrl ?? rehydratedStaticData.website,
  };
  return rehydratedCard;
};

registerCardRehydrator("profile", rehydrateProfileCardInstance);
