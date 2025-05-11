// src/components/game/cards/price-card/priceCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type { ConcreteCardData } from "@/components/game/types";
import type {
  PriceCardData,
  PriceCardFaceData,
  PriceCardSpecificBackData,
  PriceCardSnapshotData,
  PriceCardSnapshotSpecificBackData,
} from "./price-card.types";

// Helper to safely parse timestamps (from string or number to number | null)
// This could be moved to a shared util if used in many rehydrators
function parseLocalTimestamp(timestamp: any): number | null {
  if (typeof timestamp === "string") {
    const parsed = new Date(timestamp).getTime();
    return isNaN(parsed) ? null : parsed;
  }
  if (typeof timestamp === "number" && !isNaN(timestamp)) {
    return timestamp > 0 ? timestamp : null;
  }
  return null;
}

const rehydrateLivePriceCard: SpecificCardRehydrator = (
  cardFromStorage: any,
  commonProps: CommonCardPropsForRehydration
): PriceCardData | null => {
  const originalFaceData = cardFromStorage.faceData || {};
  const timestamp = parseLocalTimestamp(originalFaceData.timestamp);

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

  // commonProps already contains id, symbol, createdAt, companyName, logoUrl, isFlipped
  // The SpecificCardRehydrator should return the ConcreteCardData part
  return {
    id: commonProps.id,
    type: "price", // Set by the dispatcher or ensure consistency
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    logoUrl: commonProps.logoUrl,
    faceData: rehydratedFaceData,
    backData: rehydratedBackData,
  };
};

const rehydratePriceSnapshotCard: SpecificCardRehydrator = (
  cardFromStorage: any,
  commonProps: CommonCardPropsForRehydration
): PriceCardSnapshotData | null => {
  const snapshotTime =
    parseLocalTimestamp(cardFromStorage.snapshotTime) ?? Date.now();

  const originalSnapshotBackData = cardFromStorage.backData || {};
  const rehydratedSnapshotBackData: PriceCardSnapshotSpecificBackData = {
    description: originalSnapshotBackData.description,
    discoveredReason: originalSnapshotBackData.discoveredReason,
  };

  return {
    id: commonProps.id,
    type: "price_snapshot",
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    logoUrl: commonProps.logoUrl,
    capturedPrice: cardFromStorage.capturedPrice ?? 0,
    snapshotTime,
    yearHighAtCapture: cardFromStorage.yearHighAtCapture ?? null,
    yearLowAtCapture: cardFromStorage.yearLowAtCapture ?? null,
    backData: rehydratedSnapshotBackData,
  };
};

// Register these rehydrators
registerCardRehydrator("price", rehydrateLivePriceCard);
registerCardRehydrator("price_snapshot", rehydratePriceSnapshotCard);
