// src/components/game/cards/price-card/priceCardUtils.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToastFunctionType } from "@/hooks/use-toast";
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
  ConcreteCardData,
} from "@/components/game/types";
import type { LiveQuoteIndicatorDBRow } from "@/lib/supabase/realtime-service";
import {
  registerCardInitializer,
  type CardInitializationContext,
} from "@/components/game/cardInitializer.types";
import {
  registerCardUpdateHandler,
  type CardUpdateContext,
  type CardUpdateHandler,
} from "@/components/game/cardUpdateHandler.types";
import type { ProfileCardData as ProfileCardDataType } from "../profile-card/profile-card.types"; // Used for casting activeCards

/**
 * Creates the face data for a PriceCard from a lean live quote.
 */
export function createPriceCardFaceDataFromLiveQuote(
  leanQuote: LiveQuoteIndicatorDBRow,
  apiTimestampMillis: number
): PriceCardFaceData {
  return {
    timestamp: apiTimestampMillis,
    price: leanQuote.current_price, // FMP current_price is price on our card
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

/**
 * Creates the specific back data for a PriceCard from a lean live quote.
 */
export function createPriceCardBackDataFromLiveQuote(
  leanQuote: LiveQuoteIndicatorDBRow
): PriceCardSpecificBackData {
  return {
    marketCap: leanQuote.market_cap ?? null,
    sma50d: leanQuote.sma_50d ?? null,
    sma200d: leanQuote.sma_200d ?? null,
  };
}

/**
 * Creates a new DisplayableLivePriceCard.
 * Used by the Card Initializer.
 * For shell cards, ensure leanQuote.current_price is null or faceData is adjusted post-creation (if mutable).
 */
export function createDisplayablePriceCard(
  leanQuote: LiveQuoteIndicatorDBRow, // For shell, current_price might be 0 or an indicator
  apiTimestampMillis: number,
  profileContext?: Pick<ProfileDBRow, "company_name" | "image" | "exchange">,
  isShell: boolean = false // Added flag to indicate shell creation
): DisplayableLivePriceCard {
  let faceData = createPriceCardFaceDataFromLiveQuote(
    leanQuote,
    apiTimestampMillis
  );

  if (isShell) {
    // For shell cards, ensure price is null and timestamp reflects shell creation.
    faceData = {
      ...faceData,
      price: null,
      timestamp: apiTimestampMillis, // Use the passed timestamp (now for shells)
    };
  }

  const backSpecificData = createPriceCardBackDataFromLiveQuote(leanQuote);

  const cardState: Pick<DisplayableCardState, "isFlipped"> = {
    isFlipped: false,
  };

  const concreteCardData: PriceCardData = {
    id: `${leanQuote.symbol}-price-${Date.now()}`, // Unique ID
    type: "price",
    symbol: leanQuote.symbol,
    createdAt: Date.now(),
    companyName: profileContext?.company_name ?? leanQuote.symbol,
    logoUrl: profileContext?.image ?? null,
    faceData, // Use the potentially adjusted faceData for shells
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

// --- Card Initializer for PriceCard ---
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
          company_name: profileCardForSymbol.companyName,
          image: profileCardForSymbol.logoUrl,
          exchange: profileCardForSymbol.staticData.exchange_full_name,
        }
      : undefined;

    if (quoteDataFromDB) {
      const liveQuote = quoteDataFromDB as LiveQuoteIndicatorDBRow;
      return createDisplayablePriceCard(
        liveQuote,
        liveQuote.api_timestamp * 1000,
        profileContext,
        false // Not a shell
      );
    } else {
      // Create a shell card
      const now = Date.now();
      const nowSeconds = Math.floor(now / 1000);

      const shellLeanQuote: LiveQuoteIndicatorDBRow = {
        // id: `${symbol}-shell-${now}`, // id in LiveQuoteIndicatorDBRow comes from DB, not strictly needed for this temporary object
        // but providing one for completeness if any utility expects it.
        // However, createDisplayablePriceCard generates its own final card ID.
        id: `shell-indicator-${now}`, // Or omit if not strictly used by createPriceCardFace/BackDataFromLiveQuote
        symbol: symbol,
        current_price: 0, // Placeholder, will be effectively nullified by isShell=true
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
        now, // apiTimestampMillis for the shell card
        profileContext,
        true // Indicate it's a shell
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

// --- Card Update Handlers ---
const handlePriceCardLiveQuoteUpdate: CardUpdateHandler<
  PriceCardData,
  LiveQuoteIndicatorDBRow
> = (
  currentPriceCardData,
  leanQuotePayload,
  currentDisplayableCard,
  context
): PriceCardData => {
  const apiTimestampMillis = leanQuotePayload.api_timestamp * 1000;

  if (
    currentPriceCardData.faceData.timestamp &&
    apiTimestampMillis < currentPriceCardData.faceData.timestamp &&
    currentPriceCardData.faceData.price !== null
  ) {
    // if (process.env.NODE_ENV === "development") {
    //   console.debug(
    //     `[PriceCardHandler] Stale quote received for ${currentPriceCardData.symbol}, current ts: ${currentPriceCardData.faceData.timestamp}, new ts: ${apiTimestampMillis}, ignoring.`
    //   );
    // }
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
    // More robust check for any change in faceData
    hasSignificantChange = true;
  } else if (
    // Check backData only if faceData hasn't changed for performance
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
> = (
  currentPriceCardData,
  profilePayload, // This is ProfileDBRow
  currentDisplayableCard, // Full DisplayableCard for context
  context // CardUpdateContext { toast }
): PriceCardData => {
  let needsUpdate = false;

  // Determine new values, defaulting to current if profile doesn't provide a change
  const newCompanyName =
    profilePayload.company_name ?? currentPriceCardData.companyName;
  const newLogoUrl = profilePayload.image ?? currentPriceCardData.logoUrl; // FMP profile uses 'image' for logo
  const newExchangeCode =
    profilePayload.exchange ?? currentPriceCardData.exchange_code; // 'exchange' from ProfileDBRow

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
    // Return a new PriceCardData object with updated fields
    return {
      ...currentPriceCardData, // Spread all existing properties first
      companyName: newCompanyName,
      logoUrl: newLogoUrl,
      exchange_code: newExchangeCode,
    };
  }

  return currentPriceCardData; // No relevant changes, return the original object
};

registerCardUpdateHandler(
  "price",
  "STATIC_PROFILE_UPDATE",
  handlePriceCardProfileUpdate
);
