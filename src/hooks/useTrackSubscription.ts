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
            dataTypes, // Array of data types this user is viewing
            userId: user.id,
            subscribedAt: new Date().toISOString(),
          });
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
      }
    };
  }, [symbol, supabase, user?.id, enabled, featureEnabled, dataTypes]); // Include featureEnabled and dataTypes in deps
}

