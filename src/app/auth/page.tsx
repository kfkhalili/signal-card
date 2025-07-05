// src/app/auth/page.tsx
"use client";

import React, { Suspense, useEffect } from "react"; // Import Suspense and useEffect
import AuthForm from "./AuthForm"; // Import the new component

// Define a simple loading fallback
function AuthLoading() {
  return (
    <div className="flex justify-center items-center">
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
    <div className="flex justify-center items-center">
      <div className="w-full max-w-md p-8 space-y-8 bg-card text-card-foreground rounded-lg shadow-xl">
        <Suspense fallback={<AuthLoading />}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
