"use client";

import React, { useState, useEffect, useRef } from "react";
import useLocalStorage from "@/hooks/use-local-storage";
import type { DisplayableCard, DiscoveredCard } from "@/components/game/types";
import { format } from "date-fns";
import { z } from "zod";
import {
  PriceCard,
  PriceCardFaceData,
  PriceCardBackData,
} from "@/components/game/cards/PriceCard/types";

import ActiveCardsSection from "@/components/game/active-cards-section";

import {
  subscribeToQuoteUpdates,
  type LiveQuotePayload,
} from "@/lib/supabase/realtime-service";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

const INITIAL_ACTIVE_CARDS: DisplayableCard[] = [];
const SYMBOL_TO_SUBSCRIBE: string = "AAPL";

interface LiveQuoteIndicatorDBRow {
  id: string;
  symbol: string;
  current_price: number;
  api_timestamp: number;
  fetched_at: string;
  change_percentage?: number | null;
  day_change?: number | null;
  day_low?: number | null;
  day_high?: number | null;
  market_cap?: number | null;
  day_open?: number | null;
  previous_close?: number | null;
  sma_50d?: number | null;
  sma_200d?: number | null;
  volume?: number | null;
  is_market_open?: boolean | null;
  market_status_message?: string | null;
  market_exchange_name?: string | null;
}

// Zod schema for runtime validation, mirroring LiveQuoteIndicatorDBRow
const LiveQuoteIndicatorDBSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  current_price: z.number(),
  api_timestamp: z.number(), // Unix timestamp (seconds)
  fetched_at: z.string(), // ISO string date
  change_percentage: z.number().nullable().optional(),
  day_change: z.number().nullable().optional(),
  day_low: z.number().nullable().optional(),
  day_high: z.number().nullable().optional(),
  market_cap: z.number().nullable().optional(),
  day_open: z.number().nullable().optional(),
  previous_close: z.number().nullable().optional(),
  sma_50d: z.number().nullable().optional(),
  sma_200d: z.number().nullable().optional(),
  volume: z.number().nullable().optional(),
  is_market_open: z.boolean().nullable().optional(),
  market_status_message: z.string().nullable().optional(),
  market_exchange_name: z.string().nullable().optional(),
});

export type MarketStatusDisplay =
  | "Open"
  | "Closed"
  | "Delayed"
  | "Unknown"
  | "Error";

