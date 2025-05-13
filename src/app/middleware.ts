// src/lib/supabase/middleware.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          } catch {
            // Ignore errors from Server Components
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Check if user is logged in and protect routes ---
  const { pathname } = request.nextUrl;

  if (!user && !(pathname.startsWith("/auth") || pathname === "/")) {
    // Allow access to /auth routes and the root landing page
    console.log(
      `Middleware: No user found, redirecting from ${pathname} to /auth`
    );
    const url = request.nextUrl.clone();
    url.pathname = "/auth"; // <-- *** CORRECTED REDIRECT PATH ***
    // Add a message or redirect param if desired
    url.searchParams.set("message", "Please log in to access this page.");
    url.searchParams.set("next", pathname); // Remember where the user was trying to go
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
