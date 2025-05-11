// src/components/game/cards/profile-card/profile-card.types.ts
import type {
  BaseCardData,
  BaseCardBackData as BaseCardBackDataType,
  CardActionContext,
} from "../base-card/base-card.types"; // Import BaseCardBackDataType
import type { PriceCardFaceData } from "../price-card/price-card.types";

// Static data primarily from 'profiles' table
export interface ProfileCardStaticData {
  readonly db_id: string;
  readonly sector?: string | null;
  readonly industry?: string | null;
  readonly country?: string | null;
  readonly exchange_full_name?: string | null;
  readonly website?: string | null;
  readonly description?: string | null; // This can be used for the 'explanation'
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

export type ProfileCardLiveData = Partial<
  Pick<
    PriceCardFaceData,
    | "price"
    | "dayChange"
    | "changePercentage"
    | "dayHigh"
    | "dayLow"
    | "timestamp"
    | "volume"
    | "yearHigh"
    | "yearLow"
  >
>;

// Specific back data for ProfileCard, fulfilling BaseCardBackDataType
export interface ProfileCardBackDataType extends BaseCardBackDataType {
  // BaseCardBackDataType requires 'explanation: string'. We'll map 'description' to it.
  // Add other fields specific to the back of the ProfileCard if they don't fit elsewhere.
  // For now, most detailed static info is in ProfileCardStaticData, displayed by ProfileCardContent.
  // This backData will primarily serve the 'explanation' for BaseCard.
}

// The main data structure for a ProfileCard instance
export interface ProfileCardData extends BaseCardData {
  readonly type: "profile";
  readonly symbol: string;
  readonly companyName?: string | null;
  readonly logoUrl?: string | null;

  readonly staticData: ProfileCardStaticData;
  liveData: ProfileCardLiveData;

  // This backData is required by BaseCardData.
  // It will be populated using info from staticData (e.g., description as explanation).
  readonly backData: ProfileCardBackDataType;
}

export interface ProfileCardInteractionCallbacks {
  readonly onWebsiteClick?: (websiteUrl: string) => void;
  readonly onFilterByField?: (
    fieldType: "sector" | "industry" | "exchange",
    value: string
  ) => void;
  readonly onShowFullPriceCard?: (context: CardActionContext) => void;
}
