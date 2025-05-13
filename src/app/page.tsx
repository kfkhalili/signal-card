// src/app/page.tsx
"use client"; // <-- Make it a client component

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext"; // <-- Import useAuth
import { LogIn, LayoutDashboard } from "lucide-react"; // <-- Import icons

export default function LandingPage() {
  // Get auth state using the hook
  const { user, isLoading } = useAuth();

  const renderButtons = () => {
    if (isLoading) {
      return (
        <div className="space-x-4">
          <Button disabled size="lg">
            Loading...
          </Button>
        </div>
      );
    }

    if (user) {
      // User is logged in - show only Go to Workspace
      return (
        <div className="space-x-4">
          <Button size="lg" asChild>
            <Link href="/workspace">
              <LayoutDashboard className="mr-2 h-5 w-5" /> Go to Workspace
            </Link>
          </Button>
          {/* Optionally add other logged-in actions here */}
        </div>
      );
    } else {
      // User is logged out - show Workspace (will redirect via middleware) and Login
      return (
        <div className="space-x-4">
          <Button size="lg" variant="outline" asChild>
            {/* This link will be caught by middleware if user isn't logged in */}
            <Link href="/workspace">
              <LayoutDashboard className="mr-2 h-5 w-5" /> View Workspace Demo
            </Link>
          </Button>
          <Button size="lg" asChild>
            <Link href="/auth">
              <LogIn className="mr-2 h-5 w-5" /> Login / Sign Up
            </Link>
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto p-4 text-center flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <h1 className="text-4xl font-bold mb-4 text-primary">
        Welcome to FinSignal Game!
      </h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
        Transform the way you track financial markets. Monitor live data through
        dynamic cards and capture significant market events to build your unique
        collection.
      </p>

      {/* Render buttons dynamically */}
      {renderButtons()}

      {/* Add more landing page content here later */}
      <div className="mt-16 text-sm text-muted-foreground">
        (This is the public landing page - content TBD)
      </div>
    </div>
  );
}
