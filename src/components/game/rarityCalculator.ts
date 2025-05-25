// src/components/game/rarityCalculator.ts
import type { DisplayableCard } from "./types";
import type { PriceCardData } from "./cards/price-card/price-card.types";
import type { ProfileCardData } from "./cards/profile-card/profile-card.types";

export interface RarityOutcome {
  rarity: string;
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
  // Check 1: Ensure cardData is a valid object.
  if (!cardData || typeof cardData !== "object" || cardData === null) {
    return {
      rarity: RARITY_LEVELS.COMMON,
      reason: "Internal error: Invalid card data object.",
    };
  }

  // Check 2: Ensure liveData property exists and is a non-null object.
  if (
    !("liveData" in cardData) ||
    cardData.liveData === undefined ||
    cardData.liveData === null ||
    typeof cardData.liveData !== "object"
  ) {
    return {
      rarity: RARITY_LEVELS.COMMON,
      reason: "Internal error: Live data structure invalid.",
    };
  }

  const currentLiveData = cardData.liveData;

  // Check 3: Ensure price property exists in liveData and is a number.
  if (
    !("price" in currentLiveData) ||
    typeof currentLiveData.price !== "number"
  ) {
    return { rarity: RARITY_LEVELS.COMMON, reason: "Price data unavailable." };
  }

  if (
    currentLiveData.yearHigh != null &&
    typeof currentLiveData.yearHigh === "number" &&
    currentLiveData.price >= currentLiveData.yearHigh
  ) {
    return { rarity: RARITY_LEVELS.LEGENDARY, reason: "At 52-Week High!" };
  }
  if (
    currentLiveData.yearLow != null &&
    typeof currentLiveData.yearLow === "number" &&
    currentLiveData.price <= currentLiveData.yearLow
  ) {
    return { rarity: RARITY_LEVELS.EPIC, reason: "At 52-Week Low!" };
  }

  if (
    currentLiveData.changePercentage != null &&
    typeof currentLiveData.changePercentage === "number"
  ) {
    if (currentLiveData.changePercentage >= 10)
      return {
        rarity: RARITY_LEVELS.EPIC,
        reason: `Strong Gain: +${currentLiveData.changePercentage.toFixed(1)}%`,
      };
    if (currentLiveData.changePercentage <= -10)
      return {
        rarity: RARITY_LEVELS.EPIC,
        reason: `Significant Drop: ${currentLiveData.changePercentage.toFixed(
          1
        )}%`,
      };
    if (currentLiveData.changePercentage >= 5)
      return {
        rarity: RARITY_LEVELS.RARE,
        reason: `Notable Gain: +${currentLiveData.changePercentage.toFixed(
          1
        )}%`,
      };
    if (currentLiveData.changePercentage <= -5)
      return {
        rarity: RARITY_LEVELS.RARE,
        reason: `Notable Drop: ${currentLiveData.changePercentage.toFixed(1)}%`,
      };
  }
  return { rarity: RARITY_LEVELS.COMMON, reason: null };
}

function calculateProfileCardRarityLogic(
  cardData: ProfileCardData
): RarityOutcome {
  if (
    !cardData ||
    typeof cardData !== "object" ||
    cardData === null ||
    !("staticData" in cardData) ||
    typeof cardData.staticData !== "object" ||
    cardData.staticData === null
  ) {
    return {
      rarity: RARITY_LEVELS.COMMON,
      reason: "Internal error: Profile card data structure invalid.",
    };
  }

  if (
    cardData.staticData.description &&
    cardData.staticData.description.length > 500
  ) {
    return {
      rarity: RARITY_LEVELS.UNCOMMON,
      reason: "Detailed company profile.",
    };
  }
  return { rarity: RARITY_LEVELS.COMMON, reason: null };
}

export function calculateDynamicCardRarity(
  card: DisplayableCard
): RarityOutcome {
  if (!card || typeof card.type !== "string") {
    return { rarity: RARITY_LEVELS.COMMON, reason: "Invalid card data." };
  }

  switch (card.type) {
    case "price":
      if (
        !("liveData" in card) ||
        typeof (card as PriceCardData).liveData !== "object" ||
        (card as PriceCardData).liveData === null
      ) {
        return {
          rarity: RARITY_LEVELS.COMMON,
          reason:
            "Internal error: Price card data malformed (liveData check failed).",
        };
      }
      return calculatePriceCardRarityLogic(card as PriceCardData);
    case "profile":
      if (
        !("staticData" in card) ||
        typeof (card as ProfileCardData).staticData !== "object" ||
        (card as ProfileCardData).staticData === null ||
        !("liveData" in card) ||
        typeof (card as ProfileCardData).liveData !== "object" ||
        (card as ProfileCardData).liveData === null
      ) {
        return {
          rarity: RARITY_LEVELS.COMMON,
          reason:
            "Internal error: Profile card data malformed (staticData/liveData check failed).",
        };
      }
      return calculateProfileCardRarityLogic(card as ProfileCardData);
    default:
      // const unknownCard = card as unknown as { type?: unknown; id?: unknown };
      // console.warn( // Example of how you might log, but keeping it clean for now
      //   `[calculateDynamicCardRarity] Unknown card type: ${
      //     unknownCard.type ?? "unknown type"
      //   } for card ID: ${unknownCard.id ?? "unknown id"}. Full card:`,
      //   JSON.stringify(card, null, 2)
      // );
      return { rarity: RARITY_LEVELS.COMMON, reason: "Standard information." };
  }
}
