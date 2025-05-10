// src/lib/supabase/realtime-service.ts
import { createClient } from "./client"; // Your Supabase client instance
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import { z } from "zod"; // Make sure Zod is imported here

// Define and EXPORT the interface for the raw data from your 'live_quote_indicators' table
export interface LiveQuoteIndicatorDBRow {
  id: string;
  symbol: string;
  current_price: number;
  api_timestamp: number; // Unix timestamp (seconds) from the API/source
  fetched_at: string; // ISO string timestamp of when the DB row was last updated/fetched
  change_percentage?: number | null;
  day_change?: number | null;
  volume?: number | null;
  day_low?: number | null;
  day_high?: number | null;
  market_cap?: number | null;
  day_open?: number | null;
  previous_close?: number | null;
  sma_50d?: number | null;
  sma_200d?: number | null;
  is_market_open?: boolean | null;
  market_status_message?: string | null;
  market_exchange_name?: string | null;
}

// Define and EXPORT the Zod schema
export const LiveQuoteIndicatorDBSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  current_price: z.number(),
  api_timestamp: z.number(),
  fetched_at: z.string(), // Assuming this is always present as per your previous definition
  change_percentage: z.number().nullable().optional(),
  day_change: z.number().nullable().optional(),
  day_low: z.number().nullable().optional(),
  day_high: z.number().nullable().optional(),
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

// Type for the payload received from Supabase realtime
// This now uses the exported LiveQuoteIndicatorDBRow
export type LiveQuotePayload =
  RealtimePostgresChangesPayload<LiveQuoteIndicatorDBRow>;

// Callback type for when new data is received
export type QuoteUpdateCallback = (payload: LiveQuotePayload) => void;

// Callback type for subscription status changes
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
    supabaseClientInstance = createClient();
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
  const topicFilter = `symbol=eq.${symbol}`;

  console.log(
    `RealtimeService: Attempting to subscribe to channel ${channelName} for symbol ${symbol}...`
  );

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<LiveQuoteIndicatorDBRow>( // Use the exported LiveQuoteIndicatorDBRow
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE_NAME, filter: topicFilter },
      (payload) => {
        onData(payload as LiveQuotePayload);
      }
    )
    .subscribe((status, err) => {
      onStatusChange(status as SubscriptionStatus, err);
      // ... (console logs for status as before) ...
      switch (status) {
        case "SUBSCRIBED":
          console.log(
            `RealtimeService (${symbol}): Successfully SUBSCRIBED to ${channel.topic}`
          );
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
    console.log(
      `RealtimeService (${symbol}): Unsubscribing and removing channel ${channel.topic}...`
    );
    supabase
      .removeChannel(channel)
      .then((removeStatus) =>
        console.log(
          `RealtimeService (${symbol}): Channel ${channel.topic} removal status: ${removeStatus}`
        )
      )
      .catch((error) =>
        console.error(
          `RealtimeService (${symbol}): Error removing channel ${channel.topic}:`,
          error
        )
      );
  };
}
