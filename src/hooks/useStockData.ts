// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import {
  subscribeToQuoteUpdates as subscribeToLiveQuoteIndicators,
  type LiveQuotePayload,
  type SubscriptionStatus as LiveQuoteSubscriptionStatus,
  type LiveQuoteIndicatorDBRow, // This type MUST be updated in realtime-service.ts first
  LiveQuoteIndicatorDBSchema, // This Zod schema MUST be updated in realtime-service.ts first
} from "@/lib/supabase/realtime-service"; // Assuming this is updated
import { z } from "zod";
import type { ExchangeMarketStatusRecord } from "@/types/market.types"; // Create this file & type

// ProfileDBRow and Schema (ensure 'exchange' field is present and populated)
export interface ProfileDBRow {
  id: string;
  symbol: string;
  company_name?: string | null;
  image?: string | null;
  exchange?: string | null;
  sector?: string | null;
  industry?: string | null;
  website?: string | null;
  description?: string | null;
  short_description?: string | null;
  country?: string | null;
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
  ceo?: string | null;
  full_time_employees?: number | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  ipo_date?: string | null;
  default_image?: boolean | null;
  is_etf?: boolean | null;
  is_actively_trading?: boolean | null;
  is_adr?: boolean | null;
  is_fund?: boolean | null;
  modified_at: string;
}

export const ProfileDBSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string(),
  company_name: z.string().nullable().optional(),
  image: z.string().url().nullable().optional(),
  exchange: z.string().trim().min(1).nullable().optional(), // Make sure it's a non-empty string if present
  sector: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  description: z.string().nullable().optional(),
  short_description: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  market_cap: z.number().nullable().optional(),
  beta: z.number().nullable().optional(),
  last_dividend: z.number().nullable().optional(),
  range: z.string().nullable().optional(),
  change: z.number().nullable().optional(),
  change_percentage: z.number().nullable().optional(),
  volume: z.number().nullable().optional(),
  average_volume: z.number().nullable().optional(),
  currency: z.string().max(3).nullable().optional(),
  cik: z.string().nullable().optional(),
  isin: z.string().nullable().optional(),
  cusip: z.string().nullable().optional(),
  exchange_full_name: z.string().nullable().optional(),
  ceo: z.string().nullable().optional(),
  full_time_employees: z.number().int().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  ipo_date: z.string().nullable().optional(),
  default_image: z.boolean().nullable().optional(),
  is_etf: z.boolean().nullable().optional(),
  is_actively_trading: z.boolean().nullable().optional(),
  is_adr: z.boolean().nullable().optional(),
  is_fund: z.boolean().nullable().optional(),
  modified_at: z.string().datetime(), // Or z.date() if you parse it
});

// Zod schema for ExchangeMarketStatusRecord (client-side validation for fetched data)
export const ExchangeMarketStatusDBSchema = z.object({
  exchange_code: z.string(),
  name: z.string().nullable().optional(),
  opening_time_local: z.string().nullable().optional(),
  closing_time_local: z.string().nullable().optional(),
  timezone: z.string(),
  is_market_open: z.boolean(),
  status_message: z.string().nullable().optional(),
  current_day_is_holiday: z.boolean().nullable().optional(),
  current_holiday_name: z.string().nullable().optional(),
  raw_holidays_json: z.any().nullable().optional(), // Can be z.array(z.object(...)) if structure is known and needed
  last_fetched_at: z.string().datetime(),
});

export type DerivedMarketStatus =
  | "Open"
  | "Closed"
  | "Delayed"
  | "Holiday"
  | "Unknown"
  | "Error"
  | "Fetching"
  | "Connecting";

interface UseStockDataProps {
  symbol: string;
  onProfileUpdate?: (profile: ProfileDBRow) => void;
  onLiveQuoteUpdate?: (quote: LiveQuoteIndicatorDBRow) => void;
  onExchangeStatusUpdate?: (status: ExchangeMarketStatusRecord) => void;
}

