// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "../lib/supabase/client";
import type {
  SupabaseClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import {
  subscribeToQuoteUpdates as subscribeToLiveQuoteIndicators, // Renamed for clarity
  type LiveQuotePayload,
  type SubscriptionStatus as LiveQuoteSubscriptionStatus,
  type LiveQuoteIndicatorDBRow,
  LiveQuoteIndicatorDBSchema,
} from "@/lib/supabase/realtime-service";
import { z } from "zod";

// ProfileDBRow and Schema (as defined before)
export interface ProfileDBRow {
  id: string;
  symbol: string;
  company_name?: string | null;
  image?: string | null;
  sector?: string | null;
  industry?: string | null;
  website?: string | null;
  description?: string | null;
  short_description?: string | null;
  country?: string | null;
  // Add all other fields from your 'profiles' table schema here
  // to ensure the type is complete
  price?: number | null;
  market_cap?: number | null;
  beta?: number | null;
  last_dividend?: number | null;
  range?: string | null;
  change?: number | null;
  change_percentage?: number | null;
  volume?: number | null;
  average_volume?: number | null;
  currency?: string | null;
  cik?: string | null;
  isin?: string | null;
  cusip?: string | null;
  exchange_full_name?: string | null;
  exchange?: string | null;
  ceo?: string | null;
  full_time_employees?: number | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  ipo_date?: string | null; // Assuming date is string YYYY-MM-DD
  default_image?: boolean | null;
  is_etf?: boolean | null;
  is_actively_trading?: boolean | null;
  is_adr?: boolean | null;
  is_fund?: boolean | null;
  modified_at: string; // timestamp
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
  short_description: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  // Add all other fields from your 'profiles' table schema here with Zod types
  price: z.number().nullable().optional(),
  market_cap: z.number().nullable().optional(), // bigint in DB, handle as number
  beta: z.number().nullable().optional(),
  last_dividend: z.number().nullable().optional(),
  range: z.string().nullable().optional(),
  change: z.number().nullable().optional(),
  change_percentage: z.number().nullable().optional(),
  volume: z.number().nullable().optional(), // bigint in DB
  average_volume: z.number().nullable().optional(), // bigint in DB
  currency: z.string().max(3).nullable().optional(),
  cik: z.string().nullable().optional(),
  isin: z.string().nullable().optional(),
  cusip: z.string().nullable().optional(),
  exchange_full_name: z.string().nullable().optional(),
  exchange: z.string().nullable().optional(),
  ceo: z.string().nullable().optional(),
  full_time_employees: z.number().nullable().optional(), // bigint in DB
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  ipo_date: z.string().nullable().optional(), // Consider z.date() if parsing
  default_image: z.boolean().nullable().optional(),
  is_etf: z.boolean().nullable().optional(),
  is_actively_trading: z.boolean().nullable().optional(),
  is_adr: z.boolean().nullable().optional(),
  is_fund: z.boolean().nullable().optional(),
  modified_at: z.string(), // Or z.date() if parsing
});

