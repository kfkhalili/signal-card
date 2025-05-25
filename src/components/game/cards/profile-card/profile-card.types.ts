// src/components/game/cards/profile-card/profile-card.types.ts
import type {
  BaseCardData,
  CardActionContext,
} from "../base-card/base-card.types";

// Defines the static, less frequently changing data specific to a profile.
export interface ProfileCardStaticData {
  readonly db_id: string;
  readonly sector?: string | null;
  readonly industry?: string | null;
  readonly country?: string | null;
  readonly exchange?: string | null;
  readonly exchange_full_name?: string | null;
  readonly website?: string | null;
  readonly description?: string | null;
  readonly ceo?: string | null;
  readonly full_address?: string | null;
  readonly phone?: string | null;
  readonly profile_last_updated?: string | null;
  readonly currency?: string | null;
  readonly formatted_ipo_date?: string | null;
  readonly formatted_full_time_employees?: string | null;
  readonly is_etf?: boolean | null;
  readonly is_adr?: boolean | null;
  readonly is_fund?: boolean | null;
}

// Defines the live, frequently updated data for a ProfileCard.
// Simplified to only include price.
export interface ProfileCardLiveData {
  price?: number | null;
}

// Main interface for the complete ProfileCard data structure
export interface ProfileCardData extends BaseCardData {
  readonly type: "profile";
  readonly staticData: ProfileCardStaticData;
  liveData: ProfileCardLiveData; // Mutable part for live updates
  // websiteUrl is inherited from BaseCardData; its value typically comes from staticData.website
}

export interface ProfileCardInteractions {
  readonly onWebsiteClick?: (websiteUrl: string) => void;
  readonly onFilterByField?: (
    fieldType: "sector" | "industry" | "exchange",
    value: string
  ) => void;
  readonly onRequestPriceCard?: (context: CardActionContext) => void;
}
