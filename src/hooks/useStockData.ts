// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  subscribeToQuoteUpdates as subscribeToLiveQuoteIndicators,
  type LiveQuotePayload,
  type SubscriptionStatus as LiveQuoteSubscriptionStatus,
  subscribeToFinancialStatementUpdates,
  type FinancialStatementPayload,
  type FinancialStatementDBRow,
} from "@/lib/supabase/realtime-service";
import type { Database } from "@/lib/supabase/database.types";

export type ProfileDBRow = Database["public"]["Tables"]["profiles"]["Row"];
type LiveQuoteIndicatorDBRow =
  Database["public"]["Tables"]["live_quote_indicators"]["Row"];
type ExchangeMarketStatusRecord =
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
  onFinancialStatementUpdate?: (statement: FinancialStatementDBRow) => void;
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
  onFinancialStatementUpdate,
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

  // Memoize the Supabase client instance to prevent re-creation on every render.
  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);
  const isMountedRef = useRef<boolean>(false);

  const profileChannelRef = useRef<RealtimeChannel | null>(null);
  const liveQuoteUnsubscribeRef = useRef<(() => void) | null>(null);
  const exchangeStatusChannelRef = useRef<RealtimeChannel | null>(null);
  const financialStatementUnsubscribeRef = useRef<(() => void) | null>(null);

  const currentSubscribedExchangeCode = useRef<string | null>(null);
  const exchangeStatusRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    // The supabaseClient is stable due to useMemo, no need to capture it here.
    return () => {
      isMountedRef.current = false;
      if (profileChannelRef.current) {
        supabaseClient
          .removeChannel(profileChannelRef.current)
          .catch((err) =>
            console.error(
              `[useStockData ${symbol}] Error removing profile channel:`,
              (err as Error).message
            )
          );
        profileChannelRef.current = null;
      }
      if (liveQuoteUnsubscribeRef.current) {
        liveQuoteUnsubscribeRef.current();
        liveQuoteUnsubscribeRef.current = null;
      }
      if (exchangeStatusChannelRef.current) {
        supabaseClient
          .removeChannel(exchangeStatusChannelRef.current)
          .catch((err) =>
            console.error(
              `[useStockData ${
                currentSubscribedExchangeCode.current || symbol
              }] Error removing exchange status channel:`,
              (err as Error).message
            )
          );
        exchangeStatusChannelRef.current = null;
      }
      if (financialStatementUnsubscribeRef.current) {
        // New cleanup
        financialStatementUnsubscribeRef.current();
        financialStatementUnsubscribeRef.current = null;
      }
      currentSubscribedExchangeCode.current = null;
      if (exchangeStatusRetryTimeoutRef.current) {
        clearTimeout(exchangeStatusRetryTimeoutRef.current);
      }
    };
  }, [symbol, supabaseClient]);

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
          await supabaseClient
            .removeChannel(exchangeStatusChannelRef.current)
            .catch((e) =>
              console.error(
                "[useStockData] Error removing old exchange status channel",
                (e as Error).message
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
          `Subscribing to market status for ${exchangeCodeToSubscribe}...`
        );
      }

      try {
        const { data, error } = await supabaseClient
          .from("exchange_market_status")
          .select("*")
          .eq("exchange_code", exchangeCodeToSubscribe)
          .single();

        if (!isMountedRef.current) return;

        if (error && error.code !== "PGRST116") {
          // PGRST116: "Fetched result consists of 0 rows"
          throw error;
        }

        if (isMountedRef.current) {
          setExchangeStatus(data);
          if (data && onExchangeStatusUpdate) {
            onExchangeStatusUpdate(data);
          } else if (!data) {
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
            `[useStockData] Exception fetching market status for ${exchangeCodeToSubscribe}: ${errorMessage}`
          );
        }
      }

      if (exchangeStatusChannelRef.current) {
        await supabaseClient
          .removeChannel(exchangeStatusChannelRef.current)
          .catch((e) =>
            console.error(
              "[useStockData] Error removing stale exchange status channel",
              (e as Error).message
            )
          );
        exchangeStatusChannelRef.current = null;
      }

      const channelName = `exchange-status-${exchangeCodeToSubscribe
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/gi, "-")}-${instanceIdRef.current}`;
      const channel = supabaseClient
        .channel(channelName)
        .on<ExchangeMarketStatusRecord>(
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
                `Market status connection issue for ${exchangeCodeToSubscribe}. Retrying...`
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
    [onExchangeStatusUpdate, supabaseClient]
  );

  useEffect(() => {
    if (!symbol) {
      setProfileData(null);
      setLatestQuote(null);
      setupExchangeStatusSubscription(null); // Ensure cleanup if symbol becomes null
      return;
    }
    let profileSubActive = true;

    const fetchInitialProfileAndSubscribe = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("profiles")
          .select("*") // Select all for ProfileDBRow
          .eq("symbol", symbol)
          .maybeSingle();

        if (!profileSubActive || !isMountedRef.current) return;
        if (error) throw error;

        if (isMountedRef.current) {
          setProfileData(data);
          if (data && onProfileUpdate) {
            onProfileUpdate(data);
          }
          const currentExchange = data?.exchange;
          if (
            currentExchange &&
            currentSubscribedExchangeCode.current !== currentExchange
          ) {
            await setupExchangeStatusSubscription(currentExchange);
          } else if (
            !currentExchange &&
            currentSubscribedExchangeCode.current
          ) {
            await setupExchangeStatusSubscription(null);
          }
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        if (!profileSubActive || !isMountedRef.current) return;
        console.error(
          `[useStockData ${symbol}] Exception during initial profile fetch:`,
          errorMessage
        );
        if (isMountedRef.current) setProfileData(null);
      }

      if (profileChannelRef.current) {
        await supabaseClient
          .removeChannel(profileChannelRef.current)
          .catch((e) =>
            console.error(
              "[useStockData] Error removing stale profile channel",
              (e as Error).message
            )
          );
        profileChannelRef.current = null;
      }

      const channelName = `profile-${symbol
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/gi, "-")}-${instanceIdRef.current}`;
      const channel = supabaseClient
        .channel(channelName)
        .on<ProfileDBRow>(
          "postgres_changes",
          {
            event: "UPDATE", // Only listen to updates for profiles
            schema: "public",
            table: "profiles",
            filter: `symbol=eq.${symbol}`,
          },
          (payload) => {
            if (!isMountedRef.current || !profileSubActive || !payload.new)
              return;
            const updatedRecord = payload.new as ProfileDBRow;
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
            console.error(
              `[useStockData ${symbol}] Profile channel error:`,
              err?.message
            );
          }
        });
      profileChannelRef.current = channel;
    };

    fetchInitialProfileAndSubscribe();

    return () => {
      profileSubActive = false;
      if (profileChannelRef.current) {
        supabaseClient
          .removeChannel(profileChannelRef.current)
          .catch((e) =>
            console.error(
              "[useStockData] Error removing profile channel on cleanup",
              (e as Error).message
            )
          );
        profileChannelRef.current = null;
      }
    };
  }, [
    symbol,
    onProfileUpdate,
    setupExchangeStatusSubscription,
    supabaseClient,
  ]);

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
        const { data, error } = await supabaseClient
          .from("live_quote_indicators")
          .select("*") // Select all for LiveQuoteIndicatorDBRow
          .eq("symbol", symbol)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .single();

        if (!quoteSubActive || !isMountedRef.current) return;

        if (error && error.code !== "PGRST116") throw error;

        if (isMountedRef.current) {
          setLatestQuote(data);
          if (data && onLiveQuoteUpdate) {
            onLiveQuoteUpdate(data, "fetch");
          }
          const currentExchange = data?.exchange;
          if (
            currentExchange &&
            currentSubscribedExchangeCode.current !== currentExchange
          ) {
            await setupExchangeStatusSubscription(currentExchange);
          } else if (
            !currentExchange &&
            currentSubscribedExchangeCode.current &&
            !profileData?.exchange
          ) {
            await setupExchangeStatusSubscription(null);
          }
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        if (isMountedRef.current && quoteSubActive) {
          console.error(
            `[useStockData ${symbol}] Exception fetching initial quote:`,
            errorMessage
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
  }, [
    symbol,
    onLiveQuoteUpdate,
    setupExchangeStatusSubscription,
    profileData,
    supabaseClient,
  ]);

  // New useEffect for financial statement subscription
  useEffect(() => {
    if (!symbol || !onFinancialStatementUpdate) {
      if (financialStatementUnsubscribeRef.current) {
        financialStatementUnsubscribeRef.current();
        financialStatementUnsubscribeRef.current = null;
      }
      return;
    }
    let subActive = true;

    if (financialStatementUnsubscribeRef.current) {
      financialStatementUnsubscribeRef.current(); // Clean up previous if symbol changes
    }

    financialStatementUnsubscribeRef.current =
      subscribeToFinancialStatementUpdates(
        symbol,
        (payload: FinancialStatementPayload) => {
          if (!isMountedRef.current || !subActive) return;

          if (
            (payload.eventType === "INSERT" ||
              payload.eventType === "UPDATE") &&
            payload.new
          ) {
            const newStatement = payload.new as FinancialStatementDBRow;
            onFinancialStatementUpdate(newStatement);
          }
        },
        (status: LiveQuoteSubscriptionStatus, err?: Error) => {
          if (!isMountedRef.current || !subActive) return;
          if (process.env.NODE_ENV === "development") {
            console.debug(
              `[useStockData ${symbol}] Financial statement subscription status: ${status}`,
              err || ""
            );
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error(
              `[useStockData ${symbol}] Financial statement channel error or timeout:`,
              err
            );
            // Optionally implement retry logic here if desired
          }
        }
      );

    return () => {
      subActive = false;
      if (financialStatementUnsubscribeRef.current) {
        financialStatementUnsubscribeRef.current();
        financialStatementUnsubscribeRef.current = null;
      }
    };
  }, [symbol, onFinancialStatementUpdate, supabaseClient]);

  return { derivedMarketStatus, marketStatusMessage };
}
