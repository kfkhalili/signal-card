// src/app/auth/callback/route.ts
import { createSupabaseServerClient } from "@/lib/supabase/server"; // Ensure this path is correct
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  // If "next" is in param, use it as the redirect URL, otherwise default to '/'
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.auth.exchangeCodeForSession(code);

    if (!response.error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Error exchanging code for session:", response.error.message);
  } else {
    console.error("Auth callback error: No code found in request URL.");
  }

  // Redirect to an error page if code is missing or if the exchange fails
  return NextResponse.redirect(`${origin}/auth/auth-error`); // Ensure this error page exists
}
