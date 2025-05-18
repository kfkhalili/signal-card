// src/middleware.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // if (process.env.NODE_ENV === "development") {
  //   console.debug(`[Middleware] Auth logic executing for path: ${pathname}`);
  // }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll(): { name: string; value: string }[] {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ): void {
          try {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );

  const {
    data: { user },
    // error: getUserError,
  } = await supabase.auth.getUser();

  // if (process.env.NODE_ENV === "development") {
  //   console.debug(
  //     "[Middleware] User object from supabase.auth.getUser():",
  //     user
  //   );
  // }

  // if (getUserError) {
  //   if (process.env.NODE_ENV === "development") {
  //     console.debug(
  //       "[Middleware] Error from supabase.auth.getUser() (this might be expected if no session):",
  //       getUserError.message
  //     );
  //   }
  // }

  // Redirect logic for protected routes
  if (!user && !(pathname.startsWith("/auth") || pathname === "/")) {
    // if (process.env.NODE_ENV === "development") {
    //   console.debug(
    //     `[Middleware] Redirect condition met: No user, and path is "${pathname}". Redirecting to /auth.`
    //   );
    // }
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("message", "Please log in to access this page.");
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// Add this config to your middleware file
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any other folders containing static assets (e.g., /images, /fonts)
     *
     * This ensures the middleware's auth logic only runs on page navigation.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|fonts|images).*)",
  ],
};
