// src/components/game/cards/price-card/priceCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type {
  PriceCardData,
  PriceCardFaceData,
  PriceCardSpecificBackData,
} from "./price-card.types";
import { parseTimestampSafe } from "@/lib/formatters";

const rehydrateLivePriceCard: SpecificCardRehydrator = (
  cardFromStorage: any,
  commonProps: CommonCardPropsForRehydration
): PriceCardData | null => {
  const originalFaceData = cardFromStorage.faceData || {};
  const timestamp = parseTimestampSafe(originalFaceData.timestamp);

  const rehydratedFaceData: PriceCardFaceData = {
    timestamp: timestamp,
    price: originalFaceData.price ?? null,
    dayChange: originalFaceData.dayChange ?? null,
    changePercentage: originalFaceData.changePercentage ?? null,
    dayHigh: originalFaceData.dayHigh ?? null,
    dayLow: originalFaceData.dayLow ?? null,
    dayOpen: originalFaceData.dayOpen ?? null,
    previousClose: originalFaceData.previousClose ?? null,
    volume: originalFaceData.volume ?? null,
    yearHigh: originalFaceData.yearHigh ?? null,
    yearLow: originalFaceData.yearLow ?? null,
  };

  const originalBackData = cardFromStorage.backData || {};
  const rehydratedBackData: PriceCardSpecificBackData = {
    description: originalBackData.description,
    marketCap: originalBackData.marketCap ?? null,
    sma50d: originalBackData.sma50d ?? null,
    sma200d: originalBackData.sma200d ?? null,
  };

  // commonProps already contains id, symbol, createdAt, companyName, logoUrl, isFlipped, rarity etc.
  // The SpecificCardRehydrator returns the ConcreteCardData part.
  // BaseCardData properties are merged here.
  return {
    id: commonProps.id,
    type: "price", // Ensure type is set correctly
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    logoUrl: commonProps.logoUrl,
    faceData: rehydratedFaceData,
    backData: rehydratedBackData,
  };
};

// Register the rehydrator
registerCardRehydrator("price", rehydrateLivePriceCard);
