// src/app/auth/page.tsx
"use client";

import { createClient } from "../../lib/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthPage() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN") {
          // Redirect to home page after sign-in
          // Or to a specific workspace page if you have one
          router.push("/");
          router.refresh(); // Important to refresh server components if any depend on auth state
        }
        // You can handle other events like SIGNED_OUT, PASSWORD_RECOVERY, etc.
      }
    );

    // Check initial session
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push("/"); // If already signed in, redirect
        router.refresh();
      }
    };
    checkSession();

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md p-8 space-y-8 bg-card text-card-foreground rounded-lg shadow-xl">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={["google", "github"]} // Example: Add social providers
          redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`} // Ensure this callback route exists or is handled
          localization={{
            variables: {
              sign_in: {
                email_label: "Email address",
                password_label: "Password",
              },
              sign_up: {
                email_label: "Email address",
                password_label: "Create a Password",
              },
            },
          }}
          theme="dark" // Or "light", or remove for default
        />
      </div>
    </div>
  );
}