export interface CombinedQuoteData extends LiveQuoteIndicatorDBRow {
  // These are added from ProfileDBRow
  companyName?: string | null;
  logoUrl?: string | null;
  // Potentially add other frequently used profile fields if needed by consumers of CombinedQuoteData
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

type ProfileSubscriptionStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR";

interface UseStockDataProps {
  symbol: string;
  onQuoteReceived: (
    quoteData: CombinedQuoteData,
    source: "fetch" | "realtime"
  ) => void;
  // New callback for when the static profile data itself is updated
  onStaticProfileUpdate?: (updatedProfile: ProfileDBRow) => void;
}

interface UseStockDataReturn {
  marketStatus: MarketStatusDisplayHook;
  marketStatusMessage: string | null;
  lastApiTimestamp: number | null; // From live_quote_indicators
  // profileData is now the potentially real-time updated profile
  profileData: ProfileDBRow | null | undefined; // Can be undefined initially
}

export function useStockData({
  symbol,
  onQuoteReceived,
  onStaticProfileUpdate,
}: UseStockDataProps): UseStockDataReturn {
  const [marketStatus, setMarketStatus] =
    useState<MarketStatusDisplayHook>("Fetching");
  const [marketStatusMessage, setMarketStatusMessage] = useState<string | null>(
    "Initializing..."
  );
  const [lastApiTimestamp, setLastApiTimestamp] = useState<number | null>(null);
  const [profileData, setProfileData] = useState<
    ProfileDBRow | null | undefined
  >(undefined);

  const lastGoodQuoteRef = useRef<LiveQuoteIndicatorDBRow | null>(null);
  const liveQuoteChannelUnsubscribeRef = useRef<(() => void) | null>(null);
  const profileChannelUnsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const supabaseClientRef = useRef<SupabaseClient>(createClient());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Effect for fetching initial profile and setting up profile subscription
  useEffect(() => {
    if (!symbol) {
      setProfileData(null);
      return;
    }
    let profileSubActive = true;

    const fetchInitialProfileAndSubscribe = async () => {
      console.log(
        `useStockData (${symbol}): Fetching initial profile & subscribing...`
      );
      try {
        const { data, error } = await supabaseClientRef.current
          .from("profiles")
          .select("*") // Select all columns defined in ProfileDBRow
          .eq("symbol", symbol)
          .maybeSingle();

        if (!profileSubActive || !isMountedRef.current) return;

        if (error) {
          console.error(
            `useStockData (${symbol}): Error fetching initial profile:`,
            error
          );
          setProfileData(null);
        } else if (data) {
          const validationResult = ProfileDBSchema.safeParse(data);
          if (validationResult.success) {
            setProfileData(validationResult.data);
            if (onStaticProfileUpdate && profileSubActive) {
              // Notify on initial load too
              onStaticProfileUpdate(validationResult.data);
            }
          } else {
            console.error(
              `useStockData (${symbol}): Zod validation failed for initial profile:`,
              validationResult.error.flatten()
            );
            setProfileData(null);
          }
        } else {
          console.warn(
            `useStockData (${symbol}): No initial profile data found.`
          );
          setProfileData(null);
        }
      } catch (err) {
        if (!profileSubActive || !isMountedRef.current) return;
        console.error(
          `useStockData (${symbol}): Exception during initial profile fetch:`,
          err
        );
        setProfileData(null);
      }

      // Setup Realtime Subscription for 'profiles' table
      if (profileChannelUnsubscribeRef.current) {
        profileChannelUnsubscribeRef.current();
      }

      const profileChannel: RealtimeChannel = supabaseClientRef.current
        .channel(`profile-${symbol.toLowerCase()}`)
        .on<ProfileDBRow>(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `symbol=eq.${symbol}`,
          },
          (payload: RealtimePostgresChangesPayload<ProfileDBRow>) => {
            console.log(
              `useStockData (${symbol}): Realtime update for 'profiles' table:`,
              payload.new
            );
            if (!isMountedRef.current || !profileSubActive) return;
            const validationResult = ProfileDBSchema.safeParse(payload.new);
            if (validationResult.success) {
              setProfileData(validationResult.data); // Update internal state
              if (onStaticProfileUpdate) {
                onStaticProfileUpdate(validationResult.data); // Notify consumer
              }
            } else {
              console.error(
                `useStockData (${symbol}): Zod validation failed for profile update:`,
                validationResult.error.flatten()
              );
            }
          }
        )
        .subscribe((status, err) => {
          if (!isMountedRef.current || !profileSubActive) return;
          console.log(
            `useStockData (${symbol}): Profile channel status: ${status}`,
            err || ""
          );
          // Handle profile channel status if needed (e.g., for specific error UI)
        });

      profileChannelUnsubscribeRef.current = () => {
        if (profileChannel)
          supabaseClientRef.current.removeChannel(profileChannel);
      };
    };

    fetchInitialProfileAndSubscribe();

    return () => {
      profileSubActive = false;
      if (profileChannelUnsubscribeRef.current) {
        console.log(
          `useStockData (${symbol}): Cleaning up profile subscription.`
        );
        profileChannelUnsubscribeRef.current();
        profileChannelUnsubscribeRef.current = null;
      }
    };
  }, [symbol, onStaticProfileUpdate]); // Add onStaticProfileUpdate to dependencies

