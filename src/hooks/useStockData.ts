// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef } from "react";
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
  type LiveQuoteIndicatorDBRow,
  LiveQuoteIndicatorDBSchema,
} from "@/lib/supabase/realtime-service";
import { z } from "zod";
import type {
  ExchangeMarketStatusRecord,
  FmpMarketHoliday,
} from "@/types/market.types";

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
  exchange: z.string().trim().min(1).nullable().optional(),
  sector: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  description: z.string().nullable().optional(),
  short_description: z.string().nullable().optional(),
  country: z.string().max(2).nullable().optional(),
  price: z.number().nullable().optional(),
  market_cap: z.number().int().nullable().optional(),
  beta: z.number().nullable().optional(),
  last_dividend: z.number().nullable().optional(),
  range: z.string().nullable().optional(),
  change: z.number().nullable().optional(),
  change_percentage: z.number().nullable().optional(),
  volume: z.number().int().nullable().optional(),
  average_volume: z.number().int().nullable().optional(),
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
  exchange_code: z.string(),
  name: z.string().nullable().optional(),
  opening_time_local: z.string().nullable().optional(),
  closing_time_local: z.string().nullable().optional(),
  timezone: z.string(),
  is_market_open: z.boolean().nullable(),
  status_message: z.string().nullable().optional(),
  current_day_is_holiday: z.boolean().nullable(),
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
  onLiveQuoteUpdate?: (
    quote: LiveQuoteIndicatorDBRow,
    source: "fetch" | "realtime"
  ) => void;
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
  const instanceIdRef = useRef(Math.random().toString(36).substring(2, 7));

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
  const isMountedRef = useRef<boolean>(false);

  const profileChannelRef = useRef<RealtimeChannel | null>(null);
  const liveQuoteUnsubscribeRef = useRef<(() => void) | null>(null);
  const exchangeStatusChannelRef = useRef<RealtimeChannel | null>(null);

  const currentSubscribedExchangeCode = useRef<string | null>(null);
  const exchangeStatusRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (profileChannelRef.current) {
        supabaseClientRef.current
          .removeChannel(profileChannelRef.current)
          .catch((err) =>
            console.error(
              `[useStockData ${symbol} - ${instanceIdRef.current}] Error removing profile channel:`,
              err
            )
          );
        profileChannelRef.current = null;
      }
      if (liveQuoteUnsubscribeRef.current) {
        liveQuoteUnsubscribeRef.current();
        liveQuoteUnsubscribeRef.current = null;
      }
      if (exchangeStatusChannelRef.current) {
        supabaseClientRef.current
          .removeChannel(exchangeStatusChannelRef.current)
          .catch((err) =>
            console.error(
              `[useStockData ${symbol} - ${instanceIdRef.current}] Error removing exchange status channel for ${currentSubscribedExchangeCode.current}:`,
              err
            )
          );
        exchangeStatusChannelRef.current = null;
      }
      currentSubscribedExchangeCode.current = null;
      if (exchangeStatusRetryTimeoutRef.current) {
        clearTimeout(exchangeStatusRetryTimeoutRef.current);
      }
    };
  }, [symbol]);

  useEffect(() => {
    if (!isMountedRef.current) return;
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

    const relevantExchangeCode = profileData?.exchange || latestQuote?.exchange;

    if (!relevantExchangeCode) {
      setDerivedMarketStatus("Unknown");
      setMarketStatusMessage(
        `Exchange information missing for ${symbol}. Cannot determine market status.`
      );
      return;
    }

    if (
      !exchangeStatus ||
      exchangeStatus.exchange_code !== relevantExchangeCode
    ) {
      if (
        derivedMarketStatus !== "Connecting" &&
        derivedMarketStatus !== "Error"
      ) {
        setDerivedMarketStatus("Connecting");
        setMarketStatusMessage(
          relevantExchangeCode
            ? `Connecting to market status for ${relevantExchangeCode}...`
            : `Awaiting exchange info for ${symbol}...`
        );
      }
      return;
    }

    const isOpen = exchangeStatus.is_market_open ?? false;
    const isHoliday = exchangeStatus.current_day_is_holiday ?? false;

    if (isHoliday) {
      setDerivedMarketStatus("Holiday");
      setMarketStatusMessage(
        exchangeStatus.status_message ||
          `Market is Closed (Holiday: ${
            exchangeStatus.current_holiday_name || "Official Holiday"
          })`
      );
    } else if (isOpen) {
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
  }, [symbol, latestQuote, exchangeStatus, profileData, derivedMarketStatus]);

  const setupExchangeStatusSubscription = useCallback(
    async (exchangeCodeToSubscribe: string | undefined | null) => {
      if (!isMountedRef.current) return;

      if (exchangeStatusRetryTimeoutRef.current) {
        clearTimeout(exchangeStatusRetryTimeoutRef.current);
        exchangeStatusRetryTimeoutRef.current = null;
      }

      if (
        currentSubscribedExchangeCode.current &&
        (currentSubscribedExchangeCode.current !== exchangeCodeToSubscribe ||
          !exchangeCodeToSubscribe)
      ) {
        if (exchangeStatusChannelRef.current) {
          await supabaseClientRef.current
            .removeChannel(exchangeStatusChannelRef.current)
            .catch(console.error);
          exchangeStatusChannelRef.current = null;
        }
        currentSubscribedExchangeCode.current = null;
        if (isMountedRef.current) setExchangeStatus(null);
      }

      if (!exchangeCodeToSubscribe) {
        if (
          currentSubscribedExchangeCode.current &&
          exchangeStatusChannelRef.current
        ) {
          await supabaseClientRef.current
            .removeChannel(exchangeStatusChannelRef.current)
            .catch(console.error);
          exchangeStatusChannelRef.current = null;
          currentSubscribedExchangeCode.current = null;
          if (isMountedRef.current) setExchangeStatus(null);
        }
        return;
      }

      if (
        currentSubscribedExchangeCode.current === exchangeCodeToSubscribe &&
        exchangeStatusChannelRef.current &&
        exchangeStatusChannelRef.current.state === "joined"
      ) {
        return;
      }

      currentSubscribedExchangeCode.current = exchangeCodeToSubscribe;

      if (isMountedRef.current) {
        setDerivedMarketStatus("Connecting");
        setMarketStatusMessage(
          `Workspaceing market status for ${exchangeCodeToSubscribe}...`
        );
      }

      try {
        const { data, error } = await supabaseClientRef.current
          .from("exchange_market_status")
          .select("*")
          .eq("exchange_code", exchangeCodeToSubscribe)
          .single();

        if (!isMountedRef.current) return;

        if (error && error.code !== "PGRST116") {
          if (isMountedRef.current) {
            setExchangeStatus(null);
            setDerivedMarketStatus("Error");
            setMarketStatusMessage(
              `Failed to fetch market status for ${exchangeCodeToSubscribe}.`
            );
          }
        } else if (data) {
          const validation = ExchangeMarketStatusDBSchema.safeParse(data);
          if (validation.success) {
            if (isMountedRef.current) {
              setExchangeStatus(validation.data as ExchangeMarketStatusRecord);
              if (onExchangeStatusUpdate)
                onExchangeStatusUpdate(
                  validation.data as ExchangeMarketStatusRecord
                );
            }
          } else {
            if (isMountedRef.current) {
              setExchangeStatus(null);
              setDerivedMarketStatus("Error");
              setMarketStatusMessage(
                `Invalid market status data for ${exchangeCodeToSubscribe}.`
              );
            }
          }
        } else {
          if (isMountedRef.current) {
            setExchangeStatus(null);
          }
        }
      } catch (e) {
        if (isMountedRef.current) {
          setExchangeStatus(null);
          setDerivedMarketStatus("Error");
          setMarketStatusMessage(
            `Exception fetching market status for ${exchangeCodeToSubscribe}.`
          );
        }
      }

      if (exchangeStatusChannelRef.current) {
        await supabaseClientRef.current
          .removeChannel(exchangeStatusChannelRef.current)
          .catch((err) =>
            console.error(
              `[useStockData ${symbol} - ${instanceIdRef.current}] Error removing old exchangeStatusChannelRef before new sub: `,
              err
            )
          );
        exchangeStatusChannelRef.current = null;
      }

      const channelName = `exchange-status-${exchangeCodeToSubscribe
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/gi, "-")}-${instanceIdRef.current}`;
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
            if (!isMountedRef.current) return;
            const validation = ExchangeMarketStatusDBSchema.safeParse(
              payload.new
            );
            if (validation.success) {
              if (isMountedRef.current) {
                setExchangeStatus(
                  validation.data as ExchangeMarketStatusRecord
                );
                if (onExchangeStatusUpdate)
                  onExchangeStatusUpdate(
                    validation.data as ExchangeMarketStatusRecord
                  );
              }
            } else {
              console.error(
                `[useStockData ${symbol} - ${instanceIdRef.current}] Zod validation (realtime) for exchange_market_status for ${exchangeCodeToSubscribe} failed:`,
                validation.error.flatten(),
                "Payload:",
                payload.new
              );
            }
          }
        )
        .subscribe((status, err) => {
          if (!isMountedRef.current) return;
          const retrySubscription = () => {
            if (exchangeStatusRetryTimeoutRef.current)
              clearTimeout(exchangeStatusRetryTimeoutRef.current);
            exchangeStatusRetryTimeoutRef.current = setTimeout(() => {
              if (
                isMountedRef.current &&
                currentSubscribedExchangeCode.current ===
                  exchangeCodeToSubscribe
              ) {
                setupExchangeStatusSubscription(exchangeCodeToSubscribe);
              }
            }, 5000 + Math.random() * 5000);
          };

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (isMountedRef.current) {
              setDerivedMarketStatus("Error");
              setMarketStatusMessage(
                `Market status connection issue for ${exchangeCodeToSubscribe}.`
              );
              retrySubscription();
            }
          } else if (status === "CLOSED") {
            if (isMountedRef.current) {
              console.warn(
                `[useStockData ${symbol} - ${instanceIdRef.current}] Exchange status channel (${exchangeCodeToSubscribe}) closed. Will attempt to re-establish.`
              );
              setDerivedMarketStatus("Connecting");
              setMarketStatusMessage(
                `Market status for ${exchangeCodeToSubscribe} connection closed. Re-establishing...`
              );
              retrySubscription();
            }
          } else if (status === "SUBSCRIBED") {
            if (exchangeStatusRetryTimeoutRef.current) {
              clearTimeout(exchangeStatusRetryTimeoutRef.current);
              exchangeStatusRetryTimeoutRef.current = null;
            }
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
      try {
        const { data, error } = await supabaseClientRef.current
          .from("profiles")
          .select(
            "id, symbol, company_name, image, exchange, sector, industry, website, description, short_description, country, price, market_cap, beta, last_dividend, range, change, change_percentage, volume, average_volume, currency, cik, isin, cusip, exchange_full_name, ceo, full_time_employees, phone, address, city, state, zip, ipo_date, default_image, is_etf, is_actively_trading, is_adr, is_fund, modified_at"
          )
          .eq("symbol", symbol)
          .maybeSingle();

        if (!profileSubActive || !isMountedRef.current) {
          return;
        }
        if (error) throw error;

        const validationResult = ProfileDBSchema.safeParse(data);
        if (data && validationResult.success) {
          if (isMountedRef.current) {
            setProfileData(validationResult.data);
            if (onProfileUpdate) onProfileUpdate(validationResult.data);
            if (
              validationResult.data.exchange &&
              currentSubscribedExchangeCode.current !==
                validationResult.data.exchange
            ) {
              setupExchangeStatusSubscription(validationResult.data.exchange);
            } else if (
              !validationResult.data.exchange &&
              currentSubscribedExchangeCode.current
            ) {
              setupExchangeStatusSubscription(null);
            }
          }
        } else {
          if (data && !validationResult.success && isMountedRef.current) {
            console.error(
              `[useStockData ${symbol} - ${instanceIdRef.current}] Zod validation (initial fetch) for profile failed:`,
              validationResult.error.flatten(),
              "Raw data:",
              data
            );
          }
          if (isMountedRef.current) {
            setProfileData(null);
          }
        }
      } catch (err) {
        if (!profileSubActive || !isMountedRef.current) return;
        console.error(
          `[useStockData ${symbol} - ${instanceIdRef.current}] Exception during initial profile fetch:`,
          err
        );
        if (isMountedRef.current) {
          setProfileData(null);
        }
      }

      if (profileChannelRef.current) {
        await supabaseClientRef.current
          .removeChannel(profileChannelRef.current)
          .catch((err) =>
            console.error(
              `[useStockData ${symbol} - ${instanceIdRef.current}] Error removing old profileChannelRef before new sub: `,
              err
            )
          );
        profileChannelRef.current = null;
      }

      const channelName = `profile-${symbol
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/gi, "-")}-${instanceIdRef.current}`;
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
            if (!isMountedRef.current || !profileSubActive) return;
            const validation = ProfileDBSchema.safeParse(payload.new);
            if (validation.success) {
              if (isMountedRef.current) {
                setProfileData(validation.data);
                if (onProfileUpdate) onProfileUpdate(validation.data);
                if (
                  validation.data.exchange &&
                  validation.data.exchange !==
                    currentSubscribedExchangeCode.current
                ) {
                  setupExchangeStatusSubscription(validation.data.exchange);
                } else if (
                  !validation.data.exchange &&
                  currentSubscribedExchangeCode.current
                ) {
                  setupExchangeStatusSubscription(null);
                }
              }
            } else {
              console.error(
                `[useStockData ${symbol} - ${instanceIdRef.current}] Zod validation (realtime) for 'profiles' failed:`,
                validation.error.flatten(),
                "Payload:",
                payload.new
              );
            }
          }
        )
        .subscribe((status, err) => {
          // Intentionally sparse logging for profile channel status unless erroring
          if (
            status === "CHANNEL_ERROR" &&
            isMountedRef.current &&
            profileSubActive
          ) {
            console.error(
              `[useStockData ${symbol} - ${instanceIdRef.current}] Profile channel error:`,
              err
            );
          }
        });
      profileChannelRef.current = channel;
    };

    fetchInitialProfileAndSubscribe();

    return () => {
      profileSubActive = false;
      if (profileChannelRef.current) {
        supabaseClientRef.current
          .removeChannel(profileChannelRef.current)
          .catch((err) =>
            console.error(
              `[useStockData ${symbol} - ${instanceIdRef.current}] Error removing profile channel in cleanup:`,
              err
            )
          );
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
      if (liveQuoteUnsubscribeRef.current) {
        liveQuoteUnsubscribeRef.current();
        liveQuoteUnsubscribeRef.current = null;
      }

      try {
        const { data, error } = await supabaseClientRef.current
          .from("live_quote_indicators")
          .select("*")
          .eq("symbol", symbol)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .single();

        if (!quoteSubActive || !isMountedRef.current) {
          return;
        }

        if (error && error.code !== "PGRST116") {
          if (isMountedRef.current) setLatestQuote(null);
        } else if (data) {
          const validation = LiveQuoteIndicatorDBSchema.safeParse(data);
          if (validation.success) {
            if (isMountedRef.current) {
              setLatestQuote(validation.data);
              if (onLiveQuoteUpdate) {
                onLiveQuoteUpdate(validation.data, "fetch");
              }
              if (
                validation.data.exchange &&
                currentSubscribedExchangeCode.current !==
                  validation.data.exchange
              ) {
                setupExchangeStatusSubscription(validation.data.exchange);
              } else if (
                !validation.data.exchange &&
                currentSubscribedExchangeCode.current &&
                !profileData?.exchange
              ) {
                setupExchangeStatusSubscription(null);
              }
            }
          } else {
            if (isMountedRef.current) {
              console.error(
                `[useStockData ${symbol} - ${instanceIdRef.current}] Zod validation (initial fetch) for live_quote_indicators failed:`,
                validation.error.flatten(),
                "Raw data:",
                data
              );
              setLatestQuote(null);
            }
          }
        } else {
          if (isMountedRef.current) {
            setLatestQuote(null);
          }
        }
      } catch (e) {
        if (isMountedRef.current && quoteSubActive) {
          console.error(
            `[useStockData ${symbol} - ${instanceIdRef.current}] Exception fetching initial quote:`,
            e
          );
          if (isMountedRef.current) setLatestQuote(null);
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

          const validation = LiveQuoteIndicatorDBSchema.safeParse(payload.new);
          if (validation.success) {
            if (isMountedRef.current) {
              setLatestQuote(validation.data);
              if (onLiveQuoteUpdate) {
                onLiveQuoteUpdate(validation.data, "realtime");
              }
              if (
                validation.data.exchange &&
                currentSubscribedExchangeCode.current !==
                  validation.data.exchange
              ) {
                setupExchangeStatusSubscription(validation.data.exchange);
              } else if (
                !validation.data.exchange &&
                currentSubscribedExchangeCode.current &&
                !profileData?.exchange
              ) {
                setupExchangeStatusSubscription(null);
              }
            }
          } else {
            console.error(
              `[useStockData ${symbol} - ${instanceIdRef.current}] Zod validation (realtime) for live_quote_indicators failed:`,
              validation.error.flatten(),
              "Payload:",
              payload.new
            );
          }
        },
        (status: LiveQuoteSubscriptionStatus, err?: Error) => {
          if (!isMountedRef.current || !quoteSubActive) return;
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (isMountedRef.current) {
              setDerivedMarketStatus("Error");
              setMarketStatusMessage(
                `Live quote connection issue for ${symbol}. Retrying...`
              );
            }
          } else if (status === "CLOSED" && isMountedRef.current) {
            if (isMountedRef.current) {
              setDerivedMarketStatus("Connecting");
              setMarketStatusMessage(
                `Live quote for ${symbol} connection interrupted. Attempting to reconnect...`
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
  }, [symbol, onLiveQuoteUpdate, setupExchangeStatusSubscription, profileData]);

  return { derivedMarketStatus, marketStatusMessage };
}
