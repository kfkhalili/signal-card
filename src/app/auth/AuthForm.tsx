// src/app/auth/AuthForm.tsx
"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

type AuthViewType =
  | "sign_in"
  | "sign_up"
  | "forgotten_password"
  | "update_password"
  | "magic_link";

export default function AuthForm() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const pathname = usePathname(); // Reactive to path changes
  const searchParams = useSearchParams(); // Reactive to query param changes

  const [authView, setAuthView] = useState<AuthViewType>("sign_in");

  // This effect will run on mount and whenever pathname or searchParams change,
  // which should be triggered by Next.js Link navigations, even for hash-only changes.
  useEffect(() => {
    const currentHash = window.location.hash;
    console.debug(
      "[AuthForm] useEffect[pathname, searchParams] - Hash:",
      currentHash,
      "Pathname:",
      pathname
    );

    let newView: AuthViewType = "sign_in"; // Default view
    if (currentHash === "#auth-sign-up") {
      newView = "sign_up";
    } else if (currentHash === "#auth-sign-in") {
      newView = "sign_in";
    }

    // Only update state if the determined view is different from the current state
    // This prevents potential infinite loops if the effect runs multiple times with the same hash
    if (authView !== newView) {
      console.debug("[AuthForm] Setting authView from effect to:", newView);
      setAuthView(newView);
    }
  }, [pathname, searchParams, authView]); // include authView to prevent loops if set to same value

  // Separate useEffect for the hashchange event listener for manual hash edits or browser back/forward
  useEffect(() => {
    const handleDirectHashChange = () => {
      const directHash = window.location.hash;
      console.debug("[AuthForm] 'hashchange' event. Direct Hash:", directHash);
      let freshNewView: AuthViewType = "sign_in";
      if (directHash === "#auth-sign-up") {
        freshNewView = "sign_up";
      } else if (directHash === "#auth-sign-in") {
        freshNewView = "sign_in";
      }

      setAuthView((prev) => {
        if (prev !== freshNewView) {
          console.debug(
            "[AuthForm] Setting authView from hashchange listener to:",
            freshNewView
          );
          return freshNewView;
        }
        return prev;
      });
    };
    window.addEventListener("hashchange", handleDirectHashChange);

    return () => {
      window.removeEventListener("hashchange", handleDirectHashChange);
    };
  }, []); // This effect runs once to set up/tear down the direct hash listener

  // useEffect for Supabase auth state changes and initial session check
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN") {
          // Use the hook's searchParams here, which are reactive
          const nextUrl = searchParams.get("next") || "/";
          router.push(nextUrl);
          router.refresh();
        }
      }
    );

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const nextUrl = searchParams.get("next") || "/";
        router.push(nextUrl);
        router.refresh();
      }
    };

    // Only check session if not on an auth path that implies user is already interacting with auth
    // This check can remain based on window.location.hash as it's an initial check logic
    if (!window.location.hash.startsWith("#auth-")) {
      checkSession();
    }

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router, searchParams]); // searchParams is now a dependency here too

  console.debug(
    "[AuthForm] Rendering with authView:",
    authView,
    "and key:",
    authView
  );

  return (
    // The parent div in src/app/auth/page.tsx handles the styling like max-width, padding, bg-card etc.
    // This component just returns the Auth UI.
    <Auth
      key={authView} // This is crucial for forcing re-initialization
      supabaseClient={supabase}
      appearance={{
        theme: ThemeSupa, // Or your custom theme object
        variables: {
          default: {
            colors: {
              brand: "hsl(var(--primary))",
              brandAccent: "hsl(var(--primary))", // Consider a hover shade
              brandButtonText: "hsl(var(--primary-foreground))",
              // Add other color overrides here if needed:
              // defaultButtonBackground: 'hsl(var(--secondary))',
              // defaultButtonText: 'hsl(var(--secondary-foreground))',
              // inputBackground: 'hsl(var(--input))',
              // inputBorder: 'hsl(var(--border))',
              // inputText: 'hsl(var(--foreground))',
            },
            // Add font and radii overrides if needed to match your UI components
            // fonts: {
            //   bodyFontFamily: 'var(--font-geist-sans), sans-serif',
            //   buttonFontFamily: 'var(--font-geist-sans), sans-serif',
            // },
            // radii: {
            //   borderRadiusButton: 'var(--radius)',
            //   inputBorderRadius: 'var(--radius)',
            // }
          },
        },
      }}
      view={authView}
      providers={[]} // Or your configured list
      redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`}
      localization={{
        variables: {
          sign_in: {
            email_label: "Email address",
            password_label: "Password",
            button_label: "Log in",
            link_text: "New here? Create an account", // Text for link to sign_up
          },
          sign_up: {
            email_label: "Email address",
            password_label: "Create a Password",
            button_label: "Sign up", // Text for sign_up button
            link_text: "Already have an account? Log in", // Text for link to sign_in
          },
          // You can also customize other views like forgotten_password, etc.
        },
      }}
    />
  );
}
