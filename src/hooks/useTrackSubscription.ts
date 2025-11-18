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
 * 3. Adds subscription to active_subscriptions_v2 on mount
 * 4. Sends periodic heartbeats (every 1 minute) to update last_seen_at
 * 5. Removes subscription on unmount
 *
 * CRITICAL: Heartbeat-based subscription management
 * - Heartbeat runs every 1 minute to indicate user is actively viewing
 * - Background cleanup removes subscriptions with last_seen_at > 5 minutes
 * - This ensures heartbeat stops before cleanup (1 min < 5 min timeout)
 * - Handles both normal disconnects (unmount cleanup) and abrupt closures (timeout cleanup)
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
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const [featureEnabled, setFeatureEnabled] = useState<boolean>(false);

  // CRITICAL: Memoize dataTypes to prevent unnecessary re-renders
  // Arrays are compared by reference, so we need to stabilize it
  const stableDataTypes = useMemo(() => dataTypes, [dataTypes]);

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
    // CRITICAL: Mark as mounted when effect runs
    isMountedRef.current = true;

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

    // Helper function to send heartbeat (updates last_seen_at)
    // CRITICAL: Check isMountedRef to prevent heartbeats after unmount
    const sendHeartbeat = async () => {
      // CRITICAL: Don't send heartbeat if component is unmounted
      if (!isMountedRef.current) {
        return;
      }

      // Use refs to get current values (may be stale in closure)
      const currentSupabase = supabaseRef.current;
      const currentUserId = userIdRef.current;
      const currentSymbol = symbolRef.current;
      const currentDataTypes = dataTypesRef.current;

      if (!currentSupabase || !currentUserId || !currentSymbol || !currentDataTypes || currentDataTypes.length === 0) {
        return;
      }


      for (const dataType of currentDataTypes) {
        // CRITICAL: Check again if still mounted before each RPC call
        if (!isMountedRef.current) {
          return;
        }

        const { error: upsertError } = await currentSupabase.rpc('upsert_active_subscription_v2', {
          p_user_id: currentUserId,
          p_symbol: currentSymbol,
          p_data_type: dataType,
        });

        if (upsertError) {
          console.error(
            `[useTrackSubscription] Failed to send heartbeat for ${currentSymbol}/${dataType}:`,
            upsertError
          );
        } else {
        }
      }
    };

    // Set up presence tracking
    channel
      .on('presence', { event: 'sync' }, () => {
        // Presence synced - backend can now see this subscription
      })
          .on('presence', { event: 'join' }, () => {
            // User joined
          })
          .on('presence', { event: 'leave' }, () => {
            // User left
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

          // CRITICAL: Add subscription to active_subscriptions_v2 table (initial insert)
          // This creates the subscription record
          await sendHeartbeat();
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[useTrackSubscription] Channel error for ${symbol}:`, status);
        }
      });

    // CRITICAL: Set up heartbeat interval (sends periodic updates to last_seen_at)
    // Heartbeat runs every 1 minute to indicate user is actively viewing
    // Background cleanup removes subscriptions with last_seen_at > 5 minutes
    // This ensures heartbeat stops before cleanup (1 min < 5 min timeout)
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 60 * 1000); // 1 minute

    // Send initial heartbeat immediately (don't wait 1 minute)
    sendHeartbeat();

    // Cleanup on unmount
    return () => {
      console.log(`[useTrackSubscription] CLEANUP STARTED for ${symbol}`, {
        symbol,
        dataTypes: stableDataTypes,
        hasInterval: !!heartbeatIntervalRef.current,
        isMounted: isMountedRef.current,
      });

      try {
        // CRITICAL: Mark as unmounted FIRST to prevent any pending heartbeats
        isMountedRef.current = false;

        // CRITICAL: Clear heartbeat interval FIRST (stop sending heartbeats)
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
          // Heartbeat interval cleared
        }

        const currentChannel = channelRef.current;
        const currentDataTypes = dataTypesRef.current;
        const currentSymbol = symbolRef.current;
        const currentUserId = userIdRef.current;
        const currentSupabase = supabaseRef.current;


        // CRITICAL: Always try to delete subscription, even if some checks fail
        // This ensures cleanup happens even if channel or other refs are null
        if (currentSupabase && currentUserId && currentSymbol && currentDataTypes && Array.isArray(currentDataTypes) && currentDataTypes.length > 0) {

          // Delete subscriptions for all data types
          for (const dataType of currentDataTypes) {
            if (!dataType || typeof dataType !== 'string') {
              continue; // Skip invalid data types
            }


            // CRITICAL: Execute the query and handle errors properly
            // Convert PromiseLike to Promise to ensure .catch() is available
            Promise.resolve(
              currentSupabase
                .from('active_subscriptions_v2')
                .delete()
                .eq('user_id', currentUserId)
                .eq('symbol', currentSymbol)
                .eq('data_type', dataType)
            )
              .then((result) => {
              })
              .catch((error: unknown) => {
                console.error(
                  `[useTrackSubscription] DELETE ERROR for ${currentSymbol}/${dataType}:`,
                  error
                );
              });
          }
        } else {
          console.error(`[useTrackSubscription] Cannot delete subscription for ${symbol} - missing required values:`, {
            hasSupabase: !!currentSupabase,
            hasUserId: !!currentUserId,
            hasSymbol: !!currentSymbol,
            hasDataTypes: !!currentDataTypes,
            isArray: Array.isArray(currentDataTypes),
            length: currentDataTypes?.length ?? 0,
          });
        }

        // CRITICAL: Defensive checks for channel cleanup
        // Note: Subscription deletion already happened above, so we can safely return here
        if (!currentChannel || !currentSupabase) {
          channelRef.current = null;
          return;
        }

        // Stop tracking presence (fire and forget - don't wait)
        try {
          void currentChannel.untrack().catch((error: unknown) => {
          });
        } catch (error) {
        }

        // Leave channel (presence automatically removed) - fire and forget
        try {
          void currentSupabase
            .removeChannel(currentChannel)
            .catch((error: unknown) => {
            });
        } catch (error) {
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

