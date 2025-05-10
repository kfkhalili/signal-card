// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client"; // Used for initial fetch
import {
  subscribeToQuoteUpdates,
  type LiveQuotePayload,
  type SubscriptionStatus,
  type LiveQuoteIndicatorDBRow, // Now imported
  LiveQuoteIndicatorDBSchema, // Now imported
} from "@/lib/supabase/realtime-service"; // Adjust path as needed
// Zod is used by LiveQuoteIndicatorDBSchema which is imported, so no direct z import needed here unless used otherwise.

// This type is for UI display states managed by the hook
export type MarketStatusDisplayHook =
  | "Open"
  | "Closed"
  | "Delayed"
  | "Unknown"
  | "Error"
  | "Fetching"
  | "Connecting"
  | "Live";

interface UseStockDataProps {
  symbol: string;
  onQuoteReceived: (
    quoteData: LiveQuoteIndicatorDBRow, // Uses imported type
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
  const lastGoodQuoteRef = useRef<LiveQuoteIndicatorDBRow | null>(null);

  const unsubscribeRealtimeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateDisplayStatus = useCallback(
    (
      quote: LiveQuoteIndicatorDBRow | null,
      context?: "fetch" | "realtime" | "status_update"
    ) => {
      if (!isMountedRef.current) return;

      if (quote) {
        lastGoodQuoteRef.current = quote;
        setLastApiTimestamp(quote.api_timestamp);
        const defaultMessageBase = quote.is_market_open
          ? "Market is Open"
          : "Market is Closed";
        let currentMarketStatus: MarketStatusDisplayHook = "Unknown";

        if (quote.is_market_open) {
          const apiTimeMillis = quote.api_timestamp * 1000;
          const diffMinutes = (Date.now() - apiTimeMillis) / (1000 * 60);
          currentMarketStatus = diffMinutes > 15 ? "Delayed" : "Open";
          setMarketStatusMessage(
            quote.market_status_message ||
              (diffMinutes > 15 ? "Data is delayed." : defaultMessageBase)
          );
        } else {
          currentMarketStatus = "Closed";
          setMarketStatusMessage(
            quote.market_status_message || defaultMessageBase
          );
        }

        if (
          marketStatusRef.current === "Fetching" ||
          marketStatusRef.current === "Connecting" ||
          marketStatusRef.current === "Error" ||
          context === "realtime" ||
          context === "fetch"
        ) {
          setMarketStatus(currentMarketStatus);
        }
      } else {
        lastGoodQuoteRef.current = null;
        setMarketStatus("Unknown");
        setMarketStatusMessage(
          context === "fetch" && symbol
            ? `No initial data found for ${symbol}.`
            : "Market status currently unavailable."
        );
        setLastApiTimestamp(null);
      }
    },
    [symbol]
  );

  const stableOnQuoteReceived = useCallback(onQuoteReceived, [onQuoteReceived]);

  const handleSubscriptionStatusChange = useCallback(
    (status: SubscriptionStatus, err?: Error) => {
      if (!isMountedRef.current) return;
      console.log(
        `useStockData (${symbol}): Realtime Channel Status Received: ${status}`,
        err || ""
      );

      switch (status) {
        case "SUBSCRIBED":
          if (lastGoodQuoteRef.current) {
            updateDisplayStatus(lastGoodQuoteRef.current, "status_update");
            setMarketStatusMessage((prev) => {
              const baseStatus =
                marketStatusRef.current === "Delayed"
                  ? "Data is delayed"
                  : marketStatusRef.current === "Open"
                  ? "Market is Open"
                  : marketStatusRef.current === "Closed"
                  ? "Market is Closed"
                  : "Status based on data";
              return `${baseStatus} (Real-time active)`;
            });
            if (marketStatusRef.current === "Connecting") {
              // If it was connecting and now subscribed, ensure status reflects data.
              // updateDisplayStatus should have already set it based on lastGoodQuoteRef
            }
          } else {
            setMarketStatus("Live");
            setMarketStatusMessage("Real-time connected, waiting for data...");
          }
          break;
        case "CHANNEL_ERROR":
          setMarketStatus("Error");
          setMarketStatusMessage(
            `Real-time connection error. ${err?.message || "Retrying..."}`
          );
          break;
        case "TIMED_OUT":
          setMarketStatus("Error");
          setMarketStatusMessage(
            "Real-time connection timed out. Will attempt to reconnect."
          );
          break;
        case "CLOSED":
          setMarketStatus("Error");
          setMarketStatusMessage(
            "Real-time connection closed. Will attempt to reconnect on interaction."
          );
          break;
      }
    },
    [symbol, updateDisplayStatus]
  );

  const marketStatusRef = useRef(marketStatus);
  useEffect(() => {
    marketStatusRef.current = marketStatus;
  }, [marketStatus]);

  const setupSubscription = useCallback(async () => {
    if (!isMountedRef.current) return;

    console.log(
      `useStockData (${symbol}): Setting up subscription and fetching initial data...`
    );
    if (unsubscribeRealtimeRef.current) {
      unsubscribeRealtimeRef.current();
      unsubscribeRealtimeRef.current = null;
    }

    setMarketStatus("Fetching");
    setMarketStatusMessage(`Workspaceing initial data for ${symbol}...`);
    const supabase = createClient();

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
        updateDisplayStatus(null, "fetch");
        setMarketStatus("Error");
        setMarketStatusMessage("Failed to load initial data.");
      } else if (data) {
        const validationResult = LiveQuoteIndicatorDBSchema.safeParse(data);
        if (validationResult.success) {
          stableOnQuoteReceived(validationResult.data, "fetch");
          updateDisplayStatus(validationResult.data, "fetch");
        } else {
          updateDisplayStatus(null, "fetch");
          setMarketStatus("Error");
          setMarketStatusMessage("Invalid data format received.");
        }
      } else {
        updateDisplayStatus(null, "fetch");
      }
    } catch (fetchError) {
      if (!isMountedRef.current) return;
      updateDisplayStatus(null, "fetch");
      setMarketStatus("Error");
      setMarketStatusMessage("Network error during initial data fetch.");
    }

    if (!isMountedRef.current) return;

    // After fetch attempt, if not in an Error state, try connecting to realtime.
    // The current marketStatus reflects the outcome of the fetch.
    if (marketStatusRef.current !== "Error") {
      setMarketStatus("Connecting"); // Explicitly set to Connecting before subscribe
      setMarketStatusMessage("Connecting to real-time updates...");
    } else {
      // If fetch resulted in error, don't say "Connecting", keep error message.
    }

    unsubscribeRealtimeRef.current = subscribeToQuoteUpdates(
      symbol,
      (payload) => {
        if (
          !isMountedRef.current ||
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
          updateDisplayStatus(validationResult.data, "realtime");
        } else {
          console.error(
            `useStockData (${symbol}): Realtime Zod validation failed:`,
            validationResult.error.flatten(),
            "Payload:",
            payload.new
          );
        }
      },
      handleSubscriptionStatusChange
    );
  }, [
    symbol,
    stableOnQuoteReceived,
    updateDisplayStatus,
    handleSubscriptionStatusChange,
  ]);

  useEffect(() => {
    setupSubscription();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isMountedRef.current) {
        console.log(
          `useStockData (${symbol}): Page became visible. Re-running setupSubscription.`
        );
        setTimeout(() => {
          if (isMountedRef.current) setupSubscription();
        }, 500);
      }
    };
    const handleOnlineStatus = () => {
      if (isMountedRef.current && navigator.onLine) {
        console.log(
          `useStockData (${symbol}): Network came online. Re-running setupSubscription.`
        );
        setTimeout(() => {
          if (isMountedRef.current) setupSubscription();
        }, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnlineStatus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnlineStatus);
      if (unsubscribeRealtimeRef.current) {
        unsubscribeRealtimeRef.current();
        unsubscribeRealtimeRef.current = null;
      }
    };
  }, [symbol, setupSubscription]);

  return { marketStatus, marketStatusMessage, lastApiTimestamp };
}
