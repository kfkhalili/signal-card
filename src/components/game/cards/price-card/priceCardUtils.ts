// src/components/game/cards/price-card/priceCardUtils.ts
import type { ProfileDBRow } from "@/hooks/useStockData";
import type {
  PriceCardFaceData,
  PriceCardSpecificBackData,
  PriceCardData,
} from "./price-card.types";
import type {
  DisplayableCardState,
  DisplayableLivePriceCard,
  DisplayableCard,
} from "@/components/game/types";
import type { LiveQuoteIndicatorDBRow } from "@/lib/supabase/realtime-service";
import {
  registerCardInitializer,
  type CardInitializationContext,
} from "@/components/game/cardInitializer.types";
import {
  registerCardUpdateHandler,
  type CardUpdateHandler,
} from "@/components/game/cardUpdateHandler.types";
import type { ProfileCardData as ProfileCardDataType } from "../profile-card/profile-card.types";

export function createPriceCardFaceDataFromLiveQuote(
  leanQuote: LiveQuoteIndicatorDBRow,
  apiTimestampMillis: number
): PriceCardFaceData {
  return {
    timestamp: apiTimestampMillis,
    price: leanQuote.current_price,
    changePercentage: leanQuote.change_percentage ?? null,
    dayChange: leanQuote.day_change ?? null,
    dayLow: leanQuote.day_low ?? null,
    dayHigh: leanQuote.day_high ?? null,
    volume: leanQuote.volume ?? null,
    dayOpen: leanQuote.day_open ?? null,
    previousClose: leanQuote.previous_close ?? null,
    yearHigh: leanQuote.year_high ?? null,
    yearLow: leanQuote.year_low ?? null,
  };
}

export function createPriceCardBackDataFromLiveQuote(
  leanQuote: LiveQuoteIndicatorDBRow
): PriceCardSpecificBackData {
  return {
    marketCap: leanQuote.market_cap ?? null,
    sma50d: leanQuote.sma_50d ?? null,
    sma200d: leanQuote.sma_200d ?? null,
  };
}

export function createDisplayablePriceCard(
  leanQuote: LiveQuoteIndicatorDBRow,
  apiTimestampMillis: number,
  profileContext?: Pick<ProfileDBRow, "company_name" | "image" | "exchange">,
  isShell: boolean = false
): DisplayableLivePriceCard {
  let faceData = createPriceCardFaceDataFromLiveQuote(
    leanQuote,
    apiTimestampMillis
  );

  if (isShell) {
    faceData = {
      ...faceData,
      price: null,
      timestamp: apiTimestampMillis,
    };
  }

  const backSpecificData = createPriceCardBackDataFromLiveQuote(leanQuote);

  const cardState: Pick<DisplayableCardState, "isFlipped"> = {
    isFlipped: false,
  };

  const concreteCardData: PriceCardData = {
    id: `${leanQuote.symbol}-price-${Date.now()}`,
    type: "price",
    symbol: leanQuote.symbol,
    createdAt: Date.now(),
    companyName: profileContext?.company_name ?? leanQuote.symbol,
    logoUrl: profileContext?.image ?? null,
    faceData,
    backData: {
      description: `Market price information for ${leanQuote.symbol}. Includes daily and historical price points, volume, and key moving averages.`,
      ...backSpecificData,
    },
    exchange_code: leanQuote.exchange ?? profileContext?.exchange ?? null,
  };

  return {
    ...concreteCardData,
    ...cardState,
  } as DisplayableLivePriceCard;
}

