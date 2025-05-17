// src/lib/supabase/realtime-service.ts
import { createSupabaseBrowserClient } from "@/lib/supabase/client"; // Corrected client import
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import { z } from "zod";

// Updated interface to match your DDL for public.live_quote_indicators
export interface LiveQuoteIndicatorDBRow {
  id: string; // uuid, gen_random_uuid()
  symbol: string; // text, not null
  current_price: number; // double precision, not null
  change_percentage?: number | null; // double precision, null
  day_change?: number | null; // double precision, null
  volume?: number | null; // bigint, null (maps to number in JS)
  day_low?: number | null; // double precision, null
  day_high?: number | null; // double precision, null
  market_cap?: number | null; // bigint, null
  day_open?: number | null; // double precision, null
  previous_close?: number | null; // double precision, null
  api_timestamp: number; // bigint, not null (Unix timestamp in seconds)
  sma_50d?: number | null; // double precision, null
  sma_200d?: number | null; // double precision, null
  fetched_at: string; // timestamp with time zone, not null (ISO string)
  year_high?: number | null; // double precision, null
  year_low?: number | null; // double precision, null
  exchange?: string | null; // text, null (NEW - this is your exchange short code)
}

// Updated Zod schema to match the interface and DDL
export const LiveQuoteIndicatorDBSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string(),
  current_price: z.number(),
  change_percentage: z.number().nullable().optional(),
  day_change: z.number().nullable().optional(),
  volume: z.number().int().nullable().optional(), // bigint often handled as number, ensure int if it should be
  day_low: z.number().nullable().optional(),
  day_high: z.number().nullable().optional(),
  market_cap: z.number().int().nullable().optional(),
  day_open: z.number().nullable().optional(),
  previous_close: z.number().nullable().optional(),
  api_timestamp: z.number().int(), // bigint from FMP (seconds)
  sma_50d: z.number().nullable().optional(),
  sma_200d: z.number().nullable().optional(),
  fetched_at: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
    // Handles timestamptz string
    message: "Invalid date string for fetched_at.",
  }),
  year_high: z.number().nullable().optional(),
  year_low: z.number().nullable().optional(),
  exchange: z.string().trim().min(1).nullable().optional(), // Matches DDL: text null
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
  // Ensure channel names are unique if multiple useStockData instances run for same symbol (e.g. different pages)
  // Though typically one useStockData per symbol for the active workspace.
  const channelName = `live-quote-${symbol
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/gi, "-")}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const topicFilter = `symbol=eq.${symbol}`;

  if (process.env.NODE_ENV === "development") {
    console.debug(
      `[realtime-service] Subscribing to channel ${channelName} for symbol ${symbol}...`
    );
  }

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } }, // ack can help with message ordering/reliability if needed
  });

  channel
    .on<LiveQuoteIndicatorDBRow>( // Use the updated LiveQuoteIndicatorDBRow
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE_NAME, filter: topicFilter },
      (payload) => {
        // Payload here is LiveQuotePayload
        if (typeof onData === "function") {
          // Ensure the payload.new matches the fields expected by LiveQuoteIndicatorDBRow
          // Zod validation will happen in useStockData before calling its onLiveQuoteUpdate callback
          onData(payload);
        }
      }
    )
    .subscribe((status, err) => {
      const castedStatus = status as SubscriptionStatus; // Cast Supabase's status string
      if (typeof onStatusChange === "function") {
        onStatusChange(castedStatus, err);
      } else if (process.env.NODE_ENV === "development") {
        console.warn(
          `[realtime-service] (${symbol}): onStatusChange was not a function for channel ${channel.topic} when status event "${status}" occurred.`
        );
      }

      if (process.env.NODE_ENV === "development") {
        switch (castedStatus) {
          case "SUBSCRIBED":
            console.debug(
              `[realtime-service] (${symbol}): Successfully SUBSCRIBED to ${channel.topic}`
            );
            break;
          case "CHANNEL_ERROR":
            console.error(
              `[realtime-service] (${symbol}): CHANNEL_ERROR on ${channel.topic}. Error:`,
              err
            );
            break;
          case "TIMED_OUT":
            console.warn(
              `[realtime-service] (${symbol}): Subscription TIMED_OUT on ${channel.topic}.`
            );
            break;
          case "CLOSED": // This can happen if server closes connection or due to network issues.
            console.warn(
              `[realtime-service] (${symbol}): Subscription CLOSED for ${channel.topic}.`
            );
            break;
        }
      }
    });

  const unsubscribe = () => {
    if (process.env.NODE_ENV === "development") {
      console.debug(
        `[realtime-service] (${symbol}): Unsubscribing and removing channel ${channel.topic}...`
      );
    }
    supabase
      .removeChannel(channel)
      .catch((error) =>
        console.error(
          `[realtime-service] (${symbol}): Error removing channel ${channel.topic}:`,
          error
        )
      );
  };
  return unsubscribe;
}
