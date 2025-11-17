// src/hooks/useTrackSubscription.ts
// Hook for tracking symbol subscriptions with Realtime Presence
// CRITICAL: This enables backend-controlled refresh system
// Runs in parallel with existing postgres_changes subscriptions (non-breaking)

import { useEffect, useRef, useState, useMemo } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { checkFeatureFlag } from '@/lib/feature-flags';

interface UseTrackSubscriptionOptions {
  symbol: string;
  dataTypes: string[]; // e.g., ['quote', 'profile', 'financial-statements']
  enabled?: boolean; // Optional: allow manual control
}

/**
 * Hook to track symbol subscriptions with Realtime Presence
 *
 * This hook:
 * 1. Joins a Realtime channel with Presence config
 * 2. Tracks presence with metadata (symbol, dataTypes, userId)
 * 3. Automatically cleans up on unmount
 *
 * CRITICAL: Backend autonomously discovers subscriptions from Presence
 * - Analytics table updated every minute via refresh-analytics-from-presence-v2
 * - Background staleness checker runs every minute to refresh stale data
 * - No client-side requests needed - fully autonomous backend discovery
 *
 * CRITICAL: This runs in parallel with existing postgres_changes subscriptions
 * It does NOT replace them - it adds Presence tracking for backend refresh system
 */
export function useTrackSubscription({
  symbol,
  dataTypes,
  enabled = true,
}: UseTrackSubscriptionOptions): void {
  const { supabase, user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [featureEnabled, setFeatureEnabled] = useState<boolean>(false);

  // CRITICAL: Memoize dataTypes to prevent unnecessary re-renders
  // Arrays are compared by reference, so we need to stabilize it
  const stableDataTypes = useMemo(() => dataTypes, [dataTypes.join(',')]);

  // CRITICAL: Store current values in refs for cleanup function
  // This ensures cleanup has access to the correct values even if component unmounts
  const dataTypesRef = useRef<string[]>(stableDataTypes);
  const symbolRef = useRef<string>(symbol);
  const userIdRef = useRef<string | undefined>(user?.id);
  const supabaseRef = useRef(supabase);

  // Update refs when values change
  useEffect(() => {
    dataTypesRef.current = stableDataTypes;
    symbolRef.current = symbol;
    userIdRef.current = user?.id;
    supabaseRef.current = supabase;
  }, [stableDataTypes, symbol, user?.id, supabase]);

  // Check feature flag on mount
  useEffect(() => {
    checkFeatureFlag('use_queue_system').then(setFeatureEnabled);
  }, []);

  useEffect(() => {
    // Feature flag check
    if (!featureEnabled) {
      return; // System disabled, don't track
    }

    // Manual disable check
    if (!enabled) {
      return;
    }

    // Require supabase client and user
    if (!supabase || !user?.id) {
      return;
    }

    // Require valid symbol and data types
    if (!symbol || !stableDataTypes || stableDataTypes.length === 0) {
      return;
    }

    // Create channel with Presence config
    const channelName = `symbol:${symbol}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id, // User ID as presence key
        },
      },
    });

    channelRef.current = channel;

    // Set up presence tracking
    channel
      .on('presence', { event: 'sync' }, () => {
        // Presence synced - backend can now see this subscription
        const state = channel.presenceState();
        if (process.env.NODE_ENV === 'development') {
          console.log(`[useTrackSubscription] Presence synced for ${symbol}:`, state);
        }
      })
          .on('presence', { event: 'join' }, ({ key }) => {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[useTrackSubscription] User ${key} joined ${symbol}`);
            }
          })
          .on('presence', { event: 'leave' }, ({ key }) => {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[useTrackSubscription] User ${key} left ${symbol}`);
            }
          })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // CRITICAL: Track presence with metadata
          // This makes the subscription visible to backend via Realtime Presence API
          // Backend autonomously discovers subscriptions and updates analytics table
          // Background staleness checker runs every minute to refresh stale data
          await channel.track({
            symbol,
            dataTypes: stableDataTypes, // Array of data types this user is viewing
            userId: user.id,
            subscribedAt: new Date().toISOString(),
          });

          // CRITICAL: Also update active_subscriptions_v2 table directly
          // This is needed because Realtime Presence can't be queried via REST API
          // We update the table directly so the backend can discover subscriptions
          for (const dataType of stableDataTypes) {
            const { error: upsertError } = await supabase.rpc('upsert_active_subscription_v2', {
              p_user_id: user.id,
              p_symbol: symbol,
              p_data_type: dataType,
            });

            if (upsertError) {
              console.error(
                `[useTrackSubscription] Failed to upsert subscription for ${symbol}/${dataType}:`,
                upsertError
              );
            }
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[useTrackSubscription] Channel error for ${symbol}:`, status);
        }
      });

    // Cleanup on unmount
    return () => {
      try {
        const currentChannel = channelRef.current;
        const currentDataTypes = dataTypesRef.current;
        const currentSymbol = symbolRef.current;
        const currentUserId = userIdRef.current;
        const currentSupabase = supabaseRef.current;

        // CRITICAL: Defensive checks - ensure all values are valid before cleanup
        if (!currentChannel || !currentSupabase || !currentUserId || !currentSymbol) {
          channelRef.current = null;
          return;
        }

        // Only delete subscriptions if we have valid data types
        if (currentDataTypes && Array.isArray(currentDataTypes) && currentDataTypes.length > 0) {
          // CRITICAL: Remove subscriptions from active_subscriptions_v2 table
          // This is needed because Realtime Presence can't be queried via REST API
          // Use stored refs to ensure we have the correct values even after unmount
          for (const dataType of currentDataTypes) {
            if (!dataType || typeof dataType !== 'string') {
              continue; // Skip invalid data types
            }

            // CRITICAL: Execute the query and handle errors properly
            // Supabase query builder needs to be executed (via .then() or await)
            currentSupabase
              .from('active_subscriptions_v2')
              .delete()
              .eq('user_id', currentUserId)
              .eq('symbol', currentSymbol)
              .eq('data_type', dataType)
              .then(() => {
                // Success - subscription removed
              })
              .catch((error) => {
                console.warn(
                  `[useTrackSubscription] Error removing subscription for ${currentSymbol}/${dataType}:`,
                  error
                );
              });
          }
        }

        // Stop tracking presence (fire and forget - don't wait)
        try {
          currentChannel.untrack().catch((error) => {
            console.warn(`[useTrackSubscription] Error untracking presence for ${currentSymbol}:`, error);
          });
        } catch (error) {
          console.warn(`[useTrackSubscription] Exception untracking presence for ${currentSymbol}:`, error);
        }

        // Leave channel (presence automatically removed) - fire and forget
        try {
          currentSupabase
            .removeChannel(currentChannel)
            .catch((error) => {
              console.warn(`[useTrackSubscription] Error removing channel for ${currentSymbol}:`, error);
            });
        } catch (error) {
          console.warn(`[useTrackSubscription] Exception removing channel for ${currentSymbol}:`, error);
        }
      } catch (error) {
        // CRITICAL: Catch any unexpected errors in cleanup to prevent crashes
        console.error('[useTrackSubscription] Unexpected error in cleanup:', error);
      } finally {
        // Always clear the ref, even if cleanup fails
        channelRef.current = null;
      }
    };
  }, [symbol, supabase, user?.id, enabled, featureEnabled, stableDataTypes]); // Use stableDataTypes instead of dataTypes
}

