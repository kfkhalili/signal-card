import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Ensure these env vars are set in your .env.local file
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
