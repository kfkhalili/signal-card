// src/app/auth/auth-error/page.tsx
"use client";

export const dynamic = 'force-dynamic';

import { Suspense, type FC } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const AuthErrorContent: FC = () => {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const defaultMessage =
    "An unexpected authentication error occurred. Please try again or contact support if the issue persists.";

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
      <div className="bg-card p-8 rounded-lg shadow-xl max-w-md w-full">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-6" />
        <h1 className="text-2xl font-semibold text-destructive mb-3">
          Authentication Error
        </h1>
        <p className="text-muted-foreground mb-8">
          {message || defaultMessage}
        </p>
        <Button asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
        <p className="text-xs text-muted-foreground mt-6">
          If you were trying to log in, you can also try
          <Button variant="link" asChild className="px-1 text-xs">
            <Link href="/auth#auth-sign-in">logging in again</Link>
          </Button>
          .
        </p>
      </div>
    </div>
  );
};

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading error details...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
