// src/components/game/cards/cardUtils.ts
import { fromPromise, Result, ok } from "neverthrow";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ConcreteCardData } from "@/components/game/types";
import type { ProfileDBRow } from "@/hooks/useStockData";
import type { DisplayableCard } from "@/components/game/types";

/**
 * Standardized profile information structure used across all card initializers.
 * All fields fallback to appropriate defaults (symbol for companyName, null for others).
 */
export interface ProfileInfo {
  companyName: string; // Always falls back to symbol if not available
  displayCompanyName: string; // Falls back to companyName, then symbol
  logoUrl: string | null;
  websiteUrl: string | null;
}

/**
 * Fetches profile information for a symbol, checking activeCards first, then database.
 * This unified function eliminates duplication across all card initializers.
 *
 * @param symbol - The stock symbol to fetch profile for
 * @param supabase - Supabase client instance
 * @param activeCards - Optional array of active cards to check for existing profile card
 * @returns Result containing ProfileInfo (always succeeds, falls back to symbol if no profile found)
 */
export async function fetchProfileInfo(
  symbol: string,
  supabase: SupabaseClient<Database>,
  activeCards?: DisplayableCard[]
): Promise<Result<ProfileInfo, Error>> {
  // First, check if there's a profile card in activeCards
  const profileCard = activeCards?.find(
    (c) => c.symbol === symbol && c.type === "profile"
  );

  if (profileCard) {
    // Extract profile info from existing profile card
    const profileInfo: ProfileInfo = {
      companyName: profileCard.companyName ?? symbol,
      displayCompanyName:
        profileCard.displayCompanyName ??
        profileCard.companyName ??
        symbol,
      logoUrl: profileCard.logoUrl ?? null,
      websiteUrl: profileCard.websiteUrl ?? null,
    };
    return ok(profileInfo);
  }

  // If not in activeCards, query the database
  const profileResult = await fromPromise(
    supabase
      .from("profiles")
      .select("company_name, display_company_name, image, website")
      .eq("symbol", symbol)
      .maybeSingle(),
    (e) => new Error(`Failed to fetch profile: ${(e as Error).message}`)
  );

  if (profileResult.isErr()) {
    // On error, return fallback profile info (not an error condition)
    // Profile will arrive via realtime when backend processes it
    console.warn(
      `[fetchProfileInfo] Error fetching profile for ${symbol}:`,
      profileResult.error.message
    );
    return ok({
      companyName: symbol,
      displayCompanyName: symbol,
      logoUrl: null,
      websiteUrl: null,
    });
  }

  const profileData = profileResult.value.data;

  if (!profileData) {
    // No profile data found - return fallback (profile will arrive via realtime)
    return ok({
      companyName: symbol,
      displayCompanyName: symbol,
      logoUrl: null,
      websiteUrl: null,
    });
  }

  // Extract and return profile info with fallbacks
  const profileInfo: ProfileInfo = {
    companyName: profileData.company_name ?? symbol,
    displayCompanyName:
      profileData.display_company_name ??
      profileData.company_name ??
      symbol,
    logoUrl: profileData.image ?? null,
    websiteUrl: profileData.website ?? null,
  };

  return ok(profileInfo);
}

/**
 * Applies core profile updates (companyName, displayCompanyName, logoUrl, websiteUrl) to a card.
 * Returns an object containing the potentially updated card data and a flag
 * indicating if any of these core fields actually changed.
 */
export function applyProfileCoreUpdates<T extends ConcreteCardData>(
  currentCardData: T,
  profilePayload: ProfileDBRow
): { updatedCardData: T; coreDataChanged: boolean } {
  const newCompanyName = profilePayload.company_name ?? currentCardData.symbol;
  const newDisplayCompanyName =
    profilePayload.display_company_name ?? newCompanyName;
  const newLogoUrl = profilePayload.image ?? null;
  const newWebsiteUrl =
    profilePayload.website ?? currentCardData.websiteUrl ?? null;

  const companyNameChanged = currentCardData.companyName !== newCompanyName;
  const displayCompanyNameChanged =
    currentCardData.displayCompanyName !== newDisplayCompanyName;
  const logoUrlChanged = currentCardData.logoUrl !== newLogoUrl;
  const websiteUrlChanged = currentCardData.websiteUrl !== newWebsiteUrl;

  const coreDataChanged =
    companyNameChanged ||
    displayCompanyNameChanged ||
    logoUrlChanged ||
    websiteUrlChanged;

  // Always apply updates, even if values appear unchanged
  // This ensures profile data is properly applied in all cases
  const updatedCardData: T = {
    ...currentCardData,
    companyName: newCompanyName,
    displayCompanyName: newDisplayCompanyName,
    logoUrl: newLogoUrl,
    websiteUrl: newWebsiteUrl,
  };

  return {
    updatedCardData,
    coreDataChanged,
  };
}
