// src/components/layout/header.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Loader2 } from "lucide-react";

const NavLinkItem: React.FC<{
  href: string;
  title: string;
  icon: React.ElementType;
  text: string;
}> = ({ href, title, icon: Icon, text }) => (
  <>
    {/* Icon-only button for extra-small screens */}
    <Button variant="ghost" size="icon" asChild className="sm:hidden">
      <Link href={href} title={title}>
        <Icon className="h-5 w-5" />
      </Link>
    </Button>
    {/* Button with icon and text for small screens and up */}
    <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
      <Link href={href} title={title}>
        <Icon className="mr-1.5 h-4 w-4" />
        {text}
      </Link>
    </Button>
  </>
);

const HeaderComponent: React.FC = () => {
  const { user, signOut, isLoading } = useAuth();

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link
          href="/"
          className="text-2xl sm:text-3xl font-bold text-primary hover:opacity-80 transition-opacity">
          MarketEcho
        </Link>
        <nav className="flex items-center space-x-1 sm:space-x-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-9 w-24 px-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading...
              </span>
            </div>
          ) : user ? (
            <>
              <NavLinkItem
                href="/workspace"
                title="Workspace"
                icon={LayoutDashboard}
                text="Workspace"
              />

              {user.email && (
                <span
                  className="text-xs sm:text-sm text-muted-foreground hidden md:inline truncate max-w-[100px] lg:max-w-[150px]"
                  title={user.email}>
                  {user.email}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                title="Logout">
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="default" size="sm">
                <Link href="/auth#auth-sign-up">Sign Up</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/auth#auth-sign-in">Login</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default React.memo(HeaderComponent);
