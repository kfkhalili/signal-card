// src/components/game/cards/profile-card/profile-card.types.ts
import type { BaseCardData } from "../base-card/base-card.types";

// Defines the static, less frequently changing data specific to a profile.
export interface ProfileCardStaticData {
  readonly db_id: string; // Assuming this is the UUID from the 'profiles' table
  readonly sector?: string | null;
  readonly industry?: string | null;
  readonly country?: string | null;
  readonly exchange?: string | null; // Exchange short code
  readonly exchange_full_name?: string | null;
  readonly website?: string | null;
  readonly description?: string | null;
  readonly ceo?: string | null;
  readonly full_address?: string | null;
  readonly phone?: string | null;
  readonly profile_last_updated?: string | null; // Formatted date string
  readonly currency?: string | null;
  readonly formatted_ipo_date?: string | null; // Formatted date string
  readonly formatted_full_time_employees?: string | null; // Formatted number string
  readonly is_etf?: boolean | null;
  readonly is_adr?: boolean | null;
  readonly is_fund?: boolean | null;
  readonly last_dividend?: number | null;
  readonly beta?: number | null;
  readonly average_volume?: number | null;
  readonly isin?: string | null;
}

// Defines the live, frequently updated data for a ProfileCard.
export interface ProfileCardLiveData {
  price?: number | null;
  marketCap?: number | null;
  revenue?: number | null;
  eps?: number | null;
}

// Main interface for the complete ProfileCard data structure
export interface ProfileCardData extends BaseCardData {
  readonly type: "profile";
  readonly staticData: ProfileCardStaticData;
  liveData: ProfileCardLiveData;
}
