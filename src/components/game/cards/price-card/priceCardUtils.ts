// src/components/game/cards/price-card/priceCardUtils.ts
import type { ProfileDBRow } from "@/hooks/useStockData";
import type {
  PriceCardStaticData,
  PriceCardLiveData,
  PriceCardData,
} from "./price-card.types";
import type {
  DisplayableCardState,
  DisplayableLivePriceCard,
  DisplayableCard,
} from "@/components/game/types";
import type { BaseCardBackData } from "../base-card/base-card.types";
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

export function createPriceCardLiveData(
  leanQuote: LiveQuoteIndicatorDBRow,
  apiTimestampMillis: number | null // Allow null for shell cards
): PriceCardLiveData {
  return {
    timestamp: apiTimestampMillis,
    price: leanQuote.current_price ?? null, // Ensure null if not available
    changePercentage: leanQuote.change_percentage ?? null,
    dayChange: leanQuote.day_change ?? null,
    dayLow: leanQuote.day_low ?? null,
    dayHigh: leanQuote.day_high ?? null,
    volume: leanQuote.volume ?? null,
    dayOpen: leanQuote.day_open ?? null,
    previousClose: leanQuote.previous_close ?? null,
    yearHigh: leanQuote.year_high ?? null,
    yearLow: leanQuote.year_low ?? null,
    marketCap: leanQuote.market_cap ?? null,
    sma50d: leanQuote.sma_50d ?? null,
    sma200d: leanQuote.sma_200d ?? null,
  };
}

export function createPriceCardStaticData(
  leanQuote: LiveQuoteIndicatorDBRow,
  profileContext?: Pick<ProfileDBRow, "exchange">
): PriceCardStaticData {
  return {
    exchange_code: leanQuote.exchange ?? profileContext?.exchange ?? null,
  };
}

export function createDisplayablePriceCard(
  leanQuote: LiveQuoteIndicatorDBRow,
  apiTimestampMillis: number | null,
  profileContext?: Pick<ProfileDBRow, "company_name" | "image" | "exchange">,
  isShell: boolean = false
): DisplayableLivePriceCard {
  let liveData = createPriceCardLiveData(
    leanQuote,
    isShell ? null : apiTimestampMillis // Use null timestamp for shell if price is null
  );

  if (isShell) {
    liveData = {
      ...liveData,
      price: null, // Explicitly null for shell
      timestamp: apiTimestampMillis, // Keep timestamp for shell identification if needed
    };
  }

  const staticData = createPriceCardStaticData(leanQuote, profileContext);

  const cardState: Pick<DisplayableCardState, "isFlipped"> = {
    isFlipped: false,
  };

  const backDataDescription: BaseCardBackData = {
    description: `Market price information for ${leanQuote.symbol}. Includes daily and historical price points, volume, and key moving averages.`,
  };

  const concreteCardData: PriceCardData = {
    id: `${leanQuote.symbol}-price-${Date.now()}`,
    type: "price",
    symbol: leanQuote.symbol,
    createdAt: Date.now(),
    companyName: profileContext?.company_name ?? leanQuote.symbol,
    logoUrl: profileContext?.image ?? null,
    staticData,
    liveData,
    backData: backDataDescription,
    // websiteUrl can be added if relevant for PriceCard, though typically for Profile
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
          exchange: profileCardForSymbol.staticData.exchange_full_name ?? null, // Assuming exchange_full_name is desired
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

      // Create a shell quote. Some fields might be unavailable or should be explicitly null.
      const shellLeanQuote: LiveQuoteIndicatorDBRow = {
        id: `shell-indicator-${now}`, // Placeholder ID
        symbol: symbol,
        current_price: 0, // Placeholder, will be nulled out by isShell in createDisplayablePriceCard
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
        now, // Pass current time for shell's timestamp
        profileContext,
        true // isShell = true
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
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : `Could not initialize price data for ${symbol}.`;
    if (process.env.NODE_ENV === "development") {
      console.error(
        `Error initializing price card for ${symbol}:`,
        errorMessage
      );
    }
    if (toast) {
      toast({
        title: "Error Initializing Price Data",
        description: errorMessage,
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
    currentPriceCardData.liveData.timestamp &&
    apiTimestampMillis < currentPriceCardData.liveData.timestamp &&
    currentPriceCardData.liveData.price !== null // Ensure we don't block update if current price is null (shell card)
  ) {
    return currentPriceCardData; // Incoming data is older than current, and we have a price
  }

  const newLiveData = createPriceCardLiveData(
    leanQuotePayload,
    apiTimestampMillis
  );
  const newStaticData = createPriceCardStaticData(leanQuotePayload); // Exchange might come from quote

  let hasSignificantChange = false;
  if (
    JSON.stringify(currentPriceCardData.liveData) !==
    JSON.stringify(newLiveData)
  ) {
    hasSignificantChange = true;
  } else if (
    currentPriceCardData.staticData.exchange_code !==
    newStaticData.exchange_code
  ) {
    hasSignificantChange = true;
  }

  if (!hasSignificantChange) {
    return currentPriceCardData;
  }

  return {
    ...currentPriceCardData,
    liveData: newLiveData,
    staticData: {
      // Keep existing static data and only update exchange_code if it changed
      ...currentPriceCardData.staticData,
      exchange_code: newStaticData.exchange_code,
    },
  };
};
registerCardUpdateHandler(
  "price",
  "LIVE_QUOTE_UPDATE",
  handlePriceCardLiveQuoteUpdate
);

const handlePriceCardProfileUpdate: CardUpdateHandler<
  PriceCardData,
  ProfileDBRow // Assuming ProfileDBRow contains company_name, image, exchange
> = (currentPriceCardData, profilePayload): PriceCardData => {
  let needsUpdate = false;

  const newCompanyName =
    profilePayload.company_name ?? currentPriceCardData.companyName;
  const newLogoUrl = profilePayload.image ?? currentPriceCardData.logoUrl;
  // Exchange code update from profile might be less frequent or contingent
  // For now, let's assume live_quote_indicators is the primary source for exchange for PriceCard
  // const newExchangeCode = profilePayload.exchange ?? currentPriceCardData.staticData.exchange_code;

  if (newCompanyName !== currentPriceCardData.companyName) {
    needsUpdate = true;
  }
  if (newLogoUrl !== currentPriceCardData.logoUrl) {
    needsUpdate = true;
  }
  // if (newExchangeCode !== currentPriceCardData.staticData.exchange_code) {
  //   needsUpdate = true;
  // }

  if (needsUpdate) {
    return {
      ...currentPriceCardData,
      companyName: newCompanyName,
      logoUrl: newLogoUrl,
      // staticData: {
      //   ...currentPriceCardData.staticData,
      //   exchange_code: newExchangeCode,
      // },
    };
  }

  return currentPriceCardData;
};

registerCardUpdateHandler(
  "price",
  "STATIC_PROFILE_UPDATE",
  handlePriceCardProfileUpdate
);
