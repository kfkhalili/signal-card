// src/app/auth/page.tsx
"use client";

import React, { Suspense, useEffect } from "react"; // Import Suspense and useEffect
import AuthForm from "./AuthForm"; // Import the new component

// Define a simple loading fallback
function AuthLoading() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <p>Loading authentication form...</p>
      {/* You can put a spinner here */}
    </div>
  );
}

export default function AuthPage() {
  // Modern approach: Simple scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md p-8 space-y-8 bg-card text-card-foreground rounded-lg shadow-xl">
        <Suspense fallback={<AuthLoading />}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
