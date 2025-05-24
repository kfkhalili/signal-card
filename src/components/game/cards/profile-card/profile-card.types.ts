// src/components/game/cards/profile-card/profile-card.types.ts
import type {
  BaseCardData,
  BaseCardBackData,
  CardActionContext,
} from "../base-card/base-card.types";
import type { PriceCardFaceData } from "../price-card/price-card.types";

// Defines the static, less frequently changing data specific to a profile.
export interface ProfileCardStaticData {
  readonly db_id: string; // ID from your 'profiles' table
  readonly sector?: string | null;
  readonly industry?: string | null;
  readonly country?: string | null; // e.g., "US"
  readonly exchange?: string | null; // e.g., "NASDAQ", "NYSE" - Short exchange code
  readonly exchange_full_name?: string | null; // e.g., "Nasdaq Stock Market"
  readonly website?: string | null;
  readonly description?: string | null;
  readonly ceo?: string | null;
  readonly full_address?: string | null;
  readonly phone?: string | null;
  readonly profile_last_updated?: string | null; // Formatted date string, or ISO string
  readonly currency?: string | null;
  readonly formatted_ipo_date?: string | null; // Formatted date string, or ISO string
  readonly formatted_full_time_employees?: string | null;
  readonly is_etf?: boolean | null;
  readonly is_adr?: boolean | null;
  readonly is_fund?: boolean | null;
}

// Defines the live, frequently updated data for a ProfileCard (typically a subset of price data)
export type ProfileCardLiveData = Partial<
  Pick<
    PriceCardFaceData,
    | "price"
    | "dayChange"
    | "changePercentage"
    | "dayHigh"
    | "dayLow"
    | "yearHigh"
    | "yearLow"
    | "timestamp"
    | "volume"
    | "dayOpen"
    | "previousClose"
  >
>;

// Main interface for the complete ProfileCard data structure
export interface ProfileCardData extends BaseCardData {
  readonly type: "profile";
  readonly staticData: ProfileCardStaticData; // Correctly references the dedicated static data interface
  liveData: ProfileCardLiveData; // Mutable part for live updates
  readonly backData: BaseCardBackData; // Holds generic description for the card type
  // websiteUrl is inherited from BaseCardData; its value typically comes from staticData.website
}

export interface ProfileCardSpecificInteractions {
  readonly onWebsiteClick?: (websiteUrl: string) => void;
  readonly onFilterByField?: (
    fieldType: "sector" | "industry" | "exchange", // 'exchange' here might refer to 'exchange_full_name' or 'exchange' short code
    value: string
  ) => void;
  readonly onRequestPriceCard?: (context: CardActionContext) => void;
}
