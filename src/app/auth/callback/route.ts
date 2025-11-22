// src/app/auth/callback/route.ts
import { createSupabaseServerClient } from "@/lib/supabase/server"; // Ensure this path is correct
import { fromPromise } from "neverthrow";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  // If "next" is in param, use it as the redirect URL, otherwise default to '/'
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const exchangeResult = await fromPromise(
      supabase.auth.exchangeCodeForSession(code),
      (e) => new Error(`Failed to exchange code for session: ${(e as Error).message}`)
    );

    const hasError = exchangeResult.match(
      (response) => {
        if (response.error) {
          console.error("Error exchanging code for session:", response.error.message);
          return true;
        }
        return false;
      },
      (err) => {
        console.error("Error exchanging code for session:", err.message);
        return true;
      }
    );

    if (!hasError) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else {
    console.error("Auth callback error: No code found in request URL.");
  }

  // Redirect to an error page if code is missing or if the exchange fails
  return NextResponse.redirect(`${origin}/auth/auth-error`); // Ensure this error page exists
}
