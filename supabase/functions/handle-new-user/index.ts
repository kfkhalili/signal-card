// Supabase Edge Function to handle new user creation
// This function is triggered when a new user signs up

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the request body
    const { type, record } = await req.json();

    // Only handle user creation events
    if (type === "INSERT" && record) {
      const userId = record.id;
      const userEmail = record.email;

      // Call the database function to create the user profile
      const { data, error } = await supabase.rpc(
        "handle_user_created_webhook",
        {
          user_data: JSON.stringify(record),
        }
      );

      if (error) {
        console.error("Error calling handle_user_created_webhook:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to create user profile",
            details: error,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("User profile creation result:", data);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
