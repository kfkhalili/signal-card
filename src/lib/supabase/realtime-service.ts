// src/lib/supabase/realtime-service.ts
import { createClient } from './client'; // Assuming your client setup is here
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Re-define types here or import from a shared types file
interface LivePriceRow {
  id: string;
  symbol: string;
  current_price: number;
  api_timestamp: number; // raw seconds
  fetched_at: string;
  // ... add other fields from your live_prices table if needed by the callback
}
export type LivePricePayload = RealtimePostgresChangesPayload<LivePriceRow>;

// Type for the callback function
export type PriceUpdateCallback = (payload: LivePricePayload) => void;

let channel: RealtimeChannel | null = null;
let currentSymbol: string | null = null;
let currentCallback: PriceUpdateCallback | null = null;
const supabase = createClient(); // Initialize client once for the service

/**
 * Subscribes to price updates for a specific symbol.
 * Ensures only one subscription is active at a time for this service.
 * @param symbol The stock symbol to filter by.
 * @param callback Function to call when a new price update is received.
 * @returns A function to unsubscribe.
 */
export function subscribeToPriceUpdates(symbol: string, callback: PriceUpdateCallback): () => void {
  // If already subscribed for the same symbol with the same callback, do nothing
  if (channel && currentSymbol === symbol && currentCallback === callback) {
    console.log(`RealtimeService: Already subscribed for symbol ${symbol}.`);
    // Still return an unsubscribe function that works
    return unsubscribeFromPriceUpdates;
  }

  // If subscribed to something else, or callback changed, unsubscribe first
  unsubscribeFromPriceUpdates();

  const channelName = `live_prices_updates_${symbol.toLowerCase()}`; // Internal name for client channel instance
  console.log(`RealtimeService: Attempting to subscribe to ${channelName} for symbol ${symbol}...`);
  currentCallback = callback; // Store the new callback
  currentSymbol = symbol; // Store the new symbol

  channel = supabase.channel(channelName);

  channel.on<LivePriceRow>(
      'postgres_changes',
      {
        event: '*', // Listen to all (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'live_prices',
        filter: `symbol=eq.${symbol}`
      },
      // Ensure the stored callback is called
      (payload) => { if (currentCallback) currentCallback(payload); }
    )
    .subscribe((status, err) => {
       if (status === 'SUBSCRIBED') {
          // Use channel.topic for the actual subscription identifier
          console.log(`RealtimeService: Connected! Subscription topic: ${channel?.topic}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`RealtimeService: Channel error on topic ${channel?.topic}:`, err);
          // Attempt to reset and resubscribe after a delay?
        } else if (status === 'TIMED_OUT') {
          console.warn(`RealtimeService: Connection timed out on topic ${channel?.topic}.`);
        }
    });

  // Return the single unsubscribe function
  return unsubscribeFromPriceUpdates;
}

/**
 * Unsubscribes from the currently active price update channel.
 */
export function unsubscribeFromPriceUpdates(): void {
  if (channel) {
    // Use channel.topic for accurate logging
    const topic = channel.topic;
    console.log(`RealtimeService: Unsubscribing from ${topic}...`);
    channel.unsubscribe()
      .then(() => { console.log(`RealtimeService: Successfully unsubscribed from ${topic}`); })
      .catch(error => console.error(`RealtimeService: Error unsubscribing from ${topic}:`, error));
    channel = null;
    currentCallback = null;
    currentSymbol = null;
  }
}
