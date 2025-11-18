// src/components/game/cards/price-card/priceCardUtils.ts
import { ok, err, fromPromise, Result } from "neverthrow";
import type { ProfileDBRow } from "@/hooks/useStockData";
import type {
  PriceCardStaticData,
  PriceCardLiveData,
  PriceCardData,
} from "./price-card.types";
import type {
  DisplayableCardState,
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
import { applyProfileCoreUpdates } from "../cardUtils";

class PriceCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PriceCardError";
  }
}

function createPriceCardLiveData(
  leanQuote: LiveQuoteIndicatorDBRow,
  apiTimestampMillis: number | null
): PriceCardLiveData {
  return {
    timestamp: apiTimestampMillis,
    price: leanQuote.current_price ?? null,
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

function createPriceCardStaticData(
  leanQuote: LiveQuoteIndicatorDBRow,
  profileContext?: Pick<ProfileDBRow, "exchange" | "currency">
): PriceCardStaticData {
  return {
    exchange_code: leanQuote.exchange ?? profileContext?.exchange ?? null,
    currency: profileContext?.currency ?? "USD", // Default to USD if not found
  };
}

function createDisplayablePriceCard(
  leanQuote: LiveQuoteIndicatorDBRow,
  apiTimestampMillis: number | null,
  profileContext?: Pick<
    ProfileDBRow,
    | "company_name"
    | "display_company_name"
    | "image"
    | "exchange"
    | "website"
    | "currency"
  >,
  isShell = false
): PriceCardData & DisplayableCardState {
  let liveData = createPriceCardLiveData(
    leanQuote,
    isShell ? null : apiTimestampMillis
  );

  if (isShell) {
    liveData = {
      ...liveData,
      price: null,
      timestamp: apiTimestampMillis,
    };
  }

  const staticData = createPriceCardStaticData(leanQuote, profileContext);

  const cardState: Pick<DisplayableCardState, "isFlipped"> = {
    isFlipped: false,
  };

  const companyNameForDesc = profileContext?.company_name ?? leanQuote.symbol;
  const backDataDescription: BaseCardBackData = {
    description: `Market price information for ${companyNameForDesc}. Includes daily and historical price points, volume, and key moving averages.`,
  };

  const concreteCardData: PriceCardData = {
    id: `price-${leanQuote.symbol}-${Date.now()}`,
    type: "price",
    symbol: leanQuote.symbol,
    createdAt: Date.now(),
    companyName: profileContext?.company_name ?? null,
    displayCompanyName:
      profileContext?.display_company_name ??
      profileContext?.company_name ??
      null,
    logoUrl: profileContext?.image ?? null,
    websiteUrl: profileContext?.website ?? null,
    staticData,
    liveData,
    backData: backDataDescription,
  };

  return {
    ...concreteCardData,
    ...cardState,
  } as PriceCardData & DisplayableCardState;
}

async function initializePriceCard({
  symbol,
  supabase,
  toast,
  activeCards,
}: CardInitializationContext): Promise<
  Result<DisplayableCard, PriceCardError>
> {
  const quoteResult = await fromPromise(
    supabase
      .from("live_quote_indicators")
      .select("*")
      .eq("symbol", symbol)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single(),
    (error) => new PriceCardError((error as Error).message)
  );

  if (quoteResult.isErr() && !quoteResult.error.message.includes("PGRST116")) {
    return err(quoteResult.error);
  }

  const quoteDataFromDB = quoteResult.isOk() ? quoteResult.value.data : null;

  const profileCard = activeCards?.find(
    (c) => c.symbol === symbol && c.type === "profile"
  ) as ProfileCardDataType | undefined;

  let profileContext:
    | Pick<
        ProfileDBRow,
        | "company_name"
        | "display_company_name"
        | "image"
        | "exchange"
        | "website"
        | "currency"
      >
    | undefined;

  if (profileCard) {
    profileContext = {
      company_name: profileCard.companyName ?? null,
      display_company_name: profileCard.displayCompanyName ?? null,
      image: profileCard.logoUrl ?? null,
      exchange: profileCard.staticData.exchange ?? null,
      website: profileCard.websiteUrl ?? null,
      currency: profileCard.staticData.currency ?? "USD",
    };
  } else {
    // If no profile card exists, fetch the necessary info from the DB
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "company_name, display_company_name, image, exchange, website, currency"
      )
      .eq("symbol", symbol)
      .maybeSingle();

    if (error) {
      console.warn(
        `Could not fetch profile context for ${symbol}: ${error.message}`
      );
    } else if (data) {
      profileContext = data;
    }
  }

  if (quoteDataFromDB) {
    const liveQuote = quoteDataFromDB as LiveQuoteIndicatorDBRow;
    const card = createDisplayablePriceCard(
      liveQuote,
      liveQuote.api_timestamp * 1000,
      profileContext,
      false
    );
    return ok(card);
  }

  const now = Date.now();
  const shellLeanQuote: LiveQuoteIndicatorDBRow = {
    id: `shell-indicator-${now}`,
    symbol: symbol,
    current_price: 0,
    api_timestamp: Math.floor(now / 1000),
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
  return ok(shellDisplayableCard);
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
    currentPriceCardData.liveData.price !== null
  ) {
    return currentPriceCardData;
  }

  const newLiveData = createPriceCardLiveData(
    leanQuotePayload,
    apiTimestampMillis
  );

  if (
    JSON.stringify(currentPriceCardData.liveData) ===
    JSON.stringify(newLiveData)
  ) {
    return currentPriceCardData;
  }

  return {
    ...currentPriceCardData,
    liveData: newLiveData,
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
  const { updatedCardData, coreDataChanged } = applyProfileCoreUpdates(
    currentPriceCardData,
    profilePayload
  );

  const currencyChanged =
    currentPriceCardData.staticData.currency !== profilePayload.currency;

  if (coreDataChanged || currencyChanged) {
    const companyNameForDesc =
      updatedCardData.companyName ?? updatedCardData.symbol;
    const newBackData: BaseCardBackData = {
      description: `Market price information for ${companyNameForDesc}. Includes daily and historical price points, volume, and key moving averages.`,
    };
    return {
      ...updatedCardData,
      staticData: {
        ...updatedCardData.staticData,
        currency: profilePayload.currency ?? "USD",
      },
      backData: newBackData,
    };
  }

  return currentPriceCardData;
};

registerCardUpdateHandler(
  "price",
  "STATIC_PROFILE_UPDATE",
  handlePriceCardProfileUpdate
);
