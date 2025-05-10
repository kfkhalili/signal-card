// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client"; // Your client creation function
import { type SupabaseClient } from "@supabase/supabase-js"; // Import SupabaseClient type directly
import {
  subscribeToQuoteUpdates,
  type LiveQuotePayload,
  type SubscriptionStatus,
  type LiveQuoteIndicatorDBRow,
  LiveQuoteIndicatorDBSchema,
} from "@/lib/supabase/realtime-service";
import { z } from "zod";

// Define ProfileDBRow and Schema here
export interface ProfileDBRow {
  id: string; // UUID
  symbol: string;
  company_name?: string | null;
  image?: string | null; // This is the logo URL
  sector?: string | null;
  industry?: string | null;
  website?: string | null;
  description?: string | null;
  country?: string | null;
}

export const ProfileDBSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string(),
  company_name: z.string().nullable().optional(),
  image: z.string().url().nullable().optional(),
  sector: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  description: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

export interface CombinedQuoteData extends LiveQuoteIndicatorDBRow {
  companyName?: string | null;
  logoUrl?: string | null;
}

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
    quoteData: CombinedQuoteData,
    source: "fetch" | "realtime"
  ) => void;
}

interface UseStockDataReturn {
  marketStatus: MarketStatusDisplayHook;
  marketStatusMessage: string | null;
  lastApiTimestamp: number | null;
  profileData?: ProfileDBRow | null;
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
  const [profileData, setProfileData] = useState<ProfileDBRow | null>(null);

