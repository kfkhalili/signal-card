// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  SupabaseClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import {
  subscribeToQuoteUpdates as subscribeToLiveQuoteIndicators,
  type LiveQuotePayload,
  type SubscriptionStatus as LiveQuoteSubscriptionStatus,
  type LiveQuoteIndicatorDBRow, // This type MUST use `exchange?: string | null;`
  LiveQuoteIndicatorDBSchema, // This Zod schema MUST use `exchange: z.string().nullable().optional();`
} from "@/lib/supabase/realtime-service"; // Assuming this file is updated
import { z } from "zod";
import type {
  ExchangeMarketStatusRecord,
  FmpMarketHoliday,
} from "@/types/market.types";

// ProfileDBRow and Schema
export interface ProfileDBRow {
  id: string;
  symbol: string;
  company_name?: string | null;
  image?: string | null;
  exchange?: string | null; // This is the exchange code (e.g., "NASDAQ", "NYSE") from FMP
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
  exchange: z.string().trim().min(1).nullable().optional(), // Key for linking
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
  modified_at: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date string for modified_at in Profile.",
  }),
});

export const ExchangeMarketStatusDBSchema = z.object({
  exchange_code: z.string(), // This is the PK in exchange_market_status
  name: z.string().nullable().optional(),
  opening_time_local: z.string().nullable().optional(),
  closing_time_local: z.string().nullable().optional(),
  timezone: z.string(),
  is_market_open: z.boolean(),
  status_message: z.string().nullable().optional(),
  current_day_is_holiday: z.boolean().nullable().optional(),
  current_holiday_name: z.string().nullable().optional(),
  raw_holidays_json: z.custom<FmpMarketHoliday[]>().nullable().optional(),
  last_fetched_at: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date string for last_fetched_at.",
  }),
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
  const liveQuoteUnsubscribeRef = useRef<(() => void) | null>(null);
  const exchangeStatusChannelRef = useRef<RealtimeChannel | null>(null);

  const currentSubscribedExchangeCode = useRef<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (profileChannelRef.current) {
        supabaseClientRef.current
          .removeChannel(profileChannelRef.current)
          .catch((err) =>
            console.error(
              `[useStockData ${symbol}] Error removing profile channel:`,
              err
            )
          );
      }
      if (liveQuoteUnsubscribeRef.current) {
        liveQuoteUnsubscribeRef.current();
      }
      if (exchangeStatusChannelRef.current) {
        supabaseClientRef.current
          .removeChannel(exchangeStatusChannelRef.current)
          .catch((err) =>
            console.error(
              `[useStockData ${symbol}] Error removing exchange status channel for ${currentSubscribedExchangeCode.current}:`,
              err
            )
          );
      }
    };
  }, [symbol]);

  useEffect(() => {
    if (!symbol) {
      setDerivedMarketStatus("Unknown");
      setMarketStatusMessage("No symbol provided.");
      return;
    }

    if (!profileData && !latestQuote && !exchangeStatus) {
      setDerivedMarketStatus("Fetching");
      setMarketStatusMessage(`Awaiting data for ${symbol}...`);
      return;
    }

    const relevantExchangeCode = profileData?.exchange || latestQuote?.exchange; // Use .exchange from quote

    if (
      !relevantExchangeCode ||
      !exchangeStatus ||
      exchangeStatus.exchange_code !== relevantExchangeCode
    ) {
      setDerivedMarketStatus("Connecting");
      setMarketStatusMessage(
        relevantExchangeCode
          ? `Workspaceing market status for ${relevantExchangeCode}...`
          : `Awaiting exchange info for ${symbol}...`
      );
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
  }, [symbol, latestQuote, exchangeStatus, profileData]);

  const setupExchangeStatusSubscription = useCallback(
    async (exchangeCodeToSubscribe: string | undefined | null) => {
      if (!isMountedRef.current) return;

      if (
        currentSubscribedExchangeCode.current &&
        (currentSubscribedExchangeCode.current !== exchangeCodeToSubscribe ||
          !exchangeCodeToSubscribe)
      ) {
        if (exchangeStatusChannelRef.current) {
          if (process.env.NODE_ENV === "development")
            console.debug(
              `[useStockData ${symbol}] Removing old exchange status channel for ${currentSubscribedExchangeCode.current}`
            );
          supabaseClientRef.current
            .removeChannel(exchangeStatusChannelRef.current)
            .catch(console.error);
          exchangeStatusChannelRef.current = null;
        }
        currentSubscribedExchangeCode.current = null;
        if (isMountedRef.current) setExchangeStatus(null);
      }

      if (
        !exchangeCodeToSubscribe ||
        currentSubscribedExchangeCode.current === exchangeCodeToSubscribe
      ) {
        return;
      }

      currentSubscribedExchangeCode.current = exchangeCodeToSubscribe;

      if (process.env.NODE_ENV === "development") {
        console.debug(
          `[useStockData ${symbol}] Setting up subscription for exchange_market_status: ${exchangeCodeToSubscribe}`
        );
      }

      try {
        const { data, error } = await supabaseClientRef.current
          .from("exchange_market_status")
          .select("*")
          .eq("exchange_code", exchangeCodeToSubscribe) // Querying by exchange_code
          .single();

        if (!isMountedRef.current) return;

        if (error && error.code !== "PGRST116") {
          console.error(
            `[useStockData ${symbol}] Error fetching initial exchange status for ${exchangeCodeToSubscribe}:`,
            error
          );
          if (isMountedRef.current) setExchangeStatus(null);
        } else if (data) {
          const validation = ExchangeMarketStatusDBSchema.safeParse(data);
          if (validation.success) {
            if (isMountedRef.current) {
              setExchangeStatus(validation.data);
              if (onExchangeStatusUpdate)
                onExchangeStatusUpdate(validation.data);
            }
          } else {
            console.error(
              `[useStockData ${symbol}] Zod validation (initial fetch) for exchange_market_status for ${exchangeCodeToSubscribe} failed:`,
              validation.error.flatten()
            );
            if (isMountedRef.current) setExchangeStatus(null);
          }
        } else {
          if (isMountedRef.current) {
            console.warn(
              `[useStockData ${symbol}] No initial exchange status found for ${exchangeCodeToSubscribe}.`
            );
            setExchangeStatus(null);
          }
        }
      } catch (e) {
        if (isMountedRef.current) {
          console.error(
            `[useStockData ${symbol}] Exception fetching initial exchange status for ${exchangeCodeToSubscribe}:`,
            e
          );
          setExchangeStatus(null);
        }
      }

      const channelName = `exchange-status-${exchangeCodeToSubscribe
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/gi, "-")}`;
      const channel = supabaseClientRef.current
        .channel(channelName)
        .on<ExchangeMarketStatusRecord>(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "exchange_market_status",
            filter: `exchange_code=eq.${exchangeCodeToSubscribe}`,
          },
          (
            payload: RealtimePostgresChangesPayload<ExchangeMarketStatusRecord>
          ) => {
            if (process.env.NODE_ENV === "development") {
              console.debug(
                `[useStockData ${symbol}] Realtime update for exchange_market_status (${exchangeCodeToSubscribe}):`,
                payload.new
              );
            }
            if (!isMountedRef.current) return;

            const newStatus = payload.new;
            const validation =
              ExchangeMarketStatusDBSchema.safeParse(newStatus);
            if (validation.success) {
              setExchangeStatus(validation.data);
              if (onExchangeStatusUpdate)
                onExchangeStatusUpdate(validation.data);
            } else {
              console.error(
                `[useStockData ${symbol}] Zod validation (realtime) for exchange_market_status for ${exchangeCodeToSubscribe} failed:`,
                validation.error.flatten()
              );
            }
          }
        )
        .subscribe((status, err) => {
          if (!isMountedRef.current) return;
          if (process.env.NODE_ENV === "development") {
            console.debug(
              `[useStockData ${symbol}] Exchange status channel (${exchangeCodeToSubscribe}) status: ${status}`,
              err || ""
            );
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (isMountedRef.current) {
              setDerivedMarketStatus("Error");
              setMarketStatusMessage("Market status connection issue.");
            }
          } else if (status === "CLOSED" && isMountedRef.current) {
            console.warn(
              `[useStockData ${symbol}] Exchange status channel (${exchangeCodeToSubscribe}) closed unexpectedly. Will attempt to resubscribe if exchange code is still relevant.`
            );
            // Re-subscription attempt will happen if setupExchangeStatusSubscription is called again
            // (e.g., if symbol changes or profile/quote provides the exchange code again)
            // Or, add a more explicit retry mechanism here if needed.
          }
        });
      exchangeStatusChannelRef.current = channel;
    },
    [symbol, onExchangeStatusUpdate]
  );

  useEffect(() => {
    if (!symbol) {
      setProfileData(null);
      setLatestQuote(null);
      setupExchangeStatusSubscription(null);
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
          setupExchangeStatusSubscription(validationResult.data.exchange); // Use profile.exchange
        } else {
          if (data && !validationResult.success)
            console.error(
              `[useStockData ${symbol}] Zod validation (initial fetch) for profile failed:`,
              validationResult.error.flatten()
            );
          else if (process.env.NODE_ENV === "development")
            console.warn(
              `[useStockData ${symbol}] No initial profile data found.`
            );
          setProfileData(null);
          setupExchangeStatusSubscription(null);
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
        .replace(/[^a-z0-9_.-]/gi, "-")}`;
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
          (payload: RealtimePostgresChangesPayload<ProfileDBRow>) => {
            if (process.env.NODE_ENV === "development")
              console.debug(
                `[useStockData ${symbol}] Realtime 'profiles' update:`,
                payload.new
              );
            if (!isMountedRef.current || !profileSubActive) return;

            const validation = ProfileDBSchema.safeParse(payload.new);
            if (validation.success) {
              setProfileData(validation.data);
              if (onProfileUpdate) onProfileUpdate(validation.data);
              if (
                validation.data.exchange !==
                currentSubscribedExchangeCode.current
              ) {
                setupExchangeStatusSubscription(validation.data.exchange); // Use profile.exchange
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
            // Use quote.exchange here
            if (
              validation.data.exchange &&
              currentSubscribedExchangeCode.current !== validation.data.exchange
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
            // Use quote.exchange here
            if (
              validation.data.exchange &&
              currentSubscribedExchangeCode.current !== validation.data.exchange
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
            if (isMountedRef.current) {
              setDerivedMarketStatus("Error");
              setMarketStatusMessage("Live quote connection issue.");
            }
          } else if (status === "CLOSED" && isMountedRef.current) {
            console.warn(
              `[useStockData ${symbol}] Live quote channel closed unexpectedly.`
            );
            if (isMountedRef.current) {
              setDerivedMarketStatus("Connecting");
              setMarketStatusMessage(
                "Live quote connection interrupted. Reconnecting..."
              );
            }
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
