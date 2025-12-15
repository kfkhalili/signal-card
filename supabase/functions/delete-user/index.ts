import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, ensureCronAuth } from "../_shared/auth.ts";

serve(async (_req) => {
  // Handle CORS preflight requests
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // --- 🔒 Centralized Authorization Check ---
  const authError = ensureCronAuth(_req);
  if (authError) {
    return authError; // Return the 401/500 response
  }
  // --- ✅ Auth Check Passed ---

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = _req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing required environment variables or authorization header" }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // First, create a client with the user's auth token to verify their identity
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // If the user is authenticated, create an admin client to delete the user
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to delete user",
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});