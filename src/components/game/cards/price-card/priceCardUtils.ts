// src/components/game/cards/price-card/priceCardUtils.ts
import type { CombinedQuoteData } from "@/hooks/useStockData";
import type {
  PriceCardFaceData,
  PriceCardSpecificBackData,
} from "./price-card.types";
import type {
  DisplayableCardState,
  DisplayableLivePriceCard,
} from "@/components/game/types";

export function createPriceCardFaceDataFromQuote(
  quoteData: CombinedQuoteData,
  apiTimestampMillis: number
): PriceCardFaceData {
  return {
    timestamp: apiTimestampMillis,
    price: quoteData.current_price,
    changePercentage: quoteData.change_percentage ?? null,
    dayChange: quoteData.day_change ?? null,
    dayLow: quoteData.day_low ?? null,
    dayHigh: quoteData.day_high ?? null,
    volume: quoteData.volume ?? null,
    dayOpen: quoteData.day_open ?? null,
    previousClose: quoteData.previous_close ?? null,
    yearHigh: quoteData.year_high ?? null,
    yearLow: quoteData.year_low ?? null,
  };
}

export function createPriceCardBackDataFromQuote(
  quoteData: CombinedQuoteData
): PriceCardSpecificBackData {
  return {
    marketCap: quoteData.market_cap ?? null,
    sma50d: quoteData.sma_50d ?? null,
    sma200d: quoteData.sma_200d ?? null,
    // description could be set here if there was a default or derived one
  };
}

export function createDisplayablePriceCard(
  quoteData: CombinedQuoteData,
  apiTimestampMillis: number
): DisplayableLivePriceCard {
  const faceData = createPriceCardFaceDataFromQuote(
    quoteData,
    apiTimestampMillis
  );
  const backData = createPriceCardBackDataFromQuote(quoteData);

  const cardState: DisplayableCardState = {
    isFlipped: false,
  };

  return {
    id: `${quoteData.symbol}-live-price-${Date.now()}`, // Ensure unique ID
    type: "price",
    symbol: quoteData.symbol,
    createdAt: Date.now(),
    companyName: quoteData.companyName ?? null,
    logoUrl: quoteData.logoUrl ?? null,
    faceData,
    backData,
    ...cardState,
  };
}
