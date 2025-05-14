// src/app/auth/page.tsx
"use client";

import { createClient } from "../../lib/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation"; // Removed usePathname, useSearchParams
import { useEffect, useState, useCallback } from "react";

type AuthViewType =
  | "sign_in"
  | "sign_up"
  | "forgotten_password"
  | "update_password"
  | "magic_link";

export default function AuthPage() {
  const supabase = createClient();
  const router = useRouter();
  const [authView, setAuthView] = useState<AuthViewType>("sign_in");

  const updateViewFromHash = useCallback(() => {
    const currentHash = window.location.hash;
    // console.log("[AuthPage] updateViewFromHash triggered. Hash:", currentHash);
    if (currentHash === "#auth-sign-up") {
      setAuthView("sign_up");
    } else if (currentHash === "#auth-sign-in") {
      setAuthView("sign_in");
    } else {
      setAuthView("sign_in");
    }
  }, [setAuthView]);

  useEffect(() => {
    updateViewFromHash();
    window.addEventListener("hashchange", updateViewFromHash);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN") {
          // Access search params directly from window.location on client
          const nextUrl =
            new URLSearchParams(window.location.search).get("next") || "/";
          router.push(nextUrl);
          router.refresh();
        }
      }
    );

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // Access search params directly from window.location on client
        const nextUrl =
          new URLSearchParams(window.location.search).get("next") || "/";
        router.push(nextUrl);
        router.refresh();
      }
    };
    if (!window.location.hash.startsWith("#auth-")) {
      checkSession();
    }

    return () => {
      authListener?.subscription.unsubscribe();
      window.removeEventListener("hashchange", updateViewFromHash);
    };
    // Removed pathname and searchParams from dependencies, as they are no longer top-level states here.
    // router and supabase are stable or correctly handled by React.
    // updateViewFromHash is memoized and stable.
  }, [supabase, router, updateViewFromHash]);

  // console.log("[AuthPage] Rendering with authView:", authView, "and key:", authView);

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md p-8 space-y-8 bg-card text-card-foreground rounded-lg shadow-xl">
        <Auth
          key={authView}
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa, // Use ThemeSupa as the base
            variables: {
              default: {
                colors: {
                  brand: "hsl(var(--primary))", // Main button background
                  brandAccent: "hsl(var(--primary))", // Hover/focus color - you might want a slightly darker shade like hsl(var(--primary-focus)) if defined, or adjust opacity in CSS. For now, same as brand.
                  brandButtonText: "hsl(var(--primary-foreground))", // Text on main button

                  // Optional: Style other elements to match your theme
                  // inputBackground: 'hsl(var(--input))',
                  // inputBorder: 'hsl(var(--border))',
                  // inputText: 'hsl(var(--foreground))',
                  // inputPlaceholder: 'hsl(var(--muted-foreground))',
                  // anchorTextColor: 'hsl(var(--primary))',
                },
                // You can also customize fonts, radii, spacing etc. here
                // fonts: {
                //   bodyFontFamily: 'var(--font-geist-sans), sans-serif',
                //   buttonFontFamily: 'var(--font-geist-sans), sans-serif',
                // },
                // radii: {
                //   borderRadiusButton: 'var(--radius)', // Example: '0.5rem'
                //   inputBorderRadius: 'var(--radius)',
                // }
              },
              // If your CSS variables for --primary and --primary-foreground
              // correctly update for dark mode via the .dark class on <html>,
              // you might not need a specific 'dark:' block for these button colors.
              // The 'default' block will use the currently active CSS variable values.
              // dark: {
              //   colors: {
              //      // Example: if brandButtonText needs a specific override for dark mode not covered by --primary-foreground
              //      // brandButtonText: 'hsl(var(--some-specific-dark-text-color))',
              //   }
              // }
            },
          }}
          view={authView}
          providers={[]}
          redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`}
          localization={{
            variables: {
              sign_in: {
                email_label: "Email address",
                password_label: "Password",
                button_label: "Log in",
                link_text: "Already have an account? Log in",
              },
              sign_up: {
                email_label: "Email address",
                password_label: "Create a Password",
              },
            },
          }}
        />
      </div>
    </div>
  );
}
