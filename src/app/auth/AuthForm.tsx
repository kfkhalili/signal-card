// src/app/auth/AuthForm.tsx
"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

type AuthViewType =
  | "sign_in"
  | "sign_up"
  | "forgotten_password"
  | "update_password"
  | "magic_link";

export default function AuthForm() {
  const supabase = createSupabaseBrowserClient(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [authView, setAuthView] = useState<AuthViewType>("sign_in");

  useEffect(() => {
    const currentHash = window.location.hash;

    let newView: AuthViewType = "sign_in";
    if (currentHash === "#auth-sign-up") {
      newView = "sign_up";
    } else if (currentHash === "#auth-sign-in") {
      newView = "sign_in";
    }

    if (authView !== newView) {
      setAuthView(newView);
    }
  }, [pathname, searchParams, authView]);

  useEffect(() => {
    const handleDirectHashChange = () => {
      const directHash = window.location.hash;
      let freshNewView: AuthViewType = "sign_in";
      if (directHash === "#auth-sign-up") {
        freshNewView = "sign_up";
      } else if (directHash === "#auth-sign-in") {
        freshNewView = "sign_in";
      }
      setAuthView((prev) => (prev !== freshNewView ? freshNewView : prev));
    };
    window.addEventListener("hashchange", handleDirectHashChange);
    return () => {
      window.removeEventListener("hashchange", handleDirectHashChange);
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      console.warn(
        "[AuthForm] Supabase client is not initialized. Auth listeners and session checks skipped."
      );
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        const nextUrl = searchParams.get("next") || "/";
        router.push(nextUrl);
        router.refresh();
      }
    });

    const checkSession = async () => {
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const nextUrl = searchParams.get("next") || "/";
          router.push(nextUrl);
          router.refresh();
        }
      }
    };

    if (!window.location.hash.startsWith("#auth-")) {
      checkSession();
    }

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router, searchParams]);

  if (!supabase) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">
          Authentication Unavailable
        </h2>
        <p className="text-muted-foreground">
          The authentication service could not be initialized. Please ensure the
          application is configured correctly or try again later.
        </p>
      </div>
    );
  }

  return (
    <Auth
      key={authView}
      supabaseClient={supabase}
      appearance={{
        theme: ThemeSupa,
        variables: {
          default: {
            colors: {
              brand: "hsl(var(--primary))",
              brandAccent: "hsl(var(--primary))",
              brandButtonText: "hsl(var(--primary-foreground))",
            },
          },
        },
      }}
      view={authView}
      providers={['google']}
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
            button_label: "Sign up",
            link_text: "New here? Create an account",
          },
        },
      }}
      queryParams={{
        hl: 'en',
      }}
    />
  );
}