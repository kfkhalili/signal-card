// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export function createSupabaseBrowserClient(
  throwOnError = true
): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMessage =
      "Supabase URL or Anon Key is missing. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment variables.";
    if (throwOnError) {
      throw new Error(errorMessage);
    } else {
      console.error(
        "CRITICAL_CLIENT_INIT_ERROR: " +
          errorMessage +
          " Supabase client-side features will be unavailable."
      );
      return null;
    }
  }
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
