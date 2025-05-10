// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client"; // Ensure this path is correct
import {
  subscribeToQuoteUpdates,
  type LiveQuotePayload,
} from "@/lib/supabase/realtime-service"; // Ensure this path is correct
import { z } from "zod";

// Types (as provided by you)
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
  | "Fetching"
  | "Connecting"; // Added for clarity during realtime connection attempt

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
  lastApiTimestamp: number | null;
}

export function useStockData({
  symbol,
  onQuoteReceived,
}: UseStockDataProps): UseStockDataReturn {
  const [marketStatus, setMarketStatus] =
    useState<MarketStatusDisplayHook>("Fetching");
  const [marketStatusMessage, setMarketStatusMessage] = useState<string | null>(
    "Initializing..."
  );
  const [lastApiTimestamp, setLastApiTimestamp] = useState<number | null>(null);

  const unsubscribeRealtimeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Effect to track mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateDisplayStatus = useCallback(
    (quote: LiveQuoteIndicatorDBRow | null) => {
      if (!isMountedRef.current) return;

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

      setLastApiTimestamp(quote.api_timestamp);
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
    [] // State setters from useState are stable
  );

  // Memoize onQuoteReceived if it's passed as a prop to stabilize setupSubscription
  const stableOnQuoteReceived = useCallback(onQuoteReceived, [onQuoteReceived]);

  const setupSubscription = useCallback(async () => {
    if (!isMountedRef.current) return;

    console.log(
      `useStockData (${symbol}): Setting up subscription and fetching initial data...`
    );
    // 1. Clean up any existing subscription for this hook instance
    if (unsubscribeRealtimeRef.current) {
      console.log(
        `useStockData (${symbol}): Cleaning up previous subscription before new setup.`
      );
      unsubscribeRealtimeRef.current();
      unsubscribeRealtimeRef.current = null;
    }

    setMarketStatus("Fetching");
    setMarketStatusMessage(`Workspaceing data for ${symbol}...`);
    const supabase = createClient();

    // 2. Fetch initial data
    try {
      const { data, error } = await supabase
        .from("live_quote_indicators")
        .select("*")
        .eq("symbol", symbol)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .single();

      if (!isMountedRef.current) return;

      if (error && error.code !== "PGRST116") {
        // PGRST116 means no rows found, not an error for .single()
        console.error(
          `useStockData (${symbol}): Error fetching initial data:`,
          error
        );
        updateDisplayStatus(null);
        setMarketStatus("Error");
        setMarketStatusMessage("Failed to load initial data.");
      } else if (data) {
        const validationResult = LiveQuoteIndicatorDBSchema.safeParse(data);
        if (validationResult.success) {
          stableOnQuoteReceived(validationResult.data, "fetch");
          updateDisplayStatus(validationResult.data);
        } else {
          console.error(
            `useStockData (${symbol}): Zod validation failed for fetched data:`,
            validationResult.error.flatten()
          );
          updateDisplayStatus(null);
          setMarketStatus("Error");
          setMarketStatusMessage("Received invalid data format from server.");
        }
      } else {
        updateDisplayStatus(null); // No data found
        setMarketStatus("Unknown");
        setMarketStatusMessage(`No initial data found for ${symbol}.`);
      }
    } catch (fetchError) {
      if (!isMountedRef.current) return;
      console.error(
        `useStockData (${symbol}): Exception during initial data fetch:`,
        fetchError
      );
      setMarketStatus("Error");
      setMarketStatusMessage(
        "A network error occurred while fetching initial data."
      );
    }

    if (!isMountedRef.current) return; // Check again before subscribing

    // 3. Establish new Realtime Subscription
    console.log(
      `useStockData (${symbol}): Attempting to establish new realtime subscription.`
    );
    setMarketStatus("Connecting");
    setMarketStatusMessage("Connecting to real-time updates...");

    unsubscribeRealtimeRef.current = subscribeToQuoteUpdates(
      symbol,
      (payload) => {
        if (!isMountedRef.current) return; // Check before processing payload

        if (
          payload.eventType === "DELETE" ||
          !payload.new ||
          (payload.new as LiveQuoteIndicatorDBRow).symbol !== symbol
        ) {
          return;
        }
        const validationResult = LiveQuoteIndicatorDBSchema.safeParse(
          payload.new
        );
        if (validationResult.success) {
          stableOnQuoteReceived(validationResult.data, "realtime");
          updateDisplayStatus(validationResult.data); // Update market status based on new realtime data
        } else {
          console.error(
            `useStockData (${symbol}): Realtime Zod validation failed:`,
            validationResult.error.flatten(),
            "Payload:",
            payload.new
          );
        }
      }
    );
  }, [symbol, stableOnQuoteReceived, updateDisplayStatus]);

  useEffect(() => {
    setupSubscription(); // Initial setup when component mounts or symbol/callbacks change

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isMountedRef.current) {
        console.log(
          `useStockData (${symbol}): Page became visible. Re-initiating subscription setup.`
        );
        // This will clean up the old (if any) and set up a fresh one.
        setupSubscription();
      }
    };

    const handleOnlineStatus = () => {
      if (isMountedRef.current) {
        console.log(
          `useStockData (${symbol}): Network came online. Re-initiating subscription setup.`
        );
        // This will clean up the old (if any) and set up a fresh one.
        setupSubscription();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnlineStatus);

    // Cleanup function for the main effect
    return () => {
      // isMountedRef will be set to false by its own useEffect cleanup
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnlineStatus);
      if (unsubscribeRealtimeRef.current) {
        console.log(
          `useStockData (${symbol}): Cleaning up subscription on unmount or dependency change.`
        );
        unsubscribeRealtimeRef.current();
        unsubscribeRealtimeRef.current = null;
      }
    };
  }, [symbol, setupSubscription]); // setupSubscription is now a dependency

  return { marketStatus, marketStatusMessage, lastApiTimestamp };
}
