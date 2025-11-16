// supabase/functions/fetch-exchange-rates/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CORS_HEADERS, ensureCronAuth } from "../_shared/auth.ts";
import type {
  ExchangeRateApiResponse,
  SupabaseExchangeRateRecord,
  FunctionResponse,
} from "./types.ts";

const SUPABASE_URL: string | undefined = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY: string | undefined = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
);

// Use the correct open access URL
const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest/USD";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "An unknown error occurred.";
  }
}

Deno.serve(async (_req: Request) => {
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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Server configuration error: Missing required environment variables."
      );
    }

    const supabaseAdmin: SupabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const response: Response = await fetch(EXCHANGE_RATE_API_URL);

    if (!response.ok) {
      const errorText: string = await response.text();
      throw new Error(
        `Failed to fetch exchange rates from exchangerate-api.com: ${response.status} ${errorText}`
      );
    }

    const apiData: ExchangeRateApiResponse = await response.json();

    if (apiData.result !== "success") {
      throw new Error("API response was not successful.");
    }

    const recordsToUpsert: SupabaseExchangeRateRecord[] = Object.entries(apiData.rates).map(
      ([target_code, rate]) => ({
        base_code: apiData.base_code,
        target_code,
        rate,
        last_updated_at: new Date(apiData.time_last_update_unix * 1000).toISOString(),
      })
    );

    if (recordsToUpsert.length === 0) {
      return new Response(
        JSON.stringify({ message: "No exchange rates found to update." }),
        {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const { error: upsertError, count } = await supabaseAdmin
      .from("exchange_rates")
      .upsert(recordsToUpsert, { onConflict: "base_code,target_code", count: "exact" });

    if (upsertError) {
      throw new Error(`Supabase upsert failed: ${upsertError.message}`);
    }

    const responsePayload: FunctionResponse = {
      message: `Successfully upserted ${count || 0} exchange rates.`,
      upsertedCount: count || 0,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error(`Critical error in function: ${errorMessage}`);
    return new Response(JSON.stringify({ message: errorMessage }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});