"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DemoCardsGrid from "@/components/landing/DemoCardsGrid";

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/compass");
    }
  }, [user, isLoading, router]);

  if (isLoading || (!isLoading && user)) {
    return (
      <div className="container mx-auto px-4 text-center flex flex-col items-center justify-center min-h-[calc(100vh-160px)] sm:min-h-[calc(100vh-200px)]">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 text-center flex flex-col items-center justify-center gap-12 sm:gap-16">
      <div className="w-full">
        <div className="flex flex-col items-center justify-center text-center min-h-[50vh]">
          <h1 className="text-4xl sm:text-5xl md:text-6xl uppercase mb-0 font-bold font-['FaktCondensed',_AvenirNextCondensed-Medium,_'Segoe_UI',_sans-serif]">
            Spot the Trends
          </h1>
          <h2 className="text-4xl sm:text-5xl md:text-6xl uppercase underline decoration-primary decoration-[8px] sm:decoration-[10px] md:decoration-[12px] underline-offset-[6px] sm:underline-offset-8 mb-6 font-bold font-['FaktCondensed',_AvenirNextCondensed-Medium,_'Segoe_UI',_sans-serif] -mt-1 sm:-mt-2">
            See the Moves
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-foreground/80 max-w-xl md:max-w-2xl mb-8">
            Market Signals, Simplified. Access institutional-grade data and real-time market feeds through our financial services platform. Dive into dynamic financial data, capture key market events, and build your unique collection with API integration.
          </p>
          <Button
            size="lg"
            asChild
            className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/auth#auth-sign-up">Sign up</Link>
          </Button>
        </div>
      </div>

      <div className="w-full">
        <DemoCardsGrid />
      </div>
    </div>
  );
}
