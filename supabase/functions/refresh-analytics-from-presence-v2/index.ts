/**
 * Refresh Analytics from Presence Edge Function
 *
 * Purpose: Reads Realtime Presence state and updates active_subscriptions_v2 table
 * This is called by a cron job every 15 minutes to keep analytics table in sync
 *
 * CRITICAL: This uses Realtime Presence as the source of truth
 * The active_subscriptions_v2 table is just for analytics/reporting
 */

import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PresenceData {
  symbol: string;
  dataTypes: string[];
  userId: string;
  subscribedAt?: string;
}

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

    // CRITICAL: Query Realtime Presence state via REST API
    // Supabase Realtime doesn't expose a direct list() method, so we use the REST API
    const realtimeUrl = `${supabaseUrl.replace('/rest/v1', '')}/realtime/v1/api/presence`;
    const presenceResponse = await fetch(realtimeUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      },
    });

    if (!presenceResponse.ok) {
      throw new Error(
        `Failed to query Realtime Presence: ${presenceResponse.status} ${presenceResponse.statusText}`
      );
    }

    const channels = await presenceResponse.json() as Array<{
      topic?: string;
      presence?: Record<string, unknown>;
    }>;

    if (!channels || channels.length === 0) {
      // No active channels - truncate analytics table
      const { error: truncateError } = await supabase
        .from('active_subscriptions_v2')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (truncateError) {
        console.error('[refresh-analytics-from-presence-v2] Failed to truncate table:', truncateError);
      }
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active channels found, analytics table truncated',
          subscriptionsCount: 0,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // CRITICAL: Parse Presence data - filter symbol channels and un-nest dataTypes array
    // Channels are in format: "symbol:AAPL", "symbol:MSFT", etc.
    const activeSubscriptions: Array<{
      user_id: string;
      symbol: string;
      data_type: string;
      subscribed_at?: string;
    }> = [];

    for (const channel of channels) {
      // Only process symbol channels
      if (!channel.topic?.startsWith('symbol:')) {
        continue;
      }

      const symbol = channel.topic.replace('symbol:', '');
      const presence = channel.presence || {};

      // CRITICAL: Un-nest the dataTypes array
      // Each presence entry can have multiple data types
      for (const [presenceKey, presenceData] of Object.entries(presence)) {
        const presenceEntry = presenceData as {
        userId?: string;
        dataTypes?: string[];
        subscribedAt?: string;
        [key: string]: unknown;
      };
        const userId = presenceEntry.userId || presenceKey; // Fallback to key if userId not present
        const dataTypes = presenceEntry.dataTypes || [];

        // Un-nest: one row per data type
        for (const dataType of dataTypes) {
          activeSubscriptions.push({
            user_id: userId,
            symbol,
            data_type: dataType,
            subscribed_at: presenceEntry.subscribedAt || new Date().toISOString(),
          });
        }
      }
    }

    if (activeSubscriptions.length === 0) {
      // No active subscriptions - truncate analytics table
      const { error: truncateError } = await supabase
        .from('active_subscriptions_v2')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (truncateError) {
        console.error('[refresh-analytics-from-presence-v2] Failed to truncate table:', truncateError);
      }
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active subscriptions found, analytics table truncated',
          subscriptionsCount: 0,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // CRITICAL: Update analytics table using upsert
    // Use upsert_active_subscription_v2 for each subscription
    // This updates last_seen_at = NOW() for existing subscriptions
    let successCount = 0;
    let errorCount = 0;

    for (const subscription of activeSubscriptions) {
      const { error: upsertError } = await supabase.rpc('upsert_active_subscription_v2', {
        p_user_id: subscription.user_id,
        p_symbol: subscription.symbol,
        p_data_type: subscription.data_type,
      });

      if (upsertError) {
        console.error(
          `[refresh-analytics-from-presence-v2] Failed to upsert ${subscription.symbol}/${subscription.data_type}:`,
          upsertError
        );
        errorCount++;
      } else {
        successCount++;
      }
    }

    // CRITICAL: Remove subscriptions that are no longer in Presence
    // Get all current subscriptions from Presence (by user_id, symbol, data_type)
    const presenceKeys = new Set(
      activeSubscriptions.map(s => `${s.user_id}:${s.symbol}:${s.data_type}`)
    );

    // Get all subscriptions from database
    const { data: dbSubscriptions, error: dbError } = await supabase
      .from('active_subscriptions_v2')
      .select('id, user_id, symbol, data_type');

    if (dbError) {
      console.error('[refresh-analytics-from-presence-v2] Failed to fetch existing subscriptions:', dbError);
    } else if (dbSubscriptions) {
      // Delete subscriptions that are no longer in Presence
      const toDelete = dbSubscriptions.filter(
        s => !presenceKeys.has(`${s.user_id}:${s.symbol}:${s.data_type}`)
      );

      if (toDelete.length > 0) {
        // Delete by matching user_id, symbol, data_type (more reliable than by id)
        for (const sub of toDelete) {
          const { error: deleteError } = await supabase
            .from('active_subscriptions_v2')
            .delete()
            .eq('user_id', sub.user_id)
            .eq('symbol', sub.symbol)
            .eq('data_type', sub.data_type);

          if (deleteError) {
            console.error(
              `[refresh-analytics-from-presence-v2] Failed to delete ${sub.symbol}/${sub.data_type}:`,
              deleteError
            );
          }
        }
        console.log(`[refresh-analytics-from-presence-v2] Deleted ${toDelete.length} stale subscriptions`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Analytics table refreshed from Presence',
        subscriptionsCount: activeSubscriptions.length,
        successCount,
        errorCount,
        channelsProcessed: channels.filter((ch: { topic?: string }) => ch.topic?.startsWith('symbol:')).length,
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

