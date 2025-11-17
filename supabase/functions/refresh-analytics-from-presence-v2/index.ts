/**
 * Refresh Analytics Edge Function
 *
 * Purpose: Updates last_seen_at for existing entries in active_subscriptions_v2 table
 * This is called by a cron job every minute to keep last_seen_at current
 *
 * CRITICAL: The client now directly manages active_subscriptions_v2 (adds/removes entries)
 * This function only updates last_seen_at for existing entries to track activity
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

    // CRITICAL: Client now directly manages active_subscriptions_v2 (adds/removes entries)
    // This function only updates last_seen_at for existing entries to track activity
    // This is simpler and more reliable than trying to query Presence via REST API (which doesn't exist)

    // Get all existing subscriptions from the database
    const { data: existingSubscriptions, error: fetchError } = await supabase
      .from('active_subscriptions_v2')
      .select('id, user_id, symbol, data_type');

    if (fetchError) {
      throw new Error(`Failed to fetch existing subscriptions: ${fetchError.message}`);
    }

    if (!existingSubscriptions || existingSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active subscriptions found',
          subscriptionsCount: 0,
          updatedCount: 0,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update last_seen_at for all existing subscriptions
    // This tracks that users are still active (even if they're not actively interacting)
    let successCount = 0;
    let errorCount = 0;

    for (const subscription of existingSubscriptions) {
      const { error: upsertError } = await supabase.rpc('upsert_active_subscription_v2', {
        p_user_id: subscription.user_id,
        p_symbol: subscription.symbol,
        p_data_type: subscription.data_type,
      });

      if (upsertError) {
        console.error(
          `[refresh-analytics-from-presence-v2] Failed to update ${subscription.symbol}/${subscription.data_type}:`,
          upsertError
        );
        errorCount++;
      } else {
        successCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Analytics table refreshed - last_seen_at updated for existing subscriptions',
        subscriptionsCount: existingSubscriptions.length,
        updatedCount: successCount,
        errorCount,
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

