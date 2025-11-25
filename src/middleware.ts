// src/middleware.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { fromPromise } from "neverthrow";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "CRITICAL_ERROR: Missing Supabase environment variables (URL or Anon Key). Cannot initialize Supabase client in middleware."
    );

    const errorUrl = request.nextUrl.clone();
    errorUrl.pathname = "/auth/auth-error";
    errorUrl.searchParams.set(
      "message",
      "Server configuration error. Please contact support."
    );
    return NextResponse.redirect(errorUrl);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
        } catch (error) {
          console.warn(
            "[Middleware] Supabase cookies.setAll call was caught. This is usually from a Server Component and can be ignored if sessions are refreshed by middleware. Error:",
            error instanceof Error ? error.message : String(error)
          );
        }
      },
    },
  });

  const userResult = await fromPromise(
    supabase.auth.getUser(),
    (e) => new Error(`Failed to get user: ${(e as Error).message}`)
  );

  const user = userResult.match(
    (response) => response.data.user,
    () => null
  );

  if (user) {
    const profileResult = await fromPromise(
      supabase
        .from("user_profiles")
        .select("is_profile_complete")
        .eq("id", user.id)
        .single(),
      (e) => new Error(`Failed to fetch profile: ${(e as Error).message}`)
    );

    const profile = profileResult.match(
      (response) => {
        const { data, error } = response;
        if (error) {
          return null;
        }
        return data;
      },
      () => null
    );

    if (profile && !profile.is_profile_complete && pathname !== '/auth/complete-profile') {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/complete-profile';
      return NextResponse.redirect(url);
    }
  }

  const publicPaths = [
    "/",
    "/about",
    "/api",
    "/blog",
    "/careers",
    "/contact",
    "/cookies",
    "/features",
    "/help",
    "/press",
    "/pricing",
    "/privacy",
    "/status",
    "/terms",
  ];

  const isPublicPath = publicPaths.includes(pathname);

  if (!user && !pathname.startsWith("/auth") && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("message", "Please log in to access this page.");
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - fonts (fonts folder)
     * - images (images folder)
     * - manifest.json, manifest.webmanifest (PWA manifest files)
     * - robots.txt, sitemap.xml (SEO files)
     * - auth/auth-error (our specific auth error page)
     *
     * This ensures the middleware's auth logic runs on page navigation
     * including the complete-profile page so profile completion checks work properly.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|fonts|images|manifest\\.json|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|auth/auth-error).*)",
  ],
};
