// Supabase Edge Function to handle new user creation
// This function is triggered when a new user signs up

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fromPromise } from "npm:neverthrow@6.0.0";
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
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the request body
    const { type, record } = await _req.json();

    // Only handle user creation events
    if (type === "INSERT" && record) {
      const userId = record.id;
      const userEmail = record.email;

      // Call the database function to create the user profile using Result types
      const rpcResult = await fromPromise(
        supabase.rpc("handle_user_created_webhook", {
          user_data: JSON.stringify(record),
        }),
        (e) => e as Error
      );

      const rpcResponse = rpcResult.match(
        (response) => {
          const { data, error } = response;
          if (error) {
            console.error("Error calling handle_user_created_webhook:", error);
            return { success: false, error };
          }
          console.log("User profile creation result:", data);
          return { success: true, data };
        },
        (err) => {
          console.error("Error calling handle_user_created_webhook:", err);
          return { success: false, error: err };
        }
      );

      if (!rpcResponse.success) {
        return new Response(
          JSON.stringify({
            error: "Failed to create user profile",
            details: rpcResponse.error instanceof Error 
              ? rpcResponse.error.message 
              : (rpcResponse.error as { message?: string })?.message || "Unknown error",
          }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handle-new-user function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
