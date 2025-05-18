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

interface StoredPriceCardFaceDataShape {
  timestamp?: string | number | null;
  price?: number | null;
  dayChange?: number | null;
  changePercentage?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  dayOpen?: number | null;
  previousClose?: number | null;
  volume?: number | null;
  yearHigh?: number | null;
  yearLow?: number | null;
}

interface StoredPriceCardBackDataShape {
  description?: string | null; // Source can be string or null
  marketCap?: number | null;
  sma50d?: number | null;
  sma200d?: number | null;
}

interface StoredPriceCardObject {
  faceData?: StoredPriceCardFaceDataShape;
  backData?: StoredPriceCardBackDataShape;
}

const rehydrateLivePriceCard: SpecificCardRehydrator = (
  cardFromStorage: StoredPriceCardObject,
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
    // If originalBackData.description is null, undefined, or "", it becomes undefined.
    // Otherwise, it's the string value. This fits 'string | undefined'.
    description: originalBackData.description || undefined,
    marketCap: originalBackData.marketCap ?? null,
    sma50d: originalBackData.sma50d ?? null,
    sma200d: originalBackData.sma200d ?? null,
  };

  return {
    id: commonProps.id,
    type: "price",
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    logoUrl: commonProps.logoUrl,
    faceData: rehydratedFaceData,
    backData: rehydratedBackData,
  };
};

registerCardRehydrator("price", rehydrateLivePriceCard);
