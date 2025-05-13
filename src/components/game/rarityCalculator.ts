// src/components/game/rarityCalculator.ts
import type { DisplayableCard } from "./types";
import type { PriceCardData } from "./cards/price-card/price-card.types";
import type { ProfileCardData } from "./cards/profile-card/profile-card.types";
// Import other card data types as they get rarity logic

export interface RarityOutcome {
  rarity: string; // e.g., "Common", "Rare", "Epic"
  reason: string | null;
}

export const RARITY_LEVELS = {
  COMMON: "Common",
  UNCOMMON: "Uncommon",
  RARE: "Rare",
  EPIC: "Epic",
  LEGENDARY: "Legendary",
} as const;

function calculatePriceCardRarityLogic(cardData: PriceCardData): RarityOutcome {
  const { faceData } = cardData;
  if (!faceData || typeof faceData.price !== "number") {
    // Check if faceData and price are valid
    return { rarity: RARITY_LEVELS.COMMON, reason: "Price data unavailable." };
  }

  if (faceData.yearHigh && faceData.price >= faceData.yearHigh) {
    return { rarity: RARITY_LEVELS.LEGENDARY, reason: "At 52-Week High!" };
  }
  if (faceData.yearLow && faceData.price <= faceData.yearLow) {
    return { rarity: RARITY_LEVELS.EPIC, reason: "At 52-Week Low!" };
  }
  if (faceData.changePercentage) {
    if (faceData.changePercentage >= 10)
      return {
        rarity: RARITY_LEVELS.EPIC,
        reason: `Strong Gain: +${faceData.changePercentage.toFixed(1)}%`,
      };
    if (faceData.changePercentage <= -10)
      return {
        rarity: RARITY_LEVELS.EPIC,
        reason: `Significant Drop: ${faceData.changePercentage.toFixed(1)}%`,
      };
    if (faceData.changePercentage >= 5)
      return {
        rarity: RARITY_LEVELS.RARE,
        reason: `Notable Gain: +${faceData.changePercentage.toFixed(1)}%`,
      };
    if (faceData.changePercentage <= -5)
      return {
        rarity: RARITY_LEVELS.RARE,
        reason: `Notable Drop: ${faceData.changePercentage.toFixed(1)}%`,
      };
  }
  return { rarity: RARITY_LEVELS.COMMON, reason: null };
}

function calculateProfileCardRarityLogic(
  cardData: ProfileCardData
): RarityOutcome {
  // Example: Profile card rarity might be based on age of info or specific keywords if available
  // For now, let's make them common or uncommon based on a simple criterion
  if (
    cardData.staticData?.description &&
    cardData.staticData.description.length > 500
  ) {
    return {
      rarity: RARITY_LEVELS.UNCOMMON,
      reason: "Detailed company profile.",
    };
  }
  return { rarity: RARITY_LEVELS.COMMON, reason: null };
}

// Add functions for other card types here:
// function calculateNewsCardRarityLogic(cardData: NewsCardData): RarityOutcome { ... }

export function calculateDynamicCardRarity(
  card: DisplayableCard
): RarityOutcome {
  // Use card.type to dispatch to the correct specific calculator
  // The 'card' here is DisplayableCard, which includes ConcreteCardData properties
  switch (card.type) {
    case "price":
      // We need to ensure 'card' is treated as PriceCardData for the specific calculator
      return calculatePriceCardRarityLogic(card as PriceCardData);
    case "profile":
      return calculateProfileCardRarityLogic(card as ProfileCardData);
    // Add cases for other card types
    default:
      // For unhandled types, or types that don't have dynamic rarity based on their data
      return { rarity: RARITY_LEVELS.COMMON, reason: "Standard information." };
  }
}
