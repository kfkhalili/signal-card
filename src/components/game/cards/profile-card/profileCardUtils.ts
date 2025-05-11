// src/components/game/cards/profile-card/profileCardUtils.ts
import { format, parseISO } from "date-fns";
import type { ProfileDBRow } from "@/hooks/useStockData";
import type { DisplayableCardState } from "@/components/game/types";
import type {
  ProfileCardData,
  ProfileCardStaticData,
  ProfileCardBackDataType,
} from "./profile-card.types";

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
    description: dbData.description,
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
      ? format(parseISO(dbData.modified_at), "MMM d, yyyy")
      : undefined,
    currency: dbData.currency,
    formatted_ipo_date: dbData.ipo_date
      ? format(parseISO(dbData.ipo_date), "MMMM d, yyyy")
      : undefined,
    is_etf: dbData.is_etf,
    is_adr: dbData.is_adr,
    is_fund: dbData.is_fund,
  };

  const cardBackData: ProfileCardBackDataType = {
    description:
      dbData.description ||
      `Profile information for ${dbData.company_name || dbData.symbol}.`,
  };

  return {
    id: `profile-${dbData.symbol}-${Date.now()}`,
    type: "profile",
    symbol: dbData.symbol,
    companyName: dbData.company_name,
    logoUrl: dbData.image,
    createdAt: Date.now(),
    staticData,
    liveData: {}, // Initial live data is empty
    backData: cardBackData,
    isFlipped: false,
  };
}