  const lastGoodQuoteRef = useRef<LiveQuoteIndicatorDBRow | null>(null);
  const unsubscribeRealtimeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef<boolean>(true);
  // Initialize Supabase client using your createClient function
  const supabaseClientRef = useRef<SupabaseClient>(createClient());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!symbol) {
      setProfileData(null);
      return;
    }
    let active = true;
    const fetchProfile = async () => {
      console.log(`useStockData (${symbol}): Fetching profile data...`);
      try {
        const { data, error } = await supabaseClientRef.current // Use the ref
          .from("profiles")
          .select(
            "id, symbol, company_name, image, sector, industry, website, description, country"
          )
          .eq("symbol", symbol)
          .maybeSingle();

        if (!active || !isMountedRef.current) return;

        if (error) {
          console.error(
            `useStockData (${symbol}): Error fetching profile data:`,
            error
          );
          setProfileData(null);
        } else if (data) {
          const validationResult = ProfileDBSchema.safeParse(data);
          if (validationResult.success) {
            setProfileData(validationResult.data);
            console.log(
              `useStockData (${symbol}): Profile data loaded:`,
              validationResult.data.company_name
            );
          } else {
            console.error(
              `useStockData (${symbol}): Zod validation failed for profile data:`,
              validationResult.error.flatten()
            );
            setProfileData(null);
          }
        } else {
          console.warn(
            `useStockData (${symbol}): No profile data found for symbol.`
          );
          setProfileData(null);
        }
      } catch (err) {
        if (!active || !isMountedRef.current) return;
        console.error(
          `useStockData (${symbol}): Exception during profile fetch:`,
          err
        );
        setProfileData(null);
      }
    };
    fetchProfile();
    return () => {
      active = false;
    };
  }, [symbol]);

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

  const stableOnQuoteReceived = useCallback(
    (quoteData: LiveQuoteIndicatorDBRow, source: "fetch" | "realtime") => {
      const combinedData: CombinedQuoteData = {
        ...quoteData,
        companyName: profileData?.company_name ?? null,
        logoUrl: profileData?.image ?? null,
      };
      onQuoteReceived(combinedData, source);
    },
    [profileData, onQuoteReceived]
  );

  const marketStatusRef = useRef(marketStatus);
  useEffect(() => {
    marketStatusRef.current = marketStatus;
  }, [marketStatus]);

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
            const currentDataDrivenStatus = marketStatusRef.current;
            setMarketStatusMessage((prev) => {
              const baseStatusMessage =
                currentDataDrivenStatus === "Delayed"
                  ? "Data is delayed"
                  : currentDataDrivenStatus === "Open"
                  ? "Market is Open"
                  : currentDataDrivenStatus === "Closed"
                  ? "Market is Closed"
                  : "Status based on data";
              return `${baseStatusMessage} (Real-time active)`;
            });
            if (
              ["Connecting", "Fetching", "Error"].includes(
                marketStatusRef.current
              )
            ) {
              const currentData = lastGoodQuoteRef.current;
              const isMarketOpen = currentData.is_market_open;
              let newStatus: MarketStatusDisplayHook = isMarketOpen
                ? "Open"
                : "Closed";
              if (isMarketOpen) {
                const apiTimeMillis = currentData.api_timestamp * 1000;
                const diffMinutes = (Date.now() - apiTimeMillis) / (1000 * 60);
                if (diffMinutes > 15) newStatus = "Delayed";
              }
              setMarketStatus(newStatus);
            }
          } else {
            setMarketStatus("Live");
            setMarketStatusMessage("Real-time connected, awaiting data...");
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

  const setupSubscription = useCallback(async () => {
    if (!isMountedRef.current) return;
    if (!profileData && symbol) {
      console.log(
        `useStockData (${symbol}): Profile data not yet loaded. Initial quote fetch might occur.`
      );
      if (!unsubscribeRealtimeRef.current) {
        setMarketStatus("Fetching");
        setMarketStatusMessage(
          `Fetching initial quote for ${symbol}... (Profile pending)`
        );
        try {
          const { data, error } = await supabaseClientRef.current
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
            setMarketStatusMessage("Failed to load initial quote.");
          } else if (data) {
            const validationResult = LiveQuoteIndicatorDBSchema.safeParse(data);
            if (validationResult.success) {
              stableOnQuoteReceived(validationResult.data, "fetch");
              updateDisplayStatus(validationResult.data, "fetch");
            } else {
              updateDisplayStatus(null, "fetch");
              setMarketStatus("Error");
              setMarketStatusMessage("Invalid quote data format.");
            }
          } else {
            updateDisplayStatus(null, "fetch");
          }
        } catch (e) {
          if (isMountedRef.current) {
            updateDisplayStatus(null, "fetch");
            setMarketStatus("Error");
            setMarketStatusMessage("Network error on initial quote fetch.");
          }
        }
      }
      return;
    }

    console.log(
      `useStockData (${symbol}): Setting up subscription (profile data available).`
    );
    if (unsubscribeRealtimeRef.current) {
      unsubscribeRealtimeRef.current();
      unsubscribeRealtimeRef.current = null;
    }

    setMarketStatus("Fetching");
    setMarketStatusMessage(`Refreshing data for ${symbol}...`);
    try {
      const { data, error } = await supabaseClientRef.current
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
        setMarketStatusMessage("Failed to refresh data.");
      } else if (data) {
        const validationResult = LiveQuoteIndicatorDBSchema.safeParse(data);
        if (validationResult.success) {
          stableOnQuoteReceived(validationResult.data, "fetch");
          updateDisplayStatus(validationResult.data, "fetch");
        } else {
          updateDisplayStatus(null, "fetch");
          setMarketStatus("Error");
          setMarketStatusMessage("Invalid data format on refresh.");
        }
      } else {
        updateDisplayStatus(null, "fetch");
      }
    } catch (e) {
      if (isMountedRef.current) {
        updateDisplayStatus(null, "fetch");
        setMarketStatus("Error");
        setMarketStatusMessage("Network error on data refresh.");
      }
    }

    if (!isMountedRef.current) return;

    if (marketStatusRef.current !== "Error") {
      setMarketStatus("Connecting");
      setMarketStatusMessage("Connecting to real-time updates...");
    }

    unsubscribeRealtimeRef.current = subscribeToQuoteUpdates(
      symbol,
      (payload) => {
        if (
          !isMountedRef.current ||
          payload.eventType === "DELETE" ||
          !payload.new ||
          (payload.new as LiveQuoteIndicatorDBRow).symbol !== symbol
        )
          return;
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
    profileData,
  ]);

  useEffect(() => {
    if (symbol && profileData) {
      setupSubscription();
    } else if (symbol && !profileData) {
      console.log(
        `useStockData (${symbol}): Profile data is loading, full subscription setup deferred.`
      );
    }

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        isMountedRef.current &&
        symbol &&
        profileData
      ) {
        console.log(
          `useStockData (${symbol}): Page became visible. Re-running setupSubscription.`
        );
        setTimeout(() => {
          if (isMountedRef.current) setupSubscription();
        }, 500);
      }
    };
    const handleOnlineStatus = () => {
      if (isMountedRef.current && navigator.onLine && symbol && profileData) {
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
        console.log(
          `useStockData (${symbol}): Cleaning up main subscription due to unmount or symbol/profile change.`
        );
        unsubscribeRealtimeRef.current();
        unsubscribeRealtimeRef.current = null;
      }
    };
  }, [symbol, profileData, setupSubscription]);

  return { marketStatus, marketStatusMessage, lastApiTimestamp, profileData };
}
