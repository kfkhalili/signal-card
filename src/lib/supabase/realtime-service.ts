// src/lib/supabase/realtime-service.ts
import { createSupabaseBrowserClient } from "./client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import { z } from "zod";

// Updated interface for the raw data from your 'live_quote_indicators' table
export interface LiveQuoteIndicatorDBRow {
  id: string;
  symbol: string;
  current_price: number;
  api_timestamp: number;
  fetched_at: string;
  change_percentage?: number | null;
  day_change?: number | null;
  volume?: number | null;
  day_low?: number | null;
  day_high?: number | null;
  year_high?: number | null;
  year_low?: number | null;
  market_cap?: number | null;
  day_open?: number | null;
  previous_close?: number | null;
  sma_50d?: number | null;
  sma_200d?: number | null;
  is_market_open?: boolean | null;
  market_status_message?: string | null;
  market_exchange_name?: string | null;
}

// Updated Zod schema
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
  year_high: z.number().nullable().optional(),
  year_low: z.number().nullable().optional(),
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

export type LiveQuotePayload =
  RealtimePostgresChangesPayload<LiveQuoteIndicatorDBRow>;

export type QuoteUpdateCallback = (payload: LiveQuotePayload) => void;

export type SubscriptionStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR";
export type SubscriptionStatusCallback = (
  status: SubscriptionStatus,
  err?: Error
) => void;

const TABLE_NAME = "live_quote_indicators";
let supabaseClientInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createSupabaseBrowserClient();
  }
  return supabaseClientInstance;
}

export function subscribeToQuoteUpdates(
  symbol: string,
  onData: QuoteUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  const channelName = `realtime:stock-quote-${symbol.toLowerCase()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;
  // The filter for postgres_changes remains on the symbol column
  const topicFilter = `symbol=eq.${symbol}`;

  if (process.env.NODE_ENV === "development") {
    console.debug(
      `RealtimeService: Attempting to subscribe to channel ${channelName} for symbol ${symbol}...`
    );
  }

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<LiveQuoteIndicatorDBRow>(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE_NAME, filter: topicFilter },
      (payload) => {
        if (typeof onData === "function") {
          onData(payload as LiveQuotePayload);
        }
      }
    )
    .subscribe((status, err) => {
      if (typeof onStatusChange === "function") {
        onStatusChange(status as SubscriptionStatus, err);
      } else {
        console.warn(
          `RealtimeService (${symbol}): onStatusChange was not a function for channel ${channel.topic} when status event "${status}" occurred.`
        );
      }

      switch (status) {
        case "SUBSCRIBED":
          if (process.env.NODE_ENV === "development") {
            console.debug(
              `RealtimeService (${symbol}): Successfully SUBSCRIBED to ${channel.topic}`
            );
          }
          break;
        case "CHANNEL_ERROR":
          console.error(
            `RealtimeService (${symbol}): CHANNEL_ERROR on ${channel.topic}. Error:`,
            err
          );
          break;
        case "TIMED_OUT":
          console.warn(
            `RealtimeService (${symbol}): Subscription TIMED_OUT on ${channel.topic}.`
          );
          break;
        case "CLOSED":
          console.warn(
            `RealtimeService (${symbol}): Subscription CLOSED for ${channel.topic}.`
          );
          break;
      }
    });

  return () => {
    if (process.env.NODE_ENV === "development") {
      console.debug(
        `RealtimeService (${symbol}): Unsubscribing and removing channel ${channel.topic}...`
      );
    }
    supabase
      .removeChannel(channel)
      .then((removeStatus) => {
        if (process.env.NODE_ENV === "development") {
          console.debug(
            `RealtimeService (${symbol}): Channel ${channel.topic} removal status: ${removeStatus}`
          );
        }
      })
      .catch((error) =>
        console.error(
          `RealtimeService (${symbol}): Error removing channel ${channel.topic}:`,
          error
        )
      );
  };
}
