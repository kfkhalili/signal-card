// src/components/game/cards/price-card/priceCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type {
  PriceCardData,
  PriceCardLiveData,
  PriceCardStaticData,
} from "./price-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";
import { parseTimestampSafe } from "@/lib/formatters";

// Expected shape of the 'liveData' object in storage
interface StoredPriceCardLiveDataShape {
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
  marketCap?: number | null;
  sma50d?: number | null;
  sma200d?: number | null;
}

// Expected shape of the 'staticData' object in storage
interface StoredPriceCardStaticDataShape {
  exchange_code?: string | null;
}

// Expected shape of the 'backData' object (for description)
interface StoredBaseCardBackDataShape {
  description?: string | null;
}

// Overall expected shape for a stored PriceCard
interface StoredPriceCardObject {
  staticData?: StoredPriceCardStaticDataShape;
  liveData?: StoredPriceCardLiveDataShape;
  backData?: StoredBaseCardBackDataShape; // For the description
  // Old direct fields that might exist in older stored cards (for graceful migration if needed)
  faceData?: StoredPriceCardLiveDataShape; // Old name for liveData parts
  exchange_code?: string | null; // Old location for exchange_code
}

const rehydrateLivePriceCard: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>, // Raw object from storage
  commonProps: CommonCardPropsForRehydration
): PriceCardData | null => {
  const stored = cardFromStorage as StoredPriceCardObject;

  // Prioritize new liveData structure, fallback to old faceData for migration
  const liveDataSource = stored.liveData || stored.faceData || {};
  const staticDataSource = stored.staticData || {};
  const backDataSource = stored.backData || {};

  const timestamp = parseTimestampSafe(liveDataSource.timestamp);

  const rehydratedLiveData: PriceCardLiveData = {
    timestamp: timestamp,
    price: liveDataSource.price ?? null,
    dayChange: liveDataSource.dayChange ?? null,
    changePercentage: liveDataSource.changePercentage ?? null,
    dayHigh: liveDataSource.dayHigh ?? null,
    dayLow: liveDataSource.dayLow ?? null,
    dayOpen: liveDataSource.dayOpen ?? null,
    previousClose: liveDataSource.previousClose ?? null,
    volume: liveDataSource.volume ?? null,
    yearHigh: liveDataSource.yearHigh ?? null,
    yearLow: liveDataSource.yearLow ?? null,
    marketCap: liveDataSource.marketCap ?? null,
    sma50d: liveDataSource.sma50d ?? null,
    sma200d: liveDataSource.sma200d ?? null,
  };

  const rehydratedStaticData: PriceCardStaticData = {
    exchange_code:
      staticDataSource.exchange_code ?? stored.exchange_code ?? null, // Fallback for older stored data
  };

  const rehydratedBackData: BaseCardBackData = {
    description:
      backDataSource.description ||
      `Market price information for ${commonProps.symbol}. Includes daily and historical price points, volume, and key moving averages.`, // Default description
  };

  return {
    id: commonProps.id,
    type: "price",
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    logoUrl: commonProps.logoUrl,
    staticData: rehydratedStaticData,
    liveData: rehydratedLiveData,
    backData: rehydratedBackData,
  };
};

registerCardRehydrator("price", rehydrateLivePriceCard);
