// src/components/game/cards/price-card/priceCardUtils.ts
import type { SupabaseClient } from "@supabase/supabase-js"; // Added
import type { ToastFunctionType } from "@/hooks/use-toast"; // Added
import type { CombinedQuoteData } from "@/hooks/useStockData";
import type {
  PriceCardFaceData,
  PriceCardSpecificBackData,
  PriceCardData, // Added
} from "./price-card.types";
import type {
  DisplayableCardState,
  DisplayableLivePriceCard,
  DisplayableCard, // Added
} from "@/components/game/types";
import type { LiveQuoteIndicatorDBRow } from "@/lib/supabase/realtime-service"; // Added
import {
  registerCardInitializer, // Added
  type CardInitializationContext, // Added
} from "@/components/game/cardInitializer.types"; // Adjust path as needed

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
    // description: `Price data for ${quoteData.symbol}`, // Generic description often better set at higher level
    marketCap: quoteData.market_cap ?? null,
    sma50d: quoteData.sma_50d ?? null,
    sma200d: quoteData.sma_200d ?? null,
  };
}

export function createDisplayablePriceCard(
  quoteData: CombinedQuoteData,
  apiTimestampMillis: number
): DisplayableLivePriceCard {
  // Changed return type to be more specific
  const faceData = createPriceCardFaceDataFromQuote(
    quoteData,
    apiTimestampMillis
  );
  const backSpecificData = createPriceCardBackDataFromQuote(quoteData);

  const cardState: Pick<DisplayableCardState, "isFlipped"> = {
    // Only include essential state for creation
    isFlipped: false,
  };

  const concreteCardData: PriceCardData = {
    id: `${quoteData.symbol}-live-price-${Date.now()}`, // Ensure unique ID
    type: "price",
    symbol: quoteData.symbol,
    createdAt: Date.now(), // Timestamp of creation in the app
    companyName: quoteData.companyName ?? null,
    logoUrl: quoteData.logoUrl ?? null,
    faceData,
    backData: {
      description: `Market price information for ${quoteData.symbol}. Includes daily and historical price points, volume, and key moving averages.`, // More descriptive default
      ...backSpecificData,
    },
  };

  return {
    ...concreteCardData,
    ...cardState,
    // currentRarity, rarityReason, like/comment/collection counts will be added later
  } as DisplayableLivePriceCard; // Assert as DisplayableLivePriceCard
}

// --- Card Initializer for PriceCard ---
async function initializePriceCard({
  symbol,
  supabase,
  toast,
  activeCards,
}: CardInitializationContext): Promise<DisplayableCard | null> {
  try {
    const { data: quoteData, error: quoteError } = await supabase
      .from("live_quote_indicators")
      .select("*")
      .eq("symbol", symbol)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single();

    if (quoteError && quoteError.code !== "PGRST116") {
      // PGRST116: no rows found
      throw quoteError;
    }

    const profileCardForSymbol = activeCards?.find(
      (c) => c.symbol === symbol && c.type === "profile"
    );

    if (quoteData) {
      const combinedQuote: CombinedQuoteData = {
        ...(quoteData as LiveQuoteIndicatorDBRow),
        companyName: profileCardForSymbol?.companyName ?? null,
        logoUrl: profileCardForSymbol?.logoUrl ?? null,
      };
      // Use the existing createDisplayablePriceCard function
      return createDisplayablePriceCard(
        combinedQuote,
        combinedQuote.api_timestamp * 1000
      );
    } else {
      // Create a shell card if no quote data is found yet
      const now = Date.now();
      const shellPriceCard: DisplayableLivePriceCard = {
        id: `${symbol}-price-${now}`,
        type: "price",
        symbol: symbol,
        createdAt: now,
        isFlipped: false,
        companyName: profileCardForSymbol?.companyName ?? symbol, // Get from profile if available
        logoUrl: profileCardForSymbol?.logoUrl ?? null, // Get from profile if available
        faceData: {
          timestamp: now, // Indicate it's a shell
          price: null,
          dayChange: null,
          changePercentage: null,
          dayHigh: null,
          dayLow: null,
          dayOpen: null,
          previousClose: null,
          volume: null,
          // yearHigh, yearLow will be null by default
        },
        backData: {
          description: `Live market price data for ${symbol}. Currently awaiting first data stream.`,
          marketCap: null,
          sma50d: null,
          sma200d: null,
        },
        // Rarity, like/comment/collection counts will be added later
      };
      if (toast) {
        // Check if toast is provided
        toast({
          title: "Price Card Added (Shell)",
          description: `Awaiting live data for ${symbol}.`,
          variant: "default",
        });
      }
      return shellPriceCard;
    }
  } catch (err: any) {
    if (process.env.NODE_ENV === "development") {
      console.error(`Error initializing price card for ${symbol}:`, err);
    }
    if (toast) {
      // Check if toast is provided
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
