// src/components/layout/Header.tsx
"use client";

import { useState, useEffect, memo, type FC, type ElementType } from "react";
import { Option } from "effect";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Loader2, AlertTriangle, Compass, TrendingUp } from "lucide-react"; // Added Compass icon
import Avatar from "@/components/ui/Avatar";
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import { fromPromise } from "neverthrow";

type Profile = Database['public']['Tables']['user_profiles']['Row'];

const NavLinkItem: FC<{
  href: string;
  title: string;
  icon: ElementType;
  text: string;
}> = ({ href, title, icon: Icon, text }) => (
  <>
    <Button variant="ghost" size="icon" asChild className="sm:hidden">
      <Link href={href} title={title}>
        <Icon className="h-5 w-5" />
      </Link>
    </Button>
    <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
      <Link href={href} title={title}>
        <Icon className="mr-1.5 h-4 w-4" />
        {text}
      </Link>
    </Button>
  </>
);

const Header: FC = () => {
  const { user, signOut, isLoading, clientInitError } = useAuth();
  const [profile, setProfile] = useState<Option.Option<Profile>>(Option.none());
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (user && supabase) {
      const fetchProfile = async () => {
        const profileResult = await fromPromise(
          supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single(),
          (e) => new Error(`Failed to fetch profile for header: ${(e as Error).message}`)
        );

        profileResult.match(
          (response) => {
            const { data, error } = response;

            if (error) {
              console.error('Error fetching profile for header:', error);
            } else {
              setProfile(Option.fromNullable(data));
            }
          },
          (err) => {
            // Handle Result error (network/exception errors)
            console.error('Error fetching profile for header:', err);
          }
        );
      };
      fetchProfile();
    }
  }, [user, supabase]);

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center hover:opacity-80 transition-opacity">
          <Image
            src="/images/tickered.png"
            alt="Tickered Logo"
            width={120}
            height={30}
            priority
            className="h-8 w-auto"
          />
        </Link>
        <nav className="flex items-center space-x-1 sm:space-x-2">
          {clientInitError && (
            <div
              className="flex items-center text-xs text-destructive"
              title={clientInitError}>
              <AlertTriangle className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Auth Unavailable</span>
            </div>
          )}
          {!clientInitError && isLoading && (
            <div className="flex items-center justify-center h-9 min-w-[6rem] px-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground hidden sm:inline">
                Loading...
              </span>
            </div>
          )}
          {!clientInitError && !isLoading && user && (
            <>
              <NavLinkItem
                href="/compass"
                title="Market Compass"
                icon={Compass}
                text="Compass"
              />
              <NavLinkItem
                href="/symbol"
                title="Analysis"
                icon={TrendingUp}
                text="Analysis"
              />
              <NavLinkItem
                href="/workspace"
                title="Workspace"
                icon={LayoutDashboard}
                text="Workspace"
              />
              <Link href="/profile" title="Your Profile" className="flex items-center space-x-2 p-1 rounded-md hover:bg-muted transition-colors">
                {Option.isSome(profile) && (
                    <Avatar
                        src={profile.value.avatar_url}
                        alt={profile.value.full_name || profile.value.username || 'User Avatar'}
                        size={30}
                    />
                )}
                {Option.isSome(profile) && profile.value.username && (
                  <span
                    className="text-xs sm:text-sm text-muted-foreground hidden md:inline truncate max-w-[100px] lg:max-w-[150px]"
                    title={profile.value.username}>
                    @{profile.value.username}
                  </span>
                )}
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                title="Logout">
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </>
          )}
          {!clientInitError && !isLoading && !user && (
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

export default memo(Header);