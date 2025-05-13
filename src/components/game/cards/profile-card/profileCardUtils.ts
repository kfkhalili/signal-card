// src/components/game/cards/profile-card/profileCardUtils.ts
import { format, parseISO } from "date-fns";
import type { ProfileDBRow } from "@/hooks/useStockData";
import type { DisplayableCardState } from "@/components/game/types";
import type {
  ProfileCardData,
  ProfileCardStaticData,
} from "./profile-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";

export function createDisplayableProfileCardFromDB(
  dbData: ProfileDBRow
): ProfileCardData & DisplayableCardState {
  const staticData: ProfileCardStaticData = {
    db_id: dbData.id,
    sector: dbData.sector,
    industry: dbData.industry,
    country: dbData.country,
    exchange_full_name: dbData.exchange_full_name,
    website: dbData.website,
    description: dbData.description, // Full company description
    short_description: dbData.short_description, // Company's short description
    ceo: dbData.ceo,
    full_address: [
      dbData.address,
      dbData.city,
      dbData.state,
      dbData.zip,
      dbData.country,
    ]
      .filter(Boolean)
      .join(", "),
    phone: dbData.phone,
    formatted_full_time_employees: dbData.full_time_employees?.toLocaleString(),
    profile_last_updated: dbData.modified_at
      ? format(parseISO(dbData.modified_at), "MMM d, yy")
      : undefined,
    currency: dbData.currency,
    formatted_ipo_date: dbData.ipo_date
      ? format(parseISO(dbData.ipo_date), "MMMM d, yy")
      : undefined,
    is_etf: dbData.is_etf,
    is_adr: dbData.is_adr,
    is_fund: dbData.is_fund,
  };

  // Generic description for the Profile Card type itself
  const cardTypeDescription = `Provides an overview of ${
    dbData.company_name || dbData.symbol
  }'s company profile, including sector, industry, and key operational highlights.`;

  const cardBackData: BaseCardBackData = {
    description: cardTypeDescription, // This is the generic description of the card type
  };

  return {
    id: `profile-${dbData.symbol}-${Date.now()}`,
    type: "profile",
    symbol: dbData.symbol,
    companyName: dbData.company_name,
    logoUrl: dbData.image,
    createdAt: Date.now(),
    staticData, // Contains company's short_description and full description
    liveData: {}, // Initial empty live data
    backData: cardBackData, // Contains the generic card type description
    isFlipped: false,
    // currentRarity and rarityReason will be calculated and added when it becomes a live DisplayableCard
  };
}
