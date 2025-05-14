// src/app/auth/callback/route.ts
import { createClient } from "@/lib/supabase/server"; // Ensure this path is correct
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  // If "next" is in param, use it as the redirect URL, otherwise default to '/'
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    // createClient() from lib/supabase/server.ts should be synchronous
    const supabase = await createClient(); // supabase is now SupabaseClient, not Promise<SupabaseClient>

    // Await the promise from exchangeCodeForSession
    // TypeScript will infer the type of 'response' based on the method's signature.
    // Or you can explicitly type it using a manually defined interface like CodeExchangeResponse if needed.
    const response = await supabase.auth.exchangeCodeForSession(code);
    // 'response' will have a 'data' object and an 'error' object.

    if (!response.error) {
      // Successfully exchanged code for session.
      // The session cookie is automatically handled by createServerClient's 'set' method
      // which uses cookieStore.set().
      return NextResponse.redirect(`${origin}${next}`);
    }

    // If there was an error during the exchange
    console.error("Error exchanging code for session:", response.error.message);
  } else {
    console.error("Auth callback error: No code found in request URL.");
  }

  // Redirect to an error page if code is missing or if the exchange fails
  return NextResponse.redirect(`${origin}/auth/auth-error`); // Ensure this error page exists
}