interface UseStockDataReturn {
  derivedMarketStatus: DerivedMarketStatus;
  marketStatusMessage: string | null;
}

export function useStockData({
  symbol,
  onProfileUpdate,
  onLiveQuoteUpdate,
  onExchangeStatusUpdate,
}: UseStockDataProps): UseStockDataReturn {
  const [profileData, setProfileData] = useState<ProfileDBRow | null>(null);
  const [latestQuote, setLatestQuote] =
    useState<LiveQuoteIndicatorDBRow | null>(null);
  const [exchangeStatus, setExchangeStatus] =
    useState<ExchangeMarketStatusRecord | null>(null);

  const [derivedMarketStatus, setDerivedMarketStatus] =
    useState<DerivedMarketStatus>("Fetching");
  const [marketStatusMessage, setMarketStatusMessage] = useState<string | null>(
    "Initializing..."
  );

  const supabaseClientRef = useRef<SupabaseClient>(
    createSupabaseBrowserClient()
  );
  const isMountedRef = useRef<boolean>(true);

  const profileChannelRef = useRef<RealtimeChannel | null>(null);
  const liveQuoteUnsubscribeRef = useRef<(() => void) | null>(null); // For the new realtime-service
  const exchangeStatusChannelRef = useRef<RealtimeChannel | null>(null);

  const currentExchangeCodeRef = useRef<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (profileChannelRef.current) {
        supabaseClientRef.current
          .removeChannel(profileChannelRef.current)
          .catch(console.error);
      }
      if (liveQuoteUnsubscribeRef.current) {
        liveQuoteUnsubscribeRef.current();
      }
      if (exchangeStatusChannelRef.current) {
        supabaseClientRef.current
          .removeChannel(exchangeStatusChannelRef.current)
          .catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (!latestQuote && !exchangeStatus && !profileData && symbol) {
      setDerivedMarketStatus("Fetching");
      setMarketStatusMessage(`Awaiting data for ${symbol}...`);
      return;
    }
    if (!exchangeStatus && profileData?.exchange) {
      setDerivedMarketStatus("Connecting"); // Indicate we are trying to get market status
      setMarketStatusMessage(
        `Workspaceing market status for ${profileData.exchange}...`
      );
      return;
    }
    if (!exchangeStatus && latestQuote?.exchange) {
      setDerivedMarketStatus("Connecting");
      setMarketStatusMessage(
        `Workspaceing market status for ${latestQuote.exchange}...`
      );
      return;
    }
    if (!exchangeStatus) {
      setDerivedMarketStatus("Unknown");
      setMarketStatusMessage("Market status unavailable (no exchange info).");
      return;
    }

    if (exchangeStatus.current_day_is_holiday) {
      setDerivedMarketStatus("Holiday");
      setMarketStatusMessage(
        exchangeStatus.status_message ||
          `Market is Closed (Holiday: ${
            exchangeStatus.current_holiday_name || "Official Holiday"
          })`
      );
    } else if (exchangeStatus.is_market_open) {
      if (latestQuote?.api_timestamp) {
        const apiTimeMillis = latestQuote.api_timestamp * 1000;
        const diffMinutes = (Date.now() - apiTimeMillis) / (1000 * 60);
        if (diffMinutes > 15) {
          setDerivedMarketStatus("Delayed");
          setMarketStatusMessage(
            exchangeStatus.status_message || "Live data is delayed."
          );
        } else {
          setDerivedMarketStatus("Open");
          setMarketStatusMessage(
            exchangeStatus.status_message || "Market is Open."
          );
        }
      } else {
        setDerivedMarketStatus("Open");
        setMarketStatusMessage(
          exchangeStatus.status_message ||
            "Market is Open (awaiting first quote)."
        );
      }
    } else {
      setDerivedMarketStatus("Closed");
      setMarketStatusMessage(
        exchangeStatus.status_message || "Market is Closed."
      );
    }
  }, [latestQuote, exchangeStatus, profileData, symbol]);

  const setupExchangeStatusSubscription = useCallback(
    async (exchangeCode: string | undefined | null) => {
      if (!exchangeCode || !isMountedRef.current) {
        if (exchangeStatusChannelRef.current) {
          // Clean up if exchangeCode becomes null
          supabaseClientRef.current
            .removeChannel(exchangeStatusChannelRef.current)
            .catch(console.error);
          exchangeStatusChannelRef.current = null;
          currentExchangeCodeRef.current = null;
          setExchangeStatus(null);
        }
        return;
      }
      if (
        currentExchangeCodeRef.current === exchangeCode &&
        exchangeStatusChannelRef.current
      ) {
        return;
      }
      if (exchangeStatusChannelRef.current) {
        supabaseClientRef.current
          .removeChannel(exchangeStatusChannelRef.current)
          .catch(console.error);
      }
      currentExchangeCodeRef.current = exchangeCode;

      if (process.env.NODE_ENV === "development") {
        console.debug(
          `[useStockData ${symbol}] Subscribing to exchange_market_status for: ${exchangeCode}`
        );
      }

      try {
        const { data, error } = await supabaseClientRef.current
          .from("exchange_market_status")
          .select("*")
          .eq("exchange_code", exchangeCode)
          .single();

        if (!isMountedRef.current) return;
        if (error && error.code !== "PGRST116") {
          console.error(
            `[useStockData ${symbol}] Error fetching initial exchange status for ${exchangeCode}:`,
            error
          );
          setExchangeStatus(null);
        } else if (data) {
          const validation = ExchangeMarketStatusDBSchema.safeParse(data);
          if (validation.success) {
            setExchangeStatus(validation.data);
            if (onExchangeStatusUpdate) onExchangeStatusUpdate(validation.data);
          } else {
            console.error(
              `[useStockData ${symbol}] Zod validation (initial fetch) for exchange_market_status failed:`,
              validation.error.flatten()
            );
            setExchangeStatus(null);
          }
        } else {
          setExchangeStatus(null);
        }
      } catch (e) {
        if (isMountedRef.current) {
          console.error(
            `[useStockData ${symbol}] Exception fetching initial exchange status for ${exchangeCode}:`,
            e
          );
          setExchangeStatus(null);
        }
      }

      const channelName = `exchange-status-${exchangeCode
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, "_")}`;
      const channel = supabaseClientRef.current
        .channel(channelName)
        .on<ExchangeMarketStatusRecord>(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "exchange_market_status",
            filter: `exchange_code=eq.${exchangeCode}`,
          },
          (payload) => {
            if (process.env.NODE_ENV === "development") {
              console.debug(
                `[useStockData ${symbol}] Realtime update for exchange_market_status (${exchangeCode}):`,
                payload.new
              );
            }
            if (!isMountedRef.current) return;
            const newStatus = payload.new as ExchangeMarketStatusRecord; // Assume type is correct from DB
            const validation =
              ExchangeMarketStatusDBSchema.safeParse(newStatus);
            if (validation.success) {
              setExchangeStatus(validation.data);
              if (onExchangeStatusUpdate)
                onExchangeStatusUpdate(validation.data);
            } else {
              console.error(
                `[useStockData ${symbol}] Zod validation (realtime) for exchange_market_status failed:`,
                validation.error.flatten()
              );
            }
          }
        )
        .subscribe((status, err) => {
          if (!isMountedRef.current) return;
          if (process.env.NODE_ENV === "development") {
            console.debug(
              `[useStockData ${symbol}] Exchange status channel (${exchangeCode}) status: ${status}`,
              err || ""
            );
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setDerivedMarketStatus("Error");
            setMarketStatusMessage("Market status connection issue.");
          } else if (status === "CLOSED" && isMountedRef.current) {
            // If channel closes unexpectedly and we are still mounted, try to resubscribe after a delay
            console.warn(
              `[useStockData ${symbol}] Exchange status channel (${exchangeCode}) closed. Attempting to resubscribe.`
            );
            setTimeout(() => {
              if (
                isMountedRef.current &&
                currentExchangeCodeRef.current === exchangeCode
              ) {
                // check if still relevant
                setupExchangeStatusSubscription(exchangeCode);
              }
            }, 5000); // Retry after 5 seconds
          }
        });
      exchangeStatusChannelRef.current = channel;
    },
    [symbol, onExchangeStatusUpdate]
  ); // `symbol` is for logging context

  useEffect(() => {
    if (!symbol) {
      setProfileData(null);
      setLatestQuote(null);
      setupExchangeStatusSubscription(null); // This will clean up existing subscription
      return;
    }
    let profileSubActive = true;

    const fetchInitialProfileAndSubscribe = async () => {
      if (process.env.NODE_ENV === "development") {
        console.debug(
          `[useStockData ${symbol}] Fetching initial profile & subscribing...`
        );
      }
      try {
        const { data, error } = await supabaseClientRef.current
          .from("profiles")
          .select("*")
          .eq("symbol", symbol)
          .maybeSingle();

        if (!profileSubActive || !isMountedRef.current) return;
        if (error) throw error;

        const validationResult = ProfileDBSchema.safeParse(data);
        if (data && validationResult.success) {
          setProfileData(validationResult.data);
          if (onProfileUpdate) onProfileUpdate(validationResult.data);
          setupExchangeStatusSubscription(validationResult.data.exchange);
        } else {
          if (data && !validationResult.success)
            console.error(
              `[useStockData ${symbol}] Zod validation failed for initial profile:`,
              validationResult.error.flatten()
            );
          else
            console.warn(
              `[useStockData ${symbol}] No initial profile data found.`
            );
          setProfileData(null);
          setupExchangeStatusSubscription(null); // No exchange code available
        }
      } catch (err) {
        if (!profileSubActive || !isMountedRef.current) return;
        console.error(
          `[useStockData ${symbol}] Exception during initial profile fetch:`,
          err
        );
        setProfileData(null);
        setupExchangeStatusSubscription(null);
      }

      if (profileChannelRef.current)
        supabaseClientRef.current
          .removeChannel(profileChannelRef.current)
          .catch(console.error);

      const channelName = `profile-${symbol
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, "_")}`;
      const channel = supabaseClientRef.current
        .channel(channelName)
        .on<ProfileDBRow>(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `symbol=eq.${symbol}`,
          },
          (payload) => {
            if (process.env.NODE_ENV === "development")
              console.debug(
                `[useStockData ${symbol}] Realtime 'profiles' update:`,
                payload.new
              );
            if (!isMountedRef.current || !profileSubActive) return;
            const newProfile = payload.new as ProfileDBRow;
            const validation = ProfileDBSchema.safeParse(newProfile);
            if (validation.success) {
              setProfileData(validation.data);
              if (onProfileUpdate) onProfileUpdate(validation.data);
              if (validation.data.exchange !== currentExchangeCodeRef.current) {
                setupExchangeStatusSubscription(validation.data.exchange);
              }
            } else {
              console.error(
                `[useStockData ${symbol}] Zod validation (realtime) for 'profiles' failed:`,
                validation.error.flatten()
              );
            }
          }
        )
        .subscribe((status, err) => {
          if (!isMountedRef.current || !profileSubActive) return;
          if (process.env.NODE_ENV === "development")
            console.debug(
              `[useStockData ${symbol}] Profile channel status: ${status}`,
              err || ""
            );
        });
      profileChannelRef.current = channel;
    };
    fetchInitialProfileAndSubscribe();
    return () => {
      profileSubActive = false;
      if (profileChannelRef.current) {
        supabaseClientRef.current
          .removeChannel(profileChannelRef.current)
          .catch(console.error);
        profileChannelRef.current = null;
      }
    };
  }, [symbol, onProfileUpdate, setupExchangeStatusSubscription]);

  useEffect(() => {
    if (!symbol) {
      setLatestQuote(null);
      return;
    }
    let quoteSubActive = true;

    const setupQuoteSub = async () => {
      if (process.env.NODE_ENV === "development") {
        console.debug(
          `[useStockData ${symbol}] Setting up live_quote_indicators subscription.`
        );
      }
      if (liveQuoteUnsubscribeRef.current) liveQuoteUnsubscribeRef.current();

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
          console.error(
            `[useStockData ${symbol}] Error fetching initial quote:`,
            error
          );
          setLatestQuote(null);
        } else if (data) {
          const validation = LiveQuoteIndicatorDBSchema.safeParse(data);
          if (validation.success) {
            setLatestQuote(validation.data);
            if (onLiveQuoteUpdate) onLiveQuoteUpdate(validation.data);
            if (
              validation.data.exchange &&
              currentExchangeCodeRef.current !== validation.data.exchange
            ) {
              setupExchangeStatusSubscription(validation.data.exchange);
            }
          } else {
            console.error(
              `[useStockData ${symbol}] Zod validation (initial fetch) for live_quote_indicators failed:`,
              validation.error.flatten()
            );
            setLatestQuote(null);
          }
        } else {
          setLatestQuote(null);
        }
      } catch (e) {
        if (isMountedRef.current && quoteSubActive) {
          console.error(
            `[useStockData ${symbol}] Exception fetching initial quote:`,
            e
          );
          setLatestQuote(null);
        }
      }

      liveQuoteUnsubscribeRef.current = subscribeToLiveQuoteIndicators(
        symbol,
        (payload: LiveQuotePayload) => {
          if (
            !isMountedRef.current ||
            !quoteSubActive ||
            payload.eventType === "DELETE" ||
            !payload.new
          )
            return;
          const newQuote = payload.new as LiveQuoteIndicatorDBRow;
          const validation = LiveQuoteIndicatorDBSchema.safeParse(newQuote);
          if (validation.success) {
            setLatestQuote(validation.data);
            if (onLiveQuoteUpdate) onLiveQuoteUpdate(validation.data);
            if (
              validation.data.exchange &&
              currentExchangeCodeRef.current !== validation.data.exchange
            ) {
              setupExchangeStatusSubscription(validation.data.exchange);
            }
          } else {
            console.error(
              `[useStockData ${symbol}] Zod validation (realtime) for live_quote_indicators failed:`,
              validation.error.flatten(),
              "Payload:",
              payload.new
            );
          }
        },
        (status: LiveQuoteSubscriptionStatus, err?: Error) => {
          if (!isMountedRef.current || !quoteSubActive) return;
          if (process.env.NODE_ENV === "development") {
            console.debug(
              `[useStockData ${symbol}] Live quote channel status: ${status}`,
              err || ""
            );
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setDerivedMarketStatus("Error");
            setMarketStatusMessage("Live quote connection issue.");
          } else if (status === "CLOSED" && isMountedRef.current) {
            console.warn(
              `[useStockData ${symbol}] Live quote channel closed. May attempt resubscribe via effect if symbol changes or on error.`
            );
            setDerivedMarketStatus("Connecting"); // Indicate attempt to reconnect
            setMarketStatusMessage(
              "Live quote connection interrupted. Reconnecting..."
            );
            // The main useEffect for quote subscription might re-trigger if symbol changes, or handle retries there.
          } else if (status === "SUBSCRIBED" && !latestQuote) {
            // Successfully subscribed, but no quote data yet
            // The derivedMarketStatus useEffect will handle this based on exchangeStatus and lack of quote
          }
        }
      );
    };
    setupQuoteSub();

    return () => {
      quoteSubActive = false;
      if (liveQuoteUnsubscribeRef.current) {
        liveQuoteUnsubscribeRef.current();
        liveQuoteUnsubscribeRef.current = null;
      }
    };
  }, [symbol, onLiveQuoteUpdate, setupExchangeStatusSubscription]);

  return { derivedMarketStatus, marketStatusMessage };
}