async function initializePriceCard({
  symbol,
  supabase,
  toast,
  activeCards,
}: CardInitializationContext): Promise<DisplayableCard | null> {
  try {
    const { data: quoteDataFromDB, error: quoteError } = await supabase
      .from("live_quote_indicators")
      .select("*")
      .eq("symbol", symbol)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single();

    if (quoteError && quoteError.code !== "PGRST116") {
      throw quoteError;
    }

    const profileCardForSymbol = activeCards?.find(
      (c) => c.symbol === symbol && c.type === "profile"
    ) as ProfileCardDataType | undefined;

    const profileContext = profileCardForSymbol
      ? {
          company_name: profileCardForSymbol.companyName ?? null,
          image: profileCardForSymbol.logoUrl ?? null,
          exchange: profileCardForSymbol.staticData.exchange_full_name ?? null,
        }
      : undefined;

    if (quoteDataFromDB) {
      const liveQuote = quoteDataFromDB as LiveQuoteIndicatorDBRow;
      return createDisplayablePriceCard(
        liveQuote,
        liveQuote.api_timestamp * 1000,
        profileContext,
        false
      );
    } else {
      const now = Date.now();
      const nowSeconds = Math.floor(now / 1000);

      const shellLeanQuote: LiveQuoteIndicatorDBRow = {
        id: `shell-indicator-${now}`,
        symbol: symbol,
        current_price: 0,
        api_timestamp: nowSeconds,
        fetched_at: new Date(now).toISOString(),
        exchange: profileContext?.exchange || null,
        change_percentage: null,
        day_change: null,
        volume: null,
        day_low: null,
        day_high: null,
        market_cap: null,
        day_open: null,
        previous_close: null,
        sma_50d: null,
        sma_200d: null,
        year_high: null,
        year_low: null,
      };

      const shellDisplayableCard = createDisplayablePriceCard(
        shellLeanQuote,
        now,
        profileContext,
        true
      );

      if (toast) {
        toast({
          title: "Price Card Added (Shell)",
          description: `Awaiting live data for ${symbol}.`,
          variant: "default",
        });
      }
      return shellDisplayableCard;
    }
  } catch (err: any) {
    if (process.env.NODE_ENV === "development") {
      console.error(`Error initializing price card for ${symbol}:`, err);
    }
    if (toast) {
      toast({
        title: "Error Initializing Price Data",
        description:
          err.message || `Could not initialize price data for ${symbol}.`,
        variant: "destructive",
      });
    }
    return null;
  }
}
registerCardInitializer("price", initializePriceCard);

const handlePriceCardLiveQuoteUpdate: CardUpdateHandler<
  PriceCardData,
  LiveQuoteIndicatorDBRow
> = (currentPriceCardData, leanQuotePayload): PriceCardData => {
  const apiTimestampMillis = leanQuotePayload.api_timestamp * 1000;

  if (
    currentPriceCardData.faceData.timestamp &&
    apiTimestampMillis < currentPriceCardData.faceData.timestamp &&
    currentPriceCardData.faceData.price !== null
  ) {
    return currentPriceCardData;
  }

  const newFaceData = createPriceCardFaceDataFromLiveQuote(
    leanQuotePayload,
    apiTimestampMillis
  );
  const newBackData = createPriceCardBackDataFromLiveQuote(leanQuotePayload);

  let hasSignificantChange = false;
  if (
    JSON.stringify(currentPriceCardData.faceData) !==
    JSON.stringify(newFaceData)
  ) {
    hasSignificantChange = true;
  } else if (
    currentPriceCardData.backData.marketCap !== newBackData.marketCap ||
    currentPriceCardData.backData.sma50d !== newBackData.sma50d ||
    currentPriceCardData.backData.sma200d !== newBackData.sma200d
  ) {
    hasSignificantChange = true;
  }
  if (
    !hasSignificantChange &&
    currentPriceCardData.exchange_code !== (leanQuotePayload.exchange ?? null)
  ) {
    hasSignificantChange = true;
  }

  if (!hasSignificantChange) {
    return currentPriceCardData;
  }

  return {
    ...currentPriceCardData,
    faceData: newFaceData,
    backData: {
      ...currentPriceCardData.backData,
      marketCap: newBackData.marketCap,
      sma50d: newBackData.sma50d,
      sma200d: newBackData.sma200d,
    },
    exchange_code: leanQuotePayload.exchange ?? null,
  };
};
registerCardUpdateHandler(
  "price",
  "LIVE_QUOTE_UPDATE",
  handlePriceCardLiveQuoteUpdate
);

const handlePriceCardProfileUpdate: CardUpdateHandler<
  PriceCardData,
  ProfileDBRow
> = (currentPriceCardData, profilePayload): PriceCardData => {
  let needsUpdate = false;

  const newCompanyName =
    profilePayload.company_name ?? currentPriceCardData.companyName;
  const newLogoUrl = profilePayload.image ?? currentPriceCardData.logoUrl;
  const newExchangeCode =
    profilePayload.exchange ?? currentPriceCardData.exchange_code;

  if (newCompanyName !== currentPriceCardData.companyName) {
    needsUpdate = true;
  }
  if (newLogoUrl !== currentPriceCardData.logoUrl) {
    needsUpdate = true;
  }
  if (newExchangeCode !== currentPriceCardData.exchange_code) {
    needsUpdate = true;
  }

  if (needsUpdate) {
    return {
      ...currentPriceCardData,
      companyName: newCompanyName,
      logoUrl: newLogoUrl,
      exchange_code: newExchangeCode,
    };
  }

  return currentPriceCardData;
};

registerCardUpdateHandler(
  "price",
  "STATIC_PROFILE_UPDATE",
  handlePriceCardProfileUpdate
);
