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
        <div className="flex items-center space-x-2 sm:space-x-3">
          {isLoading ? (
            <Button variant="ghost" size="sm" disabled>
              Loading...
            </Button>
          ) : user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/workspace" title="Workspace">
                  {/* Use an appropriate icon if desired */}
                  <span className="hidden sm:inline">Workspace</span>
                </Link>
              </Button>
              {/* Existing Collection Link */}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/collection" title="My Collection">
                  <span className="hidden sm:inline">My Collection</span>
                </Link>
              </Button>
              <span
                className="text-sm text-muted-foreground hidden md:inline truncate max-w-[150px]"
                title={user.email}>
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