  const updateDisplayStatus = useCallback(
    /* ... as before ... */
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
            ? `No initial quote data found for ${symbol}.`
            : "Market status currently unavailable."
        );
        setLastApiTimestamp(null);
      }
    },
    [symbol]
  );

  // stableOnQuoteReceived now uses the `profileData` state from the hook
  const stableOnQuoteReceived = useCallback(
    (
      quoteDataFromIndicator: LiveQuoteIndicatorDBRow,
      source: "fetch" | "realtime"
    ) => {
      // profileData here is the state within useStockData, which is now real-time capable
      const currentProfile = profileData; // Use the state variable
      const combinedData: CombinedQuoteData = {
        ...quoteDataFromIndicator,
        companyName: currentProfile?.company_name ?? null,
        logoUrl: currentProfile?.image ?? null,
      };
      onQuoteReceived(combinedData, source);
    },
    [profileData, onQuoteReceived] // Depend on profileData state
  );

  const marketStatusRef = useRef(marketStatus);
  useEffect(() => {
    marketStatusRef.current = marketStatus;
  }, [marketStatus]);

  const handleLiveQuoteSubscriptionStatusChange = useCallback(
    /* ... as before ... */
    (status: LiveQuoteSubscriptionStatus, err?: Error) => {
      if (!isMountedRef.current) return;
      console.log(
        `useStockData (${symbol}): Live Quote Channel Status: ${status}`,
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
              return `${baseStatusMessage} (Live quotes active)`;
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
            setMarketStatus("Live"); // Or keep as "Fetching" if initial quote fetch is still pending
            setMarketStatusMessage("Live quotes connected, awaiting data...");
          }
          break;
        case "CHANNEL_ERROR":
          setMarketStatus("Error");
          setMarketStatusMessage(
            `Live quote connection error. ${err?.message || "Retrying..."}`
          );
          break;
        case "TIMED_OUT":
          setMarketStatus("Error");
          setMarketStatusMessage("Live quote connection timed out.");
          break;
        case "CLOSED":
          setMarketStatus("Error");
          setMarketStatusMessage("Live quote connection closed.");
          break;
      }
    },
    [symbol, updateDisplayStatus]
  );

  // Effect for fetching initial quote and setting up quote subscription
  // This now depends on profileData to ensure profile is loaded before attempting to combine
  useEffect(() => {
    if (!symbol || profileData === undefined) {
      // Wait if profileData is undefined (still loading)
      if (symbol && profileData === undefined) {
        console.log(
          `useStockData (${symbol}): Deferring quote subscription until profile is loaded or confirmed null.`
        );
      }
      return;
    }

    let quoteSubActive = true;

    const setupQuoteSubscription = async () => {
      console.log(
        `useStockData (${symbol}): Setting up quote subscription (profile available/checked).`
      );
      if (liveQuoteChannelUnsubscribeRef.current) {
        liveQuoteChannelUnsubscribeRef.current();
        liveQuoteChannelUnsubscribeRef.current = null;
      }

      setMarketStatus("Fetching");
      setMarketStatusMessage(`Refreshing quote for ${symbol}...`);
      try {
        const { data, error } = await supabaseClientRef.current
          .from("live_quote_indicators")
          .select("*")
          .eq("symbol", symbol)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .single();

        if (!quoteSubActive || !isMountedRef.current) return;

        if (error && error.code !== "PGRST116") {
          // PGRST116: no rows found
          updateDisplayStatus(null, "fetch");
          setMarketStatus("Error");
          setMarketStatusMessage("Failed to refresh quote.");
        } else if (data) {
          const validationResult = LiveQuoteIndicatorDBSchema.safeParse(data);
          if (validationResult.success) {
            stableOnQuoteReceived(validationResult.data, "fetch");
            updateDisplayStatus(validationResult.data, "fetch");
          } else {
            updateDisplayStatus(null, "fetch");
            setMarketStatus("Error");
            setMarketStatusMessage("Invalid quote data format on refresh.");
          }
        } else {
          updateDisplayStatus(null, "fetch"); // No data found
        }
      } catch (e) {
        if (quoteSubActive && isMountedRef.current) {
          updateDisplayStatus(null, "fetch");
          setMarketStatus("Error");
          setMarketStatusMessage("Network error on quote refresh.");
        }
      }

      if (!quoteSubActive || !isMountedRef.current) return;

      if (marketStatusRef.current !== "Error") {
        setMarketStatus("Connecting");
        setMarketStatusMessage("Connecting to live quote updates...");
      }

      // Use the renamed import for clarity
      liveQuoteChannelUnsubscribeRef.current = subscribeToLiveQuoteIndicators(
        symbol,
        (payload: LiveQuotePayload) => {
          // Explicitly type payload here
          if (
            !isMountedRef.current ||
            !quoteSubActive ||
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
              `useStockData (${symbol}): Realtime Quote Zod validation failed:`,
              validationResult.error.flatten(),
              "Payload:",
              payload.new
            );
          }
        },
        handleLiveQuoteSubscriptionStatusChange
      );
    };

    setupQuoteSubscription();

    return () => {
      quoteSubActive = false;
      if (liveQuoteChannelUnsubscribeRef.current) {
        console.log(
          `useStockData (${symbol}): Cleaning up quote subscription.`
        );
        liveQuoteChannelUnsubscribeRef.current();
        liveQuoteChannelUnsubscribeRef.current = null;
      }
    };
  }, [
    symbol,
    profileData,
    stableOnQuoteReceived,
    updateDisplayStatus,
    handleLiveQuoteSubscriptionStatusChange,
  ]); // Added profileData dependency

  return { marketStatus, marketStatusMessage, lastApiTimestamp, profileData };
}
