/**
 * Refresh Analytics Edge Function
 *
 * Purpose: Cleans up stale subscriptions from active_subscriptions_v2 table
 * This is called by a cron job every minute to remove subscriptions that are no longer active
 *
 * CRITICAL: Heartbeat-based subscription management
 * - Client adds subscription on mount and sends periodic heartbeats (every 1 minute)
 * - Client removes subscription on unmount (normal cleanup)
 * - This function removes subscriptions with last_seen_at > 5 minutes (abrupt browser closures)
 *
 * Heartbeat Pattern:
 * - Client sends heartbeat every 1 minute via upsert_active_subscription_v2
 * - Heartbeat updates last_seen_at to indicate user is actively viewing
 * - If heartbeat stops (browser closed, component unmounted), last_seen_at stops updating
 * - Background cleanup (this function) removes subscriptions > 5 minutes old
 * - This ensures heartbeat stops before cleanup (1 min interval < 5 min timeout)
 */

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // CRITICAL: Use service role key to query Realtime Presence
    // Regular anon key doesn't have permission to list channels
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // CRITICAL: Only update last_seen_at for subscriptions that are actually in Presence
    // If we can't query Presence, we should NOT update last_seen_at - let cleanup handle stale entries
    // This prevents updating subscriptions that are no longer active

    // CRITICAL: Clean up stale subscriptions (subscriptions that haven't been seen in 5+ minutes)
    // This handles cases where browser closed abruptly and client-side cleanup didn't run
    // We do this BEFORE checking Presence to avoid updating subscriptions that are about to be removed
    const { data: staleSubscriptions, error: staleError } = await supabase
      .from('active_subscriptions_v2')
      .select('id, user_id, symbol, data_type, last_seen_at')
      .lt('last_seen_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // 5 minutes ago

    let removedCount = 0;
    if (!staleError && staleSubscriptions && staleSubscriptions.length > 0) {
      const staleIds = staleSubscriptions.map(s => s.id);
      const { error: deleteError } = await supabase
        .from('active_subscriptions_v2')
        .delete()
        .in('id', staleIds);

      if (deleteError) {
        console.error('[refresh-analytics-from-presence-v2] Failed to remove stale subscriptions:', deleteError);
      } else {
        removedCount = staleSubscriptions.length;
        console.log(`[refresh-analytics-from-presence-v2] Removed ${removedCount} stale subscriptions`);
      }
    }

    // CRITICAL: Do NOT update last_seen_at for all subscriptions
    // The client manages active_subscriptions_v2 directly (adds/removes entries)
    // This function should only clean up stale entries, not update last_seen_at
    // Updating last_seen_at for non-existent subscriptions creates false positives
    //
    // If we need to update last_seen_at, we should query Presence first to see which subscriptions
    // are actually active. Since Presence can't be queried via REST API, we rely on:
    // 1. Client-side cleanup (on unmount)
    // 2. Stale subscription cleanup (this function, 5+ minutes old)

    const successCount = 0; // No updates performed
    const errorCount = 0;

    // Get count of remaining subscriptions for reporting
    const { count: remainingCount, error: countError } = await supabase
      .from('active_subscriptions_v2')
      .select('*', { count: 'exact', head: true });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stale subscriptions cleaned up. Client manages active_subscriptions_v2 directly.',
        removedCount,
        remainingCount,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[refresh-analytics-from-presence-v2] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
});

