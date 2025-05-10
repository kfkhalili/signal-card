"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import useLocalStorage from "@/hooks/use-local-storage";
import { format } from "date-fns";
import { z } from "zod";

// --- Type Imports ---
import type { DisplayableCard } from "@/components/game/types"; // Corrected path
import type {
  PriceCardData,
  PriceCardFaceData,
  PriceCardSpecificBackData,
  PriceCardSnapshotSpecificBackData, // Added for rehydration logic
} from "@/components/game/cards/price-card/price-card.types";

import ActiveCardsSection from "@/components/game/active-cards-section";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  subscribeToQuoteUpdates,
  type LiveQuotePayload,
} from "@/lib/supabase/realtime-service";

const INITIAL_ACTIVE_CARDS: DisplayableCard[] = [];
const SYMBOL_TO_SUBSCRIBE: string = "AAPL"; // Example symbol

// Represents the raw data structure from the database/API
interface LiveQuoteIndicatorDBRow {
  id: string;
  symbol: string;
  current_price: number;
  api_timestamp: number; // Unix timestamp (seconds from API)
  fetched_at: string; // ISO string date (when DB row was last updated)
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

// Zod schema for runtime validation of data from DB/API
const LiveQuoteIndicatorDBSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  current_price: z.number(),
  api_timestamp: z.number(),
  fetched_at: z.string(),
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
  const rehydrateCard = (cardFromStorage: any): DisplayableCard | null => {
    if (
      !cardFromStorage ||
      typeof cardFromStorage.id !== "string" ||
      !cardFromStorage.type ||
      !cardFromStorage.symbol
    ) {
      console.warn(
        "Invalid card structure from storage, skipping:",
        cardFromStorage
      );
      return null;
    }

    let finalCreatedAt: number;
    if (typeof cardFromStorage.createdAt === "string") {
      finalCreatedAt = new Date(cardFromStorage.createdAt).getTime();
    } else if (typeof cardFromStorage.createdAt === "number") {
      finalCreatedAt = cardFromStorage.createdAt;
    } else {
      finalCreatedAt = Date.now(); // Default if missing or invalid
    }

    const commonProps = {
      id: cardFromStorage.id as string,
      symbol: cardFromStorage.symbol as string,
      isFlipped:
        typeof cardFromStorage.isFlipped === "boolean"
          ? cardFromStorage.isFlipped
          : false,
      createdAt: finalCreatedAt,
    };

    if (cardFromStorage.type === "price") {
      const originalFaceData = cardFromStorage.faceData || {};
      let timestamp = originalFaceData.timestamp;
      if (typeof timestamp === "string") {
        timestamp = new Date(timestamp).getTime();
      } else if (typeof timestamp !== "number" || isNaN(timestamp)) {
        // Check for NaN as well
        timestamp = null;
      }

      const rehydratedFaceData: PriceCardFaceData = {
        timestamp: timestamp,
        price:
          typeof originalFaceData.price === "number"
            ? originalFaceData.price
            : null,
        dayChange:
          typeof originalFaceData.dayChange === "number"
            ? originalFaceData.dayChange
            : null,
        changePercentage:
          typeof originalFaceData.changePercentage === "number"
            ? originalFaceData.changePercentage
            : null,
        dayHigh:
          typeof originalFaceData.dayHigh === "number"
            ? originalFaceData.dayHigh
            : null,
        dayLow:
          typeof originalFaceData.dayLow === "number"
            ? originalFaceData.dayLow
            : null,
        dayOpen:
          typeof originalFaceData.dayOpen === "number"
            ? originalFaceData.dayOpen
            : null,
        previousClose:
          typeof originalFaceData.previousClose === "number"
            ? originalFaceData.previousClose
            : null,
        volume:
          typeof originalFaceData.volume === "number"
            ? originalFaceData.volume
            : null,
      };

      const originalBackData = cardFromStorage.backData || {};
      const rehydratedBackData: PriceCardSpecificBackData = {
        explanation:
          typeof originalBackData.explanation === "string"
            ? originalBackData.explanation
            : "",
        marketCap:
          typeof originalBackData.marketCap === "number"
            ? originalBackData.marketCap
            : null,
        sma50d:
          typeof originalBackData.sma50d === "number"
            ? originalBackData.sma50d
            : null,
        sma200d:
          typeof originalBackData.sma200d === "number"
            ? originalBackData.sma200d
            : null,
      };

      return {
        ...commonProps,
        type: "price",
        faceData: rehydratedFaceData,
        backData: rehydratedBackData,
      };
    } else if (cardFromStorage.type === "price_snapshot") {
      let snapshotTime = cardFromStorage.snapshotTime;
      if (typeof snapshotTime === "string") {
        snapshotTime = new Date(snapshotTime).getTime();
      } else if (typeof snapshotTime !== "number" || isNaN(snapshotTime)) {
        // Check for NaN
        snapshotTime = Date.now();
      }

      const originalSnapshotBackData = cardFromStorage.backData || {};
      const rehydratedSnapshotBackData: PriceCardSnapshotSpecificBackData = {
        explanation:
          typeof originalSnapshotBackData.explanation === "string"
            ? originalSnapshotBackData.explanation
            : "",
        discoveredReason:
          typeof originalSnapshotBackData.discoveredReason === "string"
            ? originalSnapshotBackData.discoveredReason
            : undefined,
      };

      return {
        ...commonProps,
        type: "price_snapshot",
        capturedPrice:
          typeof cardFromStorage.capturedPrice === "number"
            ? cardFromStorage.capturedPrice
            : 0,
        snapshotTime: snapshotTime,
        backData: rehydratedSnapshotBackData,
      };
    }
    console.warn("Unknown card type during rehydration:", cardFromStorage.type);
    return null;
  };

