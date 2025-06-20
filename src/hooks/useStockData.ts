// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { fromPromise, Result, ok } from "neverthrow";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/lib/supabase/database.types";
import type { FinancialStatementDBRow } from "@/lib/supabase/realtime-service";

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
  | "Connecting"
  | "ClientUnavailable";

export interface MarketStatusUpdate {
  status: DerivedMarketStatus;
  message: string | null;
  openingTime: string | null;
  closingTime: string | null;
  timezone: string | null;
  exchangeName: string | null;
  exchangeCode: string | null;
}

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

async function fetchInitialProfile(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<ProfileDBRow | null, Error>> {
  const result = await fromPromise(
    supabase.from("profiles").select("*").eq("symbol", symbol).maybeSingle(),
    (e) => e as Error
  );
  return result.map((response) => response.data);
}

async function fetchInitialQuote(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<LiveQuoteIndicatorDBRow | null, Error>> {
  const result = await fromPromise(
    supabase
      .from("live_quote_indicators")
      .select("*")
      .eq("symbol", symbol)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single(),
    (e) => e as Error
  );

  if (result.isErr() && result.error.message.includes("PGRST116")) {
    return ok(null);
  }
  return result.map((response) => response.data);
}

async function fetchExchangeStatus(
  supabase: SupabaseClient<Database>,
  exchangeCode: string
): Promise<Result<ExchangeMarketStatusRecord | null, Error>> {
  const result = await fromPromise(
    supabase
      .from("exchange_market_status")
      .select("*")
      .eq("exchange_code", exchangeCode)
      .single(),
    (e) => e as Error
  );
  if (result.isErr() && result.error.message.includes("PGRST116")) {
    return ok(null);
  }
  return result.map((response) => response.data);
}

export function useStockData({
  symbol,
  onProfileUpdate,
  onLiveQuoteUpdate,
  onExchangeStatusUpdate,
  onFinancialStatementUpdate,
}: UseStockDataProps): MarketStatusUpdate {
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
  const [openingTime, setOpeningTime] = useState<string | null>(null);
  const [closingTime, setClosingTime] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);

  const { supabase: supabaseClient } = useAuth();
  const isMountedRef = useRef<boolean>(false);

  const symbolChannelRef = useRef<RealtimeChannel | null>(null);
  const exchangeStatusChannelRef = useRef<RealtimeChannel | null>(null);
  const currentSubscribedExchangeCode = useRef<string | null>(null);
  const exchangeStatusRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (symbolChannelRef.current && supabaseClient) {
        supabaseClient
          .removeChannel(symbolChannelRef.current)
          .catch((err) =>
            console.error(
              `[useStockData ${symbol}] Error removing symbol channel:`,
              (err as Error).message
            )
          );
        symbolChannelRef.current = null;
      }
      if (exchangeStatusChannelRef.current && supabaseClient) {
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
      currentSubscribedExchangeCode.current = null;
      if (exchangeStatusRetryTimeoutRef.current)
        clearTimeout(exchangeStatusRetryTimeoutRef.current);
    };
  }, [symbol, supabaseClient]);

  const setupExchangeStatusSubscription = useCallback(
    async (exchangeCodeToSubscribe: string | undefined | null) => {
      if (!isMountedRef.current || !supabaseClient) return;
      if (exchangeStatusRetryTimeoutRef.current)
        clearTimeout(exchangeStatusRetryTimeoutRef.current);

      if (
        currentSubscribedExchangeCode.current &&
        (currentSubscribedExchangeCode.current !== exchangeCodeToSubscribe ||
          !exchangeCodeToSubscribe)
      ) {
        if (exchangeStatusChannelRef.current) {
          await supabaseClient
            .removeChannel(exchangeStatusChannelRef.current)
            .catch((err) =>
              console.error(
                "Error removing old exchange status channel",
                (err as Error).message
              )
            );
          exchangeStatusChannelRef.current = null;
        }
        currentSubscribedExchangeCode.current = null;
        if (isMountedRef.current) setExchangeStatus(null);
      }
      if (!exchangeCodeToSubscribe) return;
      if (
        currentSubscribedExchangeCode.current === exchangeCodeToSubscribe &&
        exchangeStatusChannelRef.current?.state === "joined"
      )
        return;

      currentSubscribedExchangeCode.current = exchangeCodeToSubscribe;
      if (isMountedRef.current) {
        setDerivedMarketStatus("Connecting");
        setMarketStatusMessage(
          `Subscribing to market status for ${exchangeCodeToSubscribe}...`
        );
      }

      const result = await fetchExchangeStatus(
        supabaseClient,
        exchangeCodeToSubscribe
      );
      if (!isMountedRef.current) return;

      result.match(
        (data) => {
          setExchangeStatus(data);
          if (data && onExchangeStatusUpdate) onExchangeStatusUpdate(data);
          else if (!data) {
            setDerivedMarketStatus("Unknown");
            setMarketStatusMessage(
              `No market status data for ${exchangeCodeToSubscribe}.`
            );
          }
        },
        (error) => {
          setExchangeStatus(null);
          setDerivedMarketStatus("Error");
          setMarketStatusMessage(
            `Exception fetching market status for ${exchangeCodeToSubscribe}: ${error.message}`
          );
          console.error(
            `[useStockData] Exception fetching market status for ${exchangeCodeToSubscribe}:`,
            error
          );
        }
      );

      if (exchangeStatusChannelRef.current) {
        await supabaseClient
          .removeChannel(exchangeStatusChannelRef.current)
          .catch((err) =>
            console.error(
              "Error removing stale exchange status channel",
              (err as Error).message
            )
          );
        exchangeStatusChannelRef.current = null;
      }

      const channelName = `exchange-status-${exchangeCodeToSubscribe
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/gi, "-")}-${instanceIdRef.current}`;
      const channel = supabaseClient.channel(channelName);
      channel
        .on<ExchangeMarketStatusRecord>(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "exchange_market_status",
            filter: `exchange_code=eq.${exchangeCodeToSubscribe}`,
          },
          (payloadIncoming) => {
            if (!isMountedRef.current) return;
            if (
              payloadIncoming.eventType === "DELETE" ||
              !payloadIncoming.new
            ) {
              if (isMountedRef.current) setExchangeStatus(null);
              return;
            }
            const newRecord = payloadIncoming.new as ExchangeMarketStatusRecord;
            if (isMountedRef.current) {
              setExchangeStatus(newRecord);
              if (onExchangeStatusUpdate) onExchangeStatusUpdate(newRecord);
            }
          }
        )
        .subscribe((statusChange, errSubscribe) => {
          if (!isMountedRef.current) return;
          const retry = () => {
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
          if (
            statusChange === "CHANNEL_ERROR" ||
            statusChange === "TIMED_OUT"
          ) {
            if (isMountedRef.current) {
              setDerivedMarketStatus("Error");
              setMarketStatusMessage(
                `Market status for ${exchangeCodeToSubscribe} issue: ${
                  errSubscribe?.message || statusChange
                }. Retrying...`
              );
              console.error(
                `[useStockData] Exchange status channel error for ${exchangeCodeToSubscribe}:`,
                errSubscribe || statusChange
              );
              retry();
            }
          } else if (statusChange === "CLOSED") {
            retry();
          } else if (statusChange === "SUBSCRIBED") {
            if (exchangeStatusRetryTimeoutRef.current)
              clearTimeout(exchangeStatusRetryTimeoutRef.current);
          }
        });
      exchangeStatusChannelRef.current = channel;
    },
    [onExchangeStatusUpdate, supabaseClient]
  );

  useEffect(() => {
    if (!supabaseClient) {
      setDerivedMarketStatus("ClientUnavailable");
      setMarketStatusMessage(
        "Data service unavailable: client configuration error."
      );
      return;
    }

    if (!symbol) {
      setDerivedMarketStatus("Unknown");
      setMarketStatusMessage("No symbol provided.");
      return;
    }

    let isSubscribed = true;

    setDerivedMarketStatus("Fetching");
    setMarketStatusMessage(`Initializing for ${symbol}...`);

    const fetchAndSubscribe = async () => {
      const profileRes = await fetchInitialProfile(supabaseClient, symbol);
      if (!isSubscribed) return;

      const fetchedProfile = profileRes.match(
        (data) => {
          if (isSubscribed) {
            setProfileData(data);
            if (data && onProfileUpdate) onProfileUpdate(data);
          }
          return data;
        },
        (error) => {
          console.error(
            `[useStockData ${symbol}] Initial profile fetch error:`,
            error.message
          );
          return null;
        }
      );

      const quoteRes = await fetchInitialQuote(supabaseClient, symbol);
      if (!isSubscribed) return;

      const fetchedQuote = quoteRes.match(
        (data) => {
          if (isSubscribed) {
            setLatestQuote(data);
            if (data && onLiveQuoteUpdate) onLiveQuoteUpdate(data, "fetch");
          }
          return data;
        },
        (error) => {
          console.error(
            `[useStockData ${symbol}] Initial quote fetch error:`,
            error.message
          );
          return null;
        }
      );

      const exchangeCode = fetchedProfile?.exchange || fetchedQuote?.exchange;
      if (exchangeCode && isSubscribed) {
        setupExchangeStatusSubscription(exchangeCode);
      }

      if (symbolChannelRef.current && supabaseClient) {
        await supabaseClient.removeChannel(symbolChannelRef.current);
      }
      if (!isSubscribed) return;

      const channelName = `symbol-updates-${symbol
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/gi, "-")}-${instanceIdRef.current}`;
      const channel = supabaseClient.channel(channelName);

      if (onProfileUpdate) {
        channel.on<ProfileDBRow>(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `symbol=eq.${symbol}`,
          },
          (payload) => {
            if (isSubscribed && payload.new) {
              const updatedRecord = payload.new as ProfileDBRow;
              setProfileData(updatedRecord);
              onProfileUpdate(updatedRecord);
            }
          }
        );
      }

      if (onLiveQuoteUpdate) {
        channel.on<LiveQuoteIndicatorDBRow>(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "live_quote_indicators",
            filter: `symbol=eq.${symbol}`,
          },
          (payload) => {
            if (isSubscribed && payload.new) {
              const newQuote = payload.new as LiveQuoteIndicatorDBRow;
              setLatestQuote(newQuote);
              onLiveQuoteUpdate(newQuote, "realtime");
            }
          }
        );
      }

      if (onFinancialStatementUpdate) {
        channel.on<FinancialStatementDBRow>(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "financial_statements",
            filter: `symbol=eq.${symbol}`,
          },
          (payload) => {
            if (isSubscribed && payload.new) {
              onFinancialStatementUpdate(
                payload.new as FinancialStatementDBRow
              );
            }
          }
        );
      }

      channel.subscribe((status, err) => {
        if (!isSubscribed) return;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setDerivedMarketStatus("Error");
          setMarketStatusMessage(
            `Data connection issue for ${symbol}: ${
              err?.message || status
            }. Retrying...`
          );
          console.error(
            `[useStockData ${symbol}] Symbol channel error:`,
            err || status
          );
        }
      });

      symbolChannelRef.current = channel;
    };

    fetchAndSubscribe();

    return () => {
      isSubscribed = false;
    };
  }, [
    symbol,
    supabaseClient,
    onProfileUpdate,
    onLiveQuoteUpdate,
    onFinancialStatementUpdate,
    setupExchangeStatusSubscription,
  ]);

  useEffect(() => {
    const relevantExchangeCode = profileData?.exchange || latestQuote?.exchange;

    if (!relevantExchangeCode) return;
    if (exchangeStatus) {
      setOpeningTime(exchangeStatus.opening_time_local);
      setClosingTime(exchangeStatus.closing_time_local);
      setTimezone(exchangeStatus.timezone);
    } else {
      setOpeningTime(null);
      setClosingTime(null);
      setTimezone(null);
    }

    if (!exchangeStatus) {
      setDerivedMarketStatus("Connecting");
      setMarketStatusMessage(
        `Connecting to market status for ${relevantExchangeCode}...`
      );
      return;
    }

    let newStatus: DerivedMarketStatus;
    let newMessage: string | null;

    if (exchangeStatus.current_day_is_holiday) {
      newStatus = "Holiday";
      newMessage =
        exchangeStatus.status_message ||
        `Market Closed (Holiday: ${
          exchangeStatus.current_holiday_name || "Official Holiday"
        })`;
    } else if (exchangeStatus.is_market_open) {
      if (latestQuote?.api_timestamp) {
        const diffMinutes =
          (Date.now() - latestQuote.api_timestamp * 1000) / 60000;
        newStatus = diffMinutes > 15 ? "Delayed" : "Open";
        newMessage =
          exchangeStatus.status_message ||
          (newStatus === "Delayed" ? "Live data is delayed." : null);
      } else {
        newStatus = "Open";
        newMessage = exchangeStatus.status_message || "Awaiting first quote";
      }
    } else {
      newStatus = "Closed";
      newMessage = exchangeStatus.status_message || null;
    }

    setDerivedMarketStatus((prevStatus) =>
      prevStatus !== newStatus ? newStatus : prevStatus
    );
    setMarketStatusMessage((prevMessage) =>
      prevMessage !== newMessage ? newMessage : prevMessage
    );
  }, [profileData, latestQuote, exchangeStatus]);

  return {
    status: derivedMarketStatus,
    message: marketStatusMessage,
    openingTime,
    closingTime,
    timezone,
    exchangeName: exchangeStatus?.name || null,
    exchangeCode: exchangeStatus?.exchange_code || null,
  };
}
