// src/components/game/cards/profile-card/profile-card.types.ts
import type {
  BaseCardData,
  BaseCardBackData,
  CardActionContext,
} from "../base-card/base-card.types";
import type { PriceCardFaceData } from "../price-card/price-card.types";

export interface ProfileCardStaticData {
  readonly db_id: string;
  readonly sector?: string | null;
  readonly industry?: string | null;
  readonly country?: string | null;
  readonly exchange_full_name?: string | null;
  readonly website?: string | null;
  readonly description?: string | null;
  readonly short_description?: string | null;
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
    // yearHigh and yearLow are typically not part of profile live data,
    // but can be if your CombinedQuoteData includes them for profiles too.
  >
>;

export interface ProfileCardData extends BaseCardData {
  readonly type: "profile";
  readonly staticData: ProfileCardStaticData;
  liveData: ProfileCardLiveData;
  readonly backData: BaseCardBackData; // Generic card type description
}

export interface ProfileCardInteractionCallbacks {
  readonly onWebsiteClick?: (websiteUrl: string) => void;
  readonly onFilterByField?: (
    fieldType: "sector" | "industry" | "exchange",
    value: string
  ) => void;
  // Renamed from onShowFullPriceCard
  readonly onRequestPriceCard?: (context: CardActionContext) => void; // <<< RENAMED
}
