import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESPONSE_HEADERS = {
  ...CORS_HEADERS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: RESPONSE_HEADERS,
    status,
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: RESPONSE_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("[delete-user] Missing required Supabase environment");
      return jsonResponse({ error: "Account deletion is unavailable" }, 500);
    }

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized access" }, 401);
    }

    const accessToken = authHeader.slice("Bearer ".length).trim();
    if (!accessToken) {
      return jsonResponse({ error: "Unauthorized access" }, 401);
    }

    // The gateway verifier is disabled because it only supports legacy JWTs.
    // Verify the caller directly with Supabase Auth before using admin access.
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser(accessToken);

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized access" }, 401);
    }

    // If the user is authenticated, create an admin client to delete the user
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(
      user.id,
    );

    if (deleteError) {
      console.error("[delete-user] Admin deletion failed", {
        code: deleteError.code,
        message: deleteError.message,
      });
      return jsonResponse({ error: "Failed to delete user" }, 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error("[delete-user] Unexpected deletion failure", error);
    return jsonResponse({ error: "Failed to delete user" }, 500);
  }
});
