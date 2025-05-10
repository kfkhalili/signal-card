// src/hooks/useStockData.ts
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client"; // Ensure this path is correct
import {
  subscribeToQuoteUpdates,
  type LiveQuotePayload,
} from "@/lib/supabase/realtime-service"; // Ensure this path is correct
import { z } from "zod";

// Define these types here or import from a shared location
export interface LiveQuoteIndicatorDBRow {
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

export const LiveQuoteIndicatorDBSchema = z.object({
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

export type MarketStatusDisplayHook =
  | "Open"
  | "Closed"
  | "Delayed"
  | "Unknown"
  | "Error"
  | "Fetching";

interface UseStockDataProps {
  symbol: string;
  onQuoteReceived: (
    quoteData: LiveQuoteIndicatorDBRow,
    source: "fetch" | "realtime"
  ) => void;
}

interface UseStockDataReturn {
  marketStatus: MarketStatusDisplayHook;
  marketStatusMessage: string | null;
  lastApiTimestamp: number | null; // Store as Unix timestamp (seconds)
}

export function useStockData({
  symbol,
  onQuoteReceived,
}: UseStockDataProps): UseStockDataReturn {
  const [marketStatus, setMarketStatus] =
    useState<MarketStatusDisplayHook>("Fetching");
  const [marketStatusMessage, setMarketStatusMessage] = useState<string | null>(
    "Fetching initial data..."
  );
  const [lastApiTimestamp, setLastApiTimestamp] = useState<number | null>(null);

  const updateDisplayStatus = useCallback(
    (quote: LiveQuoteIndicatorDBRow | null) => {
      if (
        !quote ||
        quote.is_market_open === null ||
        quote.is_market_open === undefined
      ) {
        setMarketStatus("Unknown");
        setMarketStatusMessage(
          quote?.market_status_message || "Market status currently unavailable."
        );
        setLastApiTimestamp(quote?.api_timestamp ?? null);
        return;
      }

      setLastApiTimestamp(quote.api_timestamp); // Store as seconds
      const defaultMessage = quote.is_market_open
        ? "Market is Open"
        : "Market is Closed";
      setMarketStatusMessage(quote.market_status_message || defaultMessage);

      if (quote.is_market_open) {
        const apiTimeMillis = quote.api_timestamp * 1000;
        const diffMinutes = (Date.now() - apiTimeMillis) / (1000 * 60);
        setMarketStatus(diffMinutes > 15 ? "Delayed" : "Open");
      } else {
        setMarketStatus("Closed");
      }
    },
    []
  ); // setMarketStatus, setMarketStatusMessage, setLastApiTimestamp are stable

  useEffect(() => {
    const supabase = createClient();
    let unsubscribeRealtime: () => void = () => {};
    let isMounted = true; // To prevent state updates on unmounted component

    const fetchInitialData = async () => {
      if (!isMounted) return;
      setMarketStatus("Fetching");
      setMarketStatusMessage(`Workspaceing data for ${symbol}...`);

      const { data, error } = await supabase
        .from("live_quote_indicators")
        .select("*")
        .eq("symbol", symbol)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .single();

      if (!isMounted) return;

      if (error && error.code !== "PGRST116") {
        console.error(
          `useStockData (${symbol}): fetchInitialData - Error:`,
          error
        );
        setMarketStatus("Error");
        setMarketStatusMessage("Failed to fetch initial data.");
        updateDisplayStatus(null); // To clear timestamp if needed
      } else if (data) {
        const validationResult = LiveQuoteIndicatorDBSchema.safeParse(data);
        if (validationResult.success) {
          onQuoteReceived(validationResult.data, "fetch");
          updateDisplayStatus(validationResult.data); // Update status based on fetched data
        } else {
          console.error(
            `useStockData (${symbol}): fetchInitialData - Zod validation failed:`,
            validationResult.error.flatten()
          );
          setMarketStatus("Error");
          setMarketStatusMessage("Received invalid data format.");
          updateDisplayStatus(null);
        }
      } else {
        setMarketStatus("Unknown");
        setMarketStatusMessage(`No initial data found for ${symbol}.`);
        updateDisplayStatus(null);
      }
    };

    const handleRealtimeUpdate = (payload: LiveQuotePayload) => {
      if (
        !isMounted ||
        payload.eventType === "DELETE" ||
        !payload.new ||
        payload.new.symbol !== symbol
      ) {
        return;
      }
      const validationResult = LiveQuoteIndicatorDBSchema.safeParse(
        payload.new
      );
      if (validationResult.success) {
        onQuoteReceived(validationResult.data, "realtime");
        updateDisplayStatus(validationResult.data); // Update status based on realtime data
      } else {
        console.error(
          `useStockData (${symbol}): handleRealtimeUpdate - Zod validation failed:`,
          validationResult.error.flatten(),
          "Payload:",
          payload.new
        );
      }
    };

    const setupSubscription = async () => {
      await fetchInitialData();
      if (isMounted) {
        const sub = subscribeToQuoteUpdates(symbol, handleRealtimeUpdate);
        unsubscribeRealtime = sub; // Assuming sub is the unsubscribe function
      }
    };

    setupSubscription();

    return () => {
      isMounted = false;
      if (typeof unsubscribeRealtime === "function") {
        unsubscribeRealtime();
      }
    };
  }, [symbol, onQuoteReceived, updateDisplayStatus]);

  return { marketStatus, marketStatusMessage, lastApiTimestamp };
}
