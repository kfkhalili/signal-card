// supabase/functions/fetch-fmp-available-exchanges/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  FmpAvailableExchangeData,
  SupabaseAvailableExchangeRecord,
  FunctionResponse,
} from "./types.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FMP_API_KEY: string | undefined = Deno.env.get("FMP_API_KEY");
const SUPABASE_URL: string | undefined = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY: string | undefined = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
);

const FMP_AVAILABLE_EXCHANGES_URL =
  "https://financialmodelingprep.com/stable/available-exchanges";

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

  try {
    if (!FMP_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Server configuration error: Missing required environment variables."
      );
    }

    const supabaseAdmin: SupabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const apiUrl = `${FMP_AVAILABLE_EXCHANGES_URL}?apikey=${FMP_API_KEY}`;
    const response: Response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText: string = await response.text();
      throw new Error(
        `Failed to fetch available exchanges from FMP: ${response.status} ${errorText}`
      );
    }

    const fmpData: FmpAvailableExchangeData[] = await response.json();

    if (!Array.isArray(fmpData)) {
      throw new Error("Invalid data format from FMP API: Expected an array.");
    }

    const recordsToUpsert: SupabaseAvailableExchangeRecord[] = fmpData.map(
      (item) => ({
        exchange: item.exchange,
        name: item.name,
        country_name: item.countryName,
        country_code: item.countryCode,
        symbol_suffix: item.symbolSuffix,
        delay: item.delay,
      })
    );

    if (recordsToUpsert.length === 0) {
      return new Response(
        JSON.stringify({ message: "No exchanges found to update." }),
        {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const { error: upsertError, count } = await supabaseAdmin
      .from("available_exchanges")
      .upsert(recordsToUpsert, { onConflict: "exchange", count: "exact" });

    if (upsertError) {
      throw new Error(`Supabase upsert failed: ${upsertError.message}`);
    }

    const responsePayload: FunctionResponse = {
      message: `Successfully upserted ${count || 0} exchanges.`,
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
