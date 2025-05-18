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
import type { DisplayableCard } from "../../types";

const rehydrateLivePriceCard: SpecificCardRehydrator = (
  cardFromStorage: Partial<DisplayableCard> & { type: "price" }, // More specific type
  commonProps: CommonCardPropsForRehydration
): PriceCardData | null => {
  // Ensure faceData and backData exist on cardFromStorage before accessing their properties
  const originalFaceData = cardFromStorage.faceData || {};
  const timestamp = parseTimestampSafe(
    (originalFaceData as PriceCardFaceData).timestamp
  );

  const rehydratedFaceData: PriceCardFaceData = {
    timestamp: timestamp,
    price: (originalFaceData as PriceCardFaceData).price ?? null,
    dayChange: (originalFaceData as PriceCardFaceData).dayChange ?? null,
    changePercentage:
      (originalFaceData as PriceCardFaceData).changePercentage ?? null,
    dayHigh: (originalFaceData as PriceCardFaceData).dayHigh ?? null,
    dayLow: (originalFaceData as PriceCardFaceData).dayLow ?? null,
    dayOpen: (originalFaceData as PriceCardFaceData).dayOpen ?? null,
    previousClose:
      (originalFaceData as PriceCardFaceData).previousClose ?? null,
    volume: (originalFaceData as PriceCardFaceData).volume ?? null,
    yearHigh: (originalFaceData as PriceCardFaceData).yearHigh ?? null,
    yearLow: (originalFaceData as PriceCardFaceData).yearLow ?? null,
  };

  const originalBackData = cardFromStorage.backData || {};
  const rehydratedBackData: PriceCardSpecificBackData = {
    description: (originalBackData as PriceCardSpecificBackData).description,
    marketCap:
      (originalBackData as PriceCardSpecificBackData).marketCap ?? null,
    sma50d: (originalBackData as PriceCardSpecificBackData).sma50d ?? null,
    sma200d: (originalBackData as PriceCardSpecificBackData).sma200d ?? null,
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
    exchange_code: (cardFromStorage as PriceCardData).exchange_code ?? null,
  };
};

registerCardRehydrator("price", rehydrateLivePriceCard);
