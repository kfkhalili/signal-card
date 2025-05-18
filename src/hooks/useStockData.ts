// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import {
  subscribeToQuoteUpdates as subscribeToLiveQuoteIndicators,
  type LiveQuotePayload,
  type SubscriptionStatus as LiveQuoteSubscriptionStatus,
} from "@/lib/supabase/realtime-service";
import type { Database } from "@/lib/supabase/database.types";

// Use generated types
export type ProfileDBRow = Database["public"]["Tables"]["profiles"]["Row"];
export type LiveQuoteIndicatorDBRow =
  Database["public"]["Tables"]["live_quote_indicators"]["Row"];
export type ExchangeMarketStatusRecord =
  Database["public"]["Tables"]["exchange_market_status"]["Row"];

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

  const supabaseClientRef = useRef<SupabaseClient<Database>>(
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
              `Error removing profile channel for ${symbol}:`,
              err.message
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
              `Error removing exchange status channel for ${currentSubscribedExchangeCode.current}:`,
              err.message
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
            .catch((e) =>
              console.error(
                "Error removing old exchange status channel",
                e.message
              )
            );
          exchangeStatusChannelRef.current = null;
        }
        currentSubscribedExchangeCode.current = null;
        if (isMountedRef.current) setExchangeStatus(null);
      }

      if (!exchangeCodeToSubscribe) {
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
          .single(); // data is ExchangeMarketStatusRecord | null

        if (!isMountedRef.current) return;

        if (error && error.code !== "PGRST116") {
          // PGRST116: 0 rows, not an error for .single()
          throw error;
        }

        if (isMountedRef.current) {
          setExchangeStatus(data); // data is already ExchangeMarketStatusRecord | null
          if (data && onExchangeStatusUpdate) {
            onExchangeStatusUpdate(data);
          } else if (!data) {
            // No data found for this exchange
            setDerivedMarketStatus("Unknown");
            setMarketStatusMessage(
              `No market status data found for exchange: ${exchangeCodeToSubscribe}.`
            );
          }
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "unknown error occurred";
        if (isMountedRef.current) {
          setExchangeStatus(null);
          setDerivedMarketStatus("Error");
          setMarketStatusMessage(
            `Exception fetching market status for ${exchangeCodeToSubscribe}: ${errorMessage}`
          );
        }
      }

      if (exchangeStatusChannelRef.current) {
        await supabaseClientRef.current
          .removeChannel(exchangeStatusChannelRef.current)
          .catch((e) =>
            console.error(
              "Error removing stale exchange status channel",
              e.message
            )
          );
        exchangeStatusChannelRef.current = null;
      }

      const channelName = `exchange-status-${exchangeCodeToSubscribe
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/gi, "-")}-${instanceIdRef.current}`;
      const channel = supabaseClientRef.current
        .channel(channelName)
        .on<ExchangeMarketStatusRecord>( // Realtime payload.new will be Partial<ExchangeMarketStatusRecord>
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "exchange_market_status",
            filter: `exchange_code=eq.${exchangeCodeToSubscribe}`,
          },
          (payload) => {
            if (!isMountedRef.current) return;
            if (payload.eventType === "DELETE" || !payload.new) {
              if (isMountedRef.current) setExchangeStatus(null);
              return;
            }
            // Assuming payload.new is a complete ExchangeMarketStatusRecord for INSERT/UPDATE
            // If it can be partial, you might need to merge with existing state or re-fetch.
            // For simplicity, we'll assume it's complete for now.
            const newRecord = payload.new as ExchangeMarketStatusRecord;
            if (isMountedRef.current) {
              setExchangeStatus(newRecord);
              if (onExchangeStatusUpdate) {
                onExchangeStatusUpdate(newRecord);
              }
            }
          }
        )
        .subscribe((status) => {
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
    [onExchangeStatusUpdate] // Removed 'symbol' as it's not directly used in this callback's logic
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
          .select("*") // Selects all columns as defined by ProfileDBRow
          .eq("symbol", symbol)
          .maybeSingle(); // data is ProfileDBRow | null

        if (!profileSubActive || !isMountedRef.current) return;
        if (error) throw error;

        if (isMountedRef.current) {
          setProfileData(data); // data is already ProfileDBRow | null
          if (data && onProfileUpdate) {
            onProfileUpdate(data);
          }
          const currentExchange = data?.exchange;
          if (
            currentExchange &&
            currentSubscribedExchangeCode.current !== currentExchange
          ) {
            setupExchangeStatusSubscription(currentExchange);
          } else if (
            !currentExchange &&
            currentSubscribedExchangeCode.current
          ) {
            setupExchangeStatusSubscription(null);
          }
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        if (!profileSubActive || !isMountedRef.current) return;
        console.error(
          `Exception during initial profile fetch for ${symbol}:`,
          errorMessage
        );
        if (isMountedRef.current) setProfileData(null);
      }

      if (profileChannelRef.current) {
        await supabaseClientRef.current
          .removeChannel(profileChannelRef.current)
          .catch((e) =>
            console.error("Error removing stale profile channel", e.message)
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
          (payload) => {
            if (!isMountedRef.current || !profileSubActive || !payload.new)
              return;
            // payload.new is Partial<ProfileDBRow>
            // To maintain ProfileDBRow | null state, we might need to merge or ensure all fields
            // For simplicity, if an update comes, we assume it's the full new state or enough to update.
            // If payload.new is truly Partial, you might need to fetch the full row or merge.
            // However, Supabase Realtime UPDATE often sends the complete new row.
            const updatedRecord = payload.new as ProfileDBRow; // Cast if confident it's full
            if (isMountedRef.current) {
              setProfileData(updatedRecord);
              if (onProfileUpdate) onProfileUpdate(updatedRecord);

              const newExchange = updatedRecord.exchange;
              if (
                newExchange &&
                currentSubscribedExchangeCode.current !== newExchange
              ) {
                setupExchangeStatusSubscription(newExchange);
              } else if (
                !newExchange &&
                currentSubscribedExchangeCode.current
              ) {
                setupExchangeStatusSubscription(null);
              }
            }
          }
        )
        .subscribe((status, err) => {
          if (
            status === "CHANNEL_ERROR" &&
            isMountedRef.current &&
            profileSubActive
          ) {
            console.error(`Profile channel error for ${symbol}:`, err?.message);
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
          .catch((e) =>
            console.error(
              "Error removing profile channel on cleanup",
              e.message
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
          .single(); // data is LiveQuoteIndicatorDBRow | null

        if (!quoteSubActive || !isMountedRef.current) return;

        if (error && error.code !== "PGRST116") throw error;

        if (isMountedRef.current) {
          setLatestQuote(data); // data is already LiveQuoteIndicatorDBRow | null
          if (data && onLiveQuoteUpdate) {
            onLiveQuoteUpdate(data, "fetch");
          }
          const currentExchange = data?.exchange;
          if (
            currentExchange &&
            currentSubscribedExchangeCode.current !== currentExchange
          ) {
            setupExchangeStatusSubscription(currentExchange);
          } else if (
            !currentExchange &&
            currentSubscribedExchangeCode.current &&
            !profileData?.exchange
          ) {
            setupExchangeStatusSubscription(null);
          }
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        if (isMountedRef.current && quoteSubActive) {
          console.error(
            `Exception fetching initial quote for ${symbol}:`,
            errorMessage
          );
          if (isMountedRef.current) setLatestQuote(null);
        }
      }

      liveQuoteUnsubscribeRef.current = subscribeToLiveQuoteIndicators(
        symbol,
        (payload: LiveQuotePayload) => {
          // payload is RealtimePostgresChangesPayload<LiveQuoteIndicatorDBRow>
          if (
            !isMountedRef.current ||
            !quoteSubActive ||
            payload.eventType === "DELETE" ||
            !payload.new // payload.new is Partial<LiveQuoteIndicatorDBRow>
          )
            return;

          // Assuming payload.new contains the full row for INSERT/UPDATE from Realtime
          const newQuoteRecord = payload.new as LiveQuoteIndicatorDBRow;
          if (isMountedRef.current) {
            setLatestQuote(newQuoteRecord);
            if (onLiveQuoteUpdate) {
              onLiveQuoteUpdate(newQuoteRecord, "realtime");
            }
            const newExchange = newQuoteRecord.exchange;
            if (
              newExchange &&
              currentSubscribedExchangeCode.current !== newExchange
            ) {
              setupExchangeStatusSubscription(newExchange);
            } else if (
              !newExchange &&
              currentSubscribedExchangeCode.current &&
              !profileData?.exchange
            ) {
              setupExchangeStatusSubscription(null);
            }
          }
        },
        (status: LiveQuoteSubscriptionStatus) => {
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
