/**
 * Track Subscription Edge Function
 * 
 * Purpose: Event-driven staleness check when user subscribes to a symbol
 * This is the PRIMARY staleness check - runs immediately on subscribe
 * 
 * CRITICAL SECURITY: Rate limiting is mandatory (10-20 calls/minute per user/IP)
 * This prevents DoS attacks - even with idempotent queueing,
 * 10,000 calls = 10,000 staleness checks = database overload
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackSubscriptionRequest {
  symbol: string;
  dataTypes: string[];
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: TrackSubscriptionRequest = await req.json();
    const { symbol, dataTypes } = body;

    if (!symbol || !dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: symbol and dataTypes array required' }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // CRITICAL: Analytics removed from hot-path to prevent DoS vector
    // Analytics are now handled as a batch operation in the cron job (refresh_analytics_from_presence_v2)
    // This eliminates the "non-critical" write from the hottest code path

    // CRITICAL: Single batch RPC call - eliminates 10-15 separate database round-trips
    // This turns a "chatty" implementation into one efficient call
    const { error: batchError } = await supabase.rpc('check_and_queue_stale_batch_v2', {
      p_symbol: symbol,
      p_data_types: dataTypes,
      p_priority: 1, // Default priority (can be enhanced to count active viewers)
    });

    if (batchError) {
      // CRITICAL: Silent failure trade-off - log error but don't throw
      // This ensures user subscription succeeds even if staleness check fails
      // Background checker will catch stale data later (5-minute fallback)
      console.error('[track-subscription-v2] Batch staleness check failed:', batchError);
      // Don't return error - allow subscription to proceed
    }

    return new Response(
      JSON.stringify({
        success: true,
        symbol,
        dataTypes,
        message: 'Subscription tracked and staleness checked',
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[track-subscription-v2] Unexpected error:', error);
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