  const [initialCardsFromStorage, setCardsInLocalStorage] = useLocalStorage<
    DisplayableCard[]
  >(
    "finSignal-activeCards-v2", // Versioned key
    INITIAL_ACTIVE_CARDS
  );

  const [activeCards, setActiveCards] = useState<DisplayableCard[]>(() => {
    if (Array.isArray(initialCardsFromStorage)) {
      return initialCardsFromStorage
        .map(rehydrateCard)
        .filter(Boolean) as DisplayableCard[];
    }
    return INITIAL_ACTIVE_CARDS;
  });

  const [marketStatusDisplay, setMarketStatusDisplay] =
    useState<MarketStatusDisplay>("Unknown");
  const [marketStatusMessage, setMarketStatusMessage] = useState<string | null>(
    null
  );
  const lastApiTimestampRef = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCardsInLocalStorage(activeCards);
  }, [activeCards, setCardsInLocalStorage]);

  const setActiveCardsRef = useRef(setActiveCards);
  useEffect(() => {
    setActiveCardsRef.current = setActiveCards;
  }, [setActiveCards]);

  const updateDisplayStatus = useCallback(
    (quote: LiveQuoteIndicatorDBRow | null) => {
      if (
        !quote ||
        quote.is_market_open === null ||
        quote.is_market_open === undefined
      ) {
        setMarketStatusDisplay("Unknown");
        setMarketStatusMessage(
          quote?.market_status_message || "Market status currently unavailable."
        );
        lastApiTimestampRef.current = quote?.api_timestamp ?? null;
        return;
      }
      lastApiTimestampRef.current = quote.api_timestamp;
      const defaultMessage = quote.is_market_open
        ? "Market is Open"
        : "Market is Closed";
      setMarketStatusMessage(quote.market_status_message || defaultMessage);
      if (quote.is_market_open) {
        const apiTimeMillis = quote.api_timestamp * 1000;
        const diffMinutes = (Date.now() - apiTimeMillis) / (1000 * 60);
        setMarketStatusDisplay(diffMinutes > 15 ? "Delayed" : "Open");
      } else {
        setMarketStatusDisplay("Closed");
      }
    },
    []
  ); // setMarketStatusDisplay, setMarketStatusMessage are stable

  const processQuoteData = useCallback(
    (quoteData: LiveQuoteIndicatorDBRow, source: "fetch" | "realtime") => {
      if (!quoteData) return;
      const apiTimestampMillis = quoteData.api_timestamp * 1000;
      if (isNaN(apiTimestampMillis)) {
        console.error(
          "Page: processQuoteData - Invalid api_timestamp. Skipping update.",
          quoteData
        );
        return;
      }
      updateDisplayStatus(quoteData);

      const newFaceData: PriceCardFaceData = {
        timestamp: apiTimestampMillis,
        price: quoteData.current_price,
        changePercentage: quoteData.change_percentage ?? null,
        dayChange: quoteData.day_change ?? null,
        dayLow: quoteData.day_low ?? null,
        dayHigh: quoteData.day_high ?? null,
        volume: quoteData.volume ?? null,
        dayOpen: quoteData.day_open ?? null,
        previousClose: quoteData.previous_close ?? null,
      };
      const newBackData: PriceCardSpecificBackData = {
        explanation: `${quoteData.symbol} financial data. Updated: ${new Date(
          apiTimestampMillis
        ).toLocaleString()}`,
        marketCap: quoteData.market_cap ?? null,
        sma50d: quoteData.sma_50d ?? null,
        sma200d: quoteData.sma_200d ?? null,
      };

      setActiveCardsRef.current((prevActiveCards) => {
        const currentCards = Array.isArray(prevActiveCards)
          ? prevActiveCards
          : [];
        const existingCardIndex = currentCards.findIndex(
          (c) => c.type === "price" && c.symbol === quoteData.symbol
        );

        if (existingCardIndex !== -1) {
          const existingPriceCard = currentCards[
            existingCardIndex
          ] as PriceCardData & { isFlipped: boolean };
          if (
            source === "realtime" &&
            existingPriceCard.faceData.timestamp &&
            apiTimestampMillis <= existingPriceCard.faceData.timestamp &&
            quoteData.current_price === existingPriceCard.faceData.price
          ) {
            return prevActiveCards;
          }
          const updatedCard: PriceCardData & { isFlipped: boolean } = {
            id: existingPriceCard.id,
            type: existingPriceCard.type,
            symbol: existingPriceCard.symbol,
            createdAt: existingPriceCard.createdAt,
            isFlipped: existingPriceCard.isFlipped,
            faceData: newFaceData,
            backData: newBackData,
          };
          const newCards = [...currentCards];
          newCards[existingCardIndex] = updatedCard;

          if (source === "realtime" && quoteData.current_price != null) {
            setTimeout(() => {
              // Defer toast call
              toast({
                title: "Live Card Updated!",
                description: `${
                  quoteData.symbol
                }: $${quoteData.current_price.toFixed(2)}`,
              });
            }, 0);
          }
          return newCards;
        } else {
          const newPriceCard: DisplayableCard = {
            id: `${quoteData.symbol}-live-price-${Date.now()}`,
            type: "price",
            symbol: quoteData.symbol,
            createdAt: Date.now(),
            faceData: newFaceData,
            backData: newBackData,
            isFlipped: false,
          };
          if (quoteData.current_price != null) {
            setTimeout(() => {
              // Defer toast call
              toast({
                title: "Live Card Loaded!",
                description: `${
                  quoteData.symbol
                }: $${quoteData.current_price.toFixed(2)}`,
              });
            }, 0);
          }
          return [
            newPriceCard,
            ...currentCards.filter(
              (c) => !(c.type === "price" && c.symbol === quoteData.symbol)
            ),
          ];
        }
      });
    },
    [updateDisplayStatus, toast]
  );

  useEffect(() => {
    const supabase = createClient();
    let unsubscribeRealtime: () => void = () => {};

    const fetchInitialData = async () => {
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
        setMarketStatusDisplay("Unknown");
        setMarketStatusMessage(
          `No initial data found for ${SYMBOL_TO_SUBSCRIBE}.`
        );
      }
    };

    const handleRealtimeUpdate = (payload: LiveQuotePayload) => {
      if (
        payload.eventType === "DELETE" ||
        !payload.new ||
        payload.new.symbol !== SYMBOL_TO_SUBSCRIBE
      ) {
        return;
      }
      const validationResult = LiveQuoteIndicatorDBSchema.safeParse(
        payload.new
      );
      if (validationResult.success) {
        processQuoteData(validationResult.data, "realtime");
      } else {
        console.error(
          "Page: handleRealtimeUpdate - Zod validation failed:",
          validationResult.error.flatten(),
          "Payload:",
          payload.new
        );
      }
    };

    const setupSubscription = async () => {
      await fetchInitialData();
      const sub = subscribeToQuoteUpdates(
        SYMBOL_TO_SUBSCRIBE,
        handleRealtimeUpdate
      );
      unsubscribeRealtime = sub; // Corrected: sub is the unsubscribe function
    };

    setupSubscription();

    return () => {
      if (typeof unsubscribeRealtime === "function") {
        unsubscribeRealtime();
      }
    };
  }, [processQuoteData, updateDisplayStatus]); // Dependencies for the main effect

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="text-center p-2 bg-muted text-muted-foreground rounded-md text-sm shadow">
        <p>
          Status: <span className="font-semibold">{marketStatusDisplay}</span>
          {marketStatusMessage && (
            <span className="text-xs block italic">
              ({String(marketStatusMessage)})
            </span>
          )}
        </p>
        {(marketStatusDisplay === "Closed" ||
          marketStatusDisplay === "Delayed") &&
          lastApiTimestampRef.current &&
          !isNaN(new Date(lastApiTimestampRef.current * 1000).getTime()) && (
            <p className="text-xs block mt-1">
              Last API Data:{" "}
              {format(new Date(lastApiTimestampRef.current * 1000), "PP p")}
            </p>
          )}
      </div>

      <ActiveCardsSection
        activeCards={activeCards}
        setActiveCards={setActiveCards}
      />
    </div>
  );
}
