// src/hooks/useTrackSubscription.ts
// Hook for tracking symbol subscriptions with Realtime Presence
// CRITICAL: This enables backend-controlled refresh system
// Runs in parallel with existing postgres_changes subscriptions (non-breaking)

import { useEffect, useRef, useState } from 'react';
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
 * 3. Calls track-subscription-v2 Edge Function to trigger staleness check
 * 4. Automatically cleans up on unmount
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
  const hasTrackedRef = useRef<boolean>(false);
  const [featureEnabled, setFeatureEnabled] = useState<boolean>(false);

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
    if (!symbol || !dataTypes || dataTypes.length === 0) {
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
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[useTrackSubscription] User ${key} joined ${symbol}`);
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[useTrackSubscription] User ${key} left ${symbol}`);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // CRITICAL: Track presence with metadata
          // This makes the subscription visible to backend via Realtime Presence API
          await channel.track({
            symbol,
            dataTypes, // Array of data types this user is viewing
            userId: user.id,
            subscribedAt: new Date().toISOString(),
          });

          // CRITICAL: Call track-subscription-v2 Edge Function
          // This triggers immediate staleness check (event-driven)
          // Only call once per subscription (not on every re-subscribe)
          if (!hasTrackedRef.current) {
            hasTrackedRef.current = true;

            try {
              const { error } = await supabase.functions.invoke('track-subscription-v2', {
                body: {
                  symbol,
                  dataTypes,
                  priority: 0, // P0 = on-demand (user is actively viewing)
                },
              });

              if (error) {
                // CRITICAL: Silent failure (as per design trade-off)
                // Log error but don't throw - allow subscription to proceed
                // Background checker will catch stale data later
                console.warn(
                  `[useTrackSubscription] Failed to call track-subscription-v2 for ${symbol}:`,
                  error
                );
              } else if (process.env.NODE_ENV === 'development') {
                console.log(`[useTrackSubscription] Staleness check triggered for ${symbol}`);
              }
            } catch (error) {
              // Network errors, etc. - log but don't break subscription
              console.warn(
                `[useTrackSubscription] Error calling track-subscription-v2 for ${symbol}:`,
                error
              );
            }
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[useTrackSubscription] Channel error for ${symbol}:`, status);
        }
      });

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        // Stop tracking presence
        channelRef.current.untrack().catch((error) => {
          console.warn(`[useTrackSubscription] Error untracking presence for ${symbol}:`, error);
        });

        // Leave channel (presence automatically removed)
        supabase
          .removeChannel(channelRef.current)
          .catch((error) => {
            console.warn(`[useTrackSubscription] Error removing channel for ${symbol}:`, error);
          });

        channelRef.current = null;
        hasTrackedRef.current = false;
      }
    };
  }, [symbol, supabase, user?.id, enabled, featureEnabled, dataTypes.join(',')]); // Include featureEnabled in deps
}