export default function FinSignalGamePage() {
  // Helper function to rehydrate cards, specifically for dates
  // Ensures that date strings from localStorage are converted to Date objects
  const rehydrateCard = (cardFromStorage: any): DisplayableCard => {
    const card = { ...cardFromStorage }; // Create a shallow copy

    if (card.type === "price") {
      const priceCard = card as PriceCard;
      if (
        priceCard.faceData &&
        typeof priceCard.faceData.timestamp === "string"
      ) {
        priceCard.faceData = {
          ...priceCard.faceData,
          timestamp: new Date(priceCard.faceData.timestamp),
        };
      }
    } else {
      // This branch handles DiscoveredCard types
      const discoveredCard = card as DiscoveredCard;
      if (typeof discoveredCard.discoveredAt === "string") {
        discoveredCard.discoveredAt = new Date(discoveredCard.discoveredAt);
      }
    }
    // Add more validation/defaulting for other fields if necessary
    return card as DisplayableCard;
  };

  const [initialCardsFromStorage, setCardsInLocalStorage] = useLocalStorage<
    DisplayableCard[]
  >("finSignal-activeCards", INITIAL_ACTIVE_CARDS);

  // Initialize activeCards state by rehydrating data from localStorage
  const [activeCards, setActiveCards] = useState<DisplayableCard[]>(() => {
    if (Array.isArray(initialCardsFromStorage)) {
      return initialCardsFromStorage.map(rehydrateCard);
    }
    return INITIAL_ACTIVE_CARDS; // Fallback if localStorage data is not an array
  });

  const [marketStatusDisplay, setMarketStatusDisplay] =
    useState<MarketStatusDisplay>("Unknown");
  const [marketStatusMessage, setMarketStatusMessage] = useState<string | null>(
    null
  );
  const lastApiTimestampRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Effect to persist activeCards to localStorage whenever they change
  useEffect(() => {
    setCardsInLocalStorage(activeCards);
  }, [activeCards, setCardsInLocalStorage]);

  // Ref to hold the latest setActiveCards function
  const setActiveCardsRef = useRef(setActiveCards);
  useEffect(() => {
    setActiveCardsRef.current = setActiveCards;
  }, [setActiveCards]);

  useEffect(() => {
    const supabase = createClient();

    const updateDisplayStatus = (quote: LiveQuoteIndicatorDBRow | null) => {
      console.log(
        "Page: updateDisplayStatus called with quote:",
        JSON.stringify(quote)
      );
      if (
        !quote ||
        quote.is_market_open == null // Handles both null and undefined
      ) {
        console.log(
          "Page: updateDisplayStatus - quote or is_market_open is null/undefined. Setting to Unknown."
        );
        setMarketStatusDisplay("Unknown");
        setMarketStatusMessage(
          quote?.market_status_message || "Market status currently unavailable."
        );
        lastApiTimestampRef.current = quote?.api_timestamp ?? null;
        return;
      }

      lastApiTimestampRef.current = quote.api_timestamp;
      setMarketStatusMessage(
        quote.market_status_message ||
          (quote.is_market_open ? "Market is Open" : "Market is Closed")
      );
      console.log(
        `Page: updateDisplayStatus - is_market_open: ${quote.is_market_open}, message: ${quote.market_status_message}`
      );

      if (quote.is_market_open) {
        console.log(
          "Page: updateDisplayStatus - Market IS OPEN according to data."
        );
        // Ensure api_timestamp is valid for calculation
        const now = Date.now();
        const apiTimeMillis = quote.api_timestamp * 1000;
        const diffMinutes = (now - apiTimeMillis) / (1000 * 60);
        if (diffMinutes > 15) {
          console.log(
            "Page: updateDisplayStatus - Data is stale (>15min), setting to Delayed."
          );
          setMarketStatusDisplay("Delayed");
        } else {
          console.log(
            "Page: updateDisplayStatus - Data is fresh, setting to Open."
          );
          setMarketStatusDisplay("Open");
        }
      } else {
        console.log(
          "Page: updateDisplayStatus - Market IS CLOSED according to data."
        );
        setMarketStatusDisplay("Closed");
      }
    };

    const processQuoteData = (
      quoteData: LiveQuoteIndicatorDBRow, // Now expects validated data
      source: "fetch" | "realtime"
    ) => {
      if (!quoteData) return;
      console.log(
        `Page: processQuoteData (source: ${source}) called with:`,
        JSON.stringify(quoteData)
      );

      // api_timestamp is guaranteed by Zod schema to be a number
      const priceTimestamp = new Date(quoteData.api_timestamp * 1000);
      if (isNaN(priceTimestamp.getTime())) {
        console.error(
          "Page: processQuoteData - Invalid priceTimestamp from api_timestamp. Skipping update.",
          quoteData
        );
        return;
      }

      updateDisplayStatus(quoteData);

      const newPriceCardFaceData: PriceCardFaceData = {
        symbol: quoteData.symbol,
        price: quoteData.current_price,
        timestamp: priceTimestamp,
        changePercentage: quoteData.change_percentage,
        dayChange: quoteData.day_change,
        dayLow: quoteData.day_low,
        dayHigh: quoteData.day_high,
        volume: quoteData.volume,
        dayOpen: quoteData.day_open,
        previousClose: quoteData.previous_close,
      };
      const newPriceCardBackData: PriceCardBackData = {
        explanation: `${quoteData.symbol} - Details`,
        marketCap: quoteData.market_cap,
        sma50d: quoteData.sma_50d,
        sma200d: quoteData.sma_200d,
      };

      setActiveCardsRef.current((prevActiveCards) => {
        // Ensure prevActiveCards is an array before processing
        const currentCards = Array.isArray(prevActiveCards)
          ? prevActiveCards
          : [];

        const existingCardIndex = currentCards.findIndex(
          (c) =>
            c.type === "price" &&
            (c as PriceCard).faceData.symbol === SYMBOL_TO_SUBSCRIBE
        );
        if (existingCardIndex !== -1) {
          const existingCard = currentCards[existingCardIndex] as PriceCard;

          // Validate existing card's timestamp before comparison
          const existingTimestamp = new Date(existingCard.faceData.timestamp);
          if (isNaN(existingTimestamp.getTime())) {
            console.warn(
              "Page: processQuoteData - Existing card has invalid timestamp. Overwriting.",
              existingCard
            );
          }
          if (
            source === "realtime" &&
            !isNaN(existingTimestamp.getTime()) && // Only compare if existing timestamp is valid
            priceTimestamp.getTime() <= existingTimestamp.getTime() &&
            quoteData.current_price === existingCard.faceData.price // Assumes current_price is valid number
          ) {
            console.log(
              "Page: processQuoteData - Stale/unchanged realtime data, returning prevActiveCards."
            );
            return prevActiveCards;
          }
          const updatedCard: PriceCard = {
            ...existingCard,
            faceData: newPriceCardFaceData,
            backData: newPriceCardBackData,
            appearedAt: Date.now(),
          };
          const newCards = [...currentCards];
          newCards[existingCardIndex] = updatedCard;
          if (source === "realtime" && quoteData.current_price != null) {
            // Check current_price for toFixed
            toast({
              title: "Live Card Updated!",
              description: `${
                quoteData.symbol
              }: $${quoteData.current_price.toFixed(2)}`, // Assumes symbol is valid string
            });
          }
          console.log("Page: processQuoteData - Updated existing card.");
          return newCards;
        } else {
          const newPriceCard: PriceCard = {
            id: `${SYMBOL_TO_SUBSCRIBE}-live-card`,
            symbol: quoteData.symbol,
            type: "price",
            faceData: newPriceCardFaceData,
            backData: newPriceCardBackData,
            isFlipped: false,
            appearedAt: Date.now(),
          };
          if (quoteData.current_price != null) {
            // Check current_price for toFixed
            toast({
              title: "Live Card Loaded!",
              description: `${
                quoteData.symbol
              }: $${quoteData.current_price.toFixed(2)}`, // Assumes symbol is valid string
            });
          }
          console.log("Page: processQuoteData - Created new card.");
          return [
            newPriceCard,
            ...currentCards.filter((c) => c.type !== "price"),
          ];
        }
      });
    };

    let unsubscribeFromRealtime = () => {};
    const setupSubscription = async () => {
      await fetchInitialData();
      unsubscribeFromRealtime = subscribeToQuoteUpdates(
        SYMBOL_TO_SUBSCRIBE,
        handleRealtimeUpdate
      );
    };
    const fetchInitialData = async () => {
      console.log("Page: fetchInitialData - Attempting fetch...");
      const { data, error } = await supabase
        .from("live_quote_indicators")
        .select("*")
        .eq("symbol", SYMBOL_TO_SUBSCRIBE)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") {
        console.error("Page: fetchInitialData - Error:", error);
        updateDisplayStatus(null);
      } else if (data) {
        console.log(
          "Page: fetchInitialData - Data received:",
          JSON.stringify(data)
        );
        // Validate fetched data
        const validationResult = LiveQuoteIndicatorDBSchema.safeParse(data);
        if (validationResult.success) {
          processQuoteData(validationResult.data, "fetch");
        } else {
          console.error(
            "Page: fetchInitialData - Zod validation failed:",
            validationResult.error.flatten()
          );
          updateDisplayStatus(null);
        }
      } else {
        console.log("Page: fetchInitialData - No data found.");
        // updateDisplayStatus(null) might not be needed if no data means no status to update
        // or set to a specific "No Data" status
        setMarketStatusDisplay("Unknown");
        setMarketStatusMessage("No initial data found for symbol.");
      }
    };
    const handleRealtimeUpdate = (payload: LiveQuotePayload) => {
      console.log(
        "Page: handleRealtimeUpdate - Payload received:",
        JSON.stringify(payload)
      ); // LOG Y - Entry to handleRealtimeUpdate
      if (payload.eventType === "DELETE" || !payload.new) return;

      // Validate realtime data
      const validationResult = LiveQuoteIndicatorDBSchema.safeParse(
        payload.new
      );
      if (validationResult.success) {
        processQuoteData(validationResult.data, "realtime");
      } else {
        console.error(
          "Page: handleRealtimeUpdate - Zod validation failed for payload.new:",
          validationResult.error.flatten(),
          "Payload:",
          payload.new
        );
      }
    };

    setupSubscription();
    return () => {
      unsubscribeFromRealtime();
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center p-2 bg-muted text-muted-foreground rounded-md text-sm">
        Status: <span className="font-semibold">{marketStatusDisplay}</span>
        {marketStatusMessage && (
          <span className="text-xs block">({String(marketStatusMessage)})</span>
        )}
        {(marketStatusDisplay === "Closed" ||
          marketStatusDisplay === "Delayed") &&
          lastApiTimestampRef.current &&
          !isNaN(new Date(lastApiTimestampRef.current * 1000).getTime()) && ( // Check if timestamp is valid
            <span className="text-xs block">
              Last FMP Data:
              {format(new Date(lastApiTimestampRef.current * 1000), "PP p")}
            </span>
          )}
      </div>
      <ActiveCardsSection
        activeCards={activeCards}
        setActiveCards={setActiveCards}
      />
    </div>
  );
}
