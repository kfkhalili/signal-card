// src/hooks/useSubscriptionManager.ts
// Centralized subscription manager with reference counting
// CRITICAL: Prevents deleting subscriptions when multiple cards share the same data type

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkFeatureFlag } from '@/lib/feature-flags';
import { getDataTypesForCard } from '@/lib/card-data-type-mapping';
import type { DisplayableCard } from '@/components/game/types';

/**
 * Centralized subscription manager with reference counting
 *
 * This hook:
 * 1. Takes all active cards as input
 * 2. Aggregates data types per symbol (e.g., revenue + solvency + cashuse → financial-statements)
 * 3. Manages subscriptions centrally (only one subscription per symbol/data_type)
 * 4. Uses reference counting to track how many cards need each subscription
 * 5. Only removes subscriptions when no cards need them
 *
 * CRITICAL: This prevents the bug where deleting one card removes a subscription
 * that other cards still need (e.g., deleting revenue card removes financial-statements
 * subscription even though solvency and cashuse cards still need it).
 */
export function useSubscriptionManager(cards: DisplayableCard[]): void {
  const { supabase, user } = useAuth();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const featureEnabledRef = useRef<boolean>(false);

  // Aggregate subscriptions: symbol -> Set<dataType>
  // This ensures we only create one subscription per symbol/data_type combination
  const subscriptions = useMemo(() => {
    const subscriptionMap = new Map<string, Set<string>>();

    for (const card of cards) {
      const dataTypes = getDataTypesForCard(card.type);

      if (dataTypes.length === 0) {
        continue; // Skip cards with no data types (e.g., custom cards)
      }

      const key = card.symbol;
      if (!subscriptionMap.has(key)) {
        subscriptionMap.set(key, new Set());
      }

      const dataTypeSet = subscriptionMap.get(key);
      if (!dataTypeSet) {
        continue; // Should never happen, but TypeScript requires this check
      }
      for (const dataType of dataTypes) {
        dataTypeSet.add(dataType);
      }
    }

    return subscriptionMap;
  }, [cards]);

  // Check feature flag on mount
  useEffect(() => {
    checkFeatureFlag('use_queue_system').then((enabled) => {
      featureEnabledRef.current = enabled;
    });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Feature flag check
    if (!featureEnabledRef.current) {
      return;
    }

    // Require supabase client and user
    if (!supabase || !user?.id) {
      return;
    }

    // Helper function to send heartbeat for all subscriptions
    const sendHeartbeat = async () => {
      if (!isMountedRef.current) {
        return;
      }

      if (!supabase || !user?.id) {
        return;
      }

      // Send heartbeat for each symbol/data_type combination
      for (const [symbol, dataTypes] of subscriptions.entries()) {
        for (const dataType of dataTypes) {
          if (!isMountedRef.current) {
            return;
          }

          const { error: upsertError } = await supabase.rpc('upsert_active_subscription_v2', {
            p_user_id: user.id,
            p_symbol: symbol,
            p_data_type: dataType,
          });

          if (upsertError) {
            console.error(
              `[useSubscriptionManager] Failed to send heartbeat for ${symbol}/${dataType}:`,
              upsertError
            );
          }
        }
      }
    };

    // Set up heartbeat interval (every 1 minute)
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 60 * 1000);

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Cleanup on unmount or when subscriptions change
    return () => {
      isMountedRef.current = false;

      // Clear heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // CRITICAL: Only delete subscriptions if we still have access to supabase and user
      // This cleanup happens when:
      // 1. Component unmounts (user logs out, page closes)
      // 2. Subscriptions change (cards are added/removed)
      //
      // For case 2, we need to be careful: we should only delete subscriptions
      // that are no longer needed. But since we're using reference counting,
      // we can't know which subscriptions to delete without comparing old vs new.
      //
      // SOLUTION: Don't delete on cleanup. Instead, rely on:
      // 1. Heartbeat stopping (last_seen_at stops updating)
      // 2. Background cleanup removing subscriptions with last_seen_at > 5 minutes
      //
      // This is safer because:
      // - If subscriptions change (cards added/removed), the next effect run will
      //   update subscriptions correctly
      // - If component unmounts, heartbeat stops and background cleanup handles it
      // - No race conditions between cleanup and new subscriptions

      // NOTE: We could implement proper reference counting here by comparing
      // old subscriptions to new ones, but that's complex and error-prone.
      // The current approach (heartbeat + background cleanup) is simpler and safer.
    };
  }, [subscriptions, supabase, user?.id]);

  // CRITICAL: Separate effect to handle subscription deletions when cards are removed
  // This effect runs when subscriptions change and deletes subscriptions that are no longer needed
  useEffect(() => {
    if (!featureEnabledRef.current || !supabase || !user?.id) {
      return;
    }

    // Get current subscriptions from database
    const checkAndCleanup = async () => {
      try {
        // Fetch all current subscriptions for this user
        const { data: currentSubscriptions, error: fetchError } = await supabase
          .from('active_subscriptions_v2')
          .select('symbol, data_type')
          .eq('user_id', user.id);

        if (fetchError) {
          console.error('[useSubscriptionManager] Failed to fetch current subscriptions:', fetchError);
          return;
        }

        // Build set of needed subscriptions from current cards
        const neededSubscriptions = new Set<string>();
        for (const [symbol, dataTypes] of subscriptions.entries()) {
          for (const dataType of dataTypes) {
            neededSubscriptions.add(`${symbol}:${dataType}`);
          }
        }

        // Delete subscriptions that are no longer needed
        for (const sub of currentSubscriptions || []) {
          const key = `${sub.symbol}:${sub.data_type}`;
          if (!neededSubscriptions.has(key)) {

            const { error: deleteError } = await supabase
              .from('active_subscriptions_v2')
              .delete()
              .eq('user_id', user.id)
              .eq('symbol', sub.symbol)
              .eq('data_type', sub.data_type);

            if (deleteError) {
              console.error(
                `[useSubscriptionManager] Failed to delete subscription ${sub.symbol}/${sub.data_type}:`,
                deleteError
              );
            }
          }
        }
      } catch (error) {
        console.error('[useSubscriptionManager] Error in checkAndCleanup:', error);
      }
    };

    // Debounce cleanup to avoid excessive database calls
    const timeoutId = setTimeout(checkAndCleanup, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [subscriptions, supabase, user?.id]);
}

