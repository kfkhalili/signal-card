// src/components/game/cards/cardUtils.ts
import type { ConcreteCardData } from "@/components/game/types";
import type { ProfileDBRow } from "@/hooks/useStockData";

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
