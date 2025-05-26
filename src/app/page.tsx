// src/app/page.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button"; // Your existing Shadcn/UI button
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation"; // Import useRouter
import { useEffect } from "react"; // Import useEffect

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter(); // Get router instance

  useEffect(() => {
    // Only attempt to redirect if loading is complete and user exists
    if (!isLoading && user) {
      router.push("/workspace");
    }
    // The effect should re-run if isLoading or user changes.
    // router is stable and doesn't need to be in the dependency array usually,
    // but including it doesn't hurt and can prevent linting issues in some configs.
  }, [user, isLoading, router]);

  // If still loading, or if the user is present (and redirection is about to happen),
  // you might want to show a loading indicator or nothing to prevent a flash of content.
  // Or, if the user is present and isLoading is false, the redirect will happen,
  // so the content below might only flash briefly or not at all.
  if (isLoading || (!isLoading && user)) {
    // Optionally, render a loading state or null while checking auth/redirecting
    // For a smoother transition, especially if there's a slight delay before redirect,
    // you might want a loading spinner here.
    return (
      <div className="container mx-auto px-4 text-center flex flex-col items-center justify-center min-h-[calc(100vh-160px)] sm:min-h-[calc(100vh-200px)]">
        {/* You can put a loading spinner or a simple message here */}
        <p>Loading...</p>
      </div>
    );
  }

  // This content will only be shown if isLoading is false AND user is null
  return (
    <div className="container mx-auto px-4 text-center flex flex-col items-center justify-center min-h-[calc(100vh-160px)] sm:min-h-[calc(100vh-200px)]">
      {/* Conditional Hero Section (already ensures !isLoading && !user) */}
      <div className="w-full">
        <div className="flex flex-col items-center justify-center text-center min-h-[40vh] md:min-h-[50vh] mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl uppercase mb-0 font-bold font-['FaktCondensed',_AvenirNextCondensed-Medium,_'Segoe_UI',_sans-serif]">
            Spot the Trends
          </h1>
          <h2 className="text-4xl sm:text-5xl md:text-6xl uppercase underline decoration-primary decoration-[8px] sm:decoration-[10px] md:decoration-[12px] underline-offset-[6px] sm:underline-offset-8 mb-6 font-bold font-['FaktCondensed',_AvenirNextCondensed-Medium,_'Segoe_UI',_sans-serif] -mt-1 sm:-mt-2">
            See the Moves
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-foreground/80 max-w-xl md:max-w-2xl mb-8">
            Market Signals, Simplified. Dive into dynamic financial data,
            capture key market events, and build your unique collection.
          </p>
          <Button
            size="lg"
            asChild
            className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/auth#auth-sign-up">Sign up</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
