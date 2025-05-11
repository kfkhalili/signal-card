// src/components/layout/header.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";

const HeaderComponent: React.FC = () => {
  const { user, signOut, isLoading } = useAuth();

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link
          href="/"
          className="text-3xl font-bold text-primary hover:opacity-80 transition-opacity">
          FinSignal Game
        </Link>
        <div className="flex items-center space-x-3">
          {isLoading ? (
            <Button variant="ghost" size="sm" disabled>
              Loading...
            </Button>
          ) : user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/auth">
                <LogIn className="mr-2 h-4 w-4" /> Login / Sign Up
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderComponent;
