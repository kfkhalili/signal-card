// src/lib/supabase/realtime-service.ts
import { createClient } from "./client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

// Updated Interface matching the live_quote_indicators table including new fields
interface LiveQuoteIndicatorRow {
  id: string;
  symbol: string;
  current_price: number;
  change_percentage: number | null;
  day_change: number | null;
  volume: number | null;
  day_low: number | null;
  day_high: number | null;
  market_cap: number | null;
  day_open: number | null;
  previous_close: number | null;
  api_timestamp: number; // raw seconds
  sma_50d: number | null;
  sma_200d: number | null;
  fetched_at: string;
  is_market_open: boolean | null; // NEW
  market_status_message: string | null; // NEW
  market_exchange_name: string | null; // NEW
}

export type LiveQuotePayload =
  RealtimePostgresChangesPayload<LiveQuoteIndicatorRow>;
export type QuoteUpdateCallback = (payload: LiveQuotePayload) => void;

let channel: RealtimeChannel | null = null;
let currentSymbol: string | null = null;
let currentCallback: QuoteUpdateCallback | null = null;
const supabase = createClient(); // Initialize client once for the service

const TABLE_NAME = "live_quote_indicators"; // Use constant for table name

/**
 * Subscribes to quote updates for a specific symbol from the new table.
 */
export function subscribeToQuoteUpdates(
  symbol: string,
  callback: QuoteUpdateCallback
): () => void {
  // Construct channel name and topic prefix using the new table name
  const channelName = `quote_indicators_updates_${symbol.toLowerCase()}`;
  const topicFilter = `symbol=eq.${symbol}`;

  if (channel && currentSymbol === symbol && currentCallback === callback) {
    console.log(
      `RealtimeService: Already subscribed for symbol ${symbol} on ${TABLE_NAME}.`
    );
    return unsubscribeFromQuoteUpdates;
  }

  unsubscribeFromQuoteUpdates();

  console.log(
    `RealtimeService: Attempting to subscribe to ${channelName} for symbol ${symbol} on ${TABLE_NAME}...`
  );
  currentCallback = callback;
  currentSymbol = symbol;

  channel = supabase.channel(channelName);

  channel
    .on<LiveQuoteIndicatorRow>( // Use updated row type
      "postgres_changes",
      {
        event: "*", // Still listen to all changes (upsert triggers INSERT or UPDATE)
        schema: "public",
        table: TABLE_NAME, // TARGET THE NEW TABLE
        filter: topicFilter, // Use the symbol filter
      },
      (payload) => {
        if (currentCallback) currentCallback(payload);
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `RealtimeService: Connected! Subscription topic: ${channel?.topic}`
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(
          `RealtimeService: Channel error on topic ${channel?.topic}:`,
          err
        );
      } else if (status === "TIMED_OUT") {
        console.warn(
          `RealtimeService: Connection timed out on topic ${channel?.topic}.`
        );
      }
    });

  return unsubscribeFromQuoteUpdates;
}

/**
 * Unsubscribes from the currently active quote update channel.
 */
export function unsubscribeFromQuoteUpdates(): void {
  if (channel) {
    const topic = channel.topic;
    console.log(`RealtimeService: Unsubscribing from ${topic}...`);
    channel
      .unsubscribe()
      .then(() => {
        console.log(`RealtimeService: Successfully unsubscribed from ${topic}`);
      })
      .catch((error) =>
        console.error(
          `RealtimeService: Error unsubscribing from ${topic}:`,
          error
        )
      );
    channel = null;
    currentCallback = null;
    currentSymbol = null;
  }
}
