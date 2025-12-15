// src/contexts/AuthContext.tsx
"use client";

import {
  createContext,
  useState,
  useEffect,
  useContext,
  type ReactNode,
  type FC,
} from "react";
import { Option } from "effect";
import { fromPromise } from "neverthrow";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Session, User, SupabaseClient } from "@supabase/supabase-js";

// Ensure this interface includes clientInitError
export interface AuthContextType {
  supabase: SupabaseClient | null;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  clientInitError: string | null; // <<< Make sure this line is present
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const supabase = createSupabaseBrowserClient(false);
  const [session, setSession] = useState<Option.Option<Session>>(Option.none());
  const [user, setUser] = useState<Option.Option<User>>(Option.none());
  const [isLoading, setIsLoading] = useState(true);
  const [clientInitError, setClientInitError] = useState<Option.Option<string>>(Option.none()); // Initialized here

  useEffect(() => {
    if (!supabase) {
      // Schedule state updates to avoid cascading renders
      queueMicrotask(() => {
        setClientInitError(
          Option.some("Authentication service is currently unavailable due to a configuration issue.")
        );
        setIsLoading(false);
        setSession(Option.none());
        setUser(Option.none());
      });
      return;
    }

    // Schedule state updates to avoid cascading renders
    queueMicrotask(() => {
      setClientInitError(Option.none());
      setIsLoading(true);
    });

    const getSession = async () => {
      const sessionResult = await fromPromise(
        supabase.auth.getSession(),
        (e) => new Error(`Failed to get session: ${(e as Error).message}`)
      );

      sessionResult.match(
        (response) => {
          const { data, error } = response;
          if (error) {
            console.error("[AuthContext] Error getting session:", error.message);
          }
          setSession(Option.fromNullable(data.session));
          setUser(Option.fromNullable(data.session?.user ?? null));
          setIsLoading(false);
        },
        (err) => {
          // Handle Result error (network/exception errors)
          console.error("[AuthContext] Error getting session:", err.message);
          setSession(Option.none());
          setUser(Option.none());
          setIsLoading(false);
        }
      );
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(Option.fromNullable(currentSession));
        setUser(Option.fromNullable(currentSession?.user ?? null));
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    if (supabase) {
      const signOutResult = await fromPromise(
        supabase.auth.signOut(),
        (e) => new Error(`Failed to sign out: ${(e as Error).message}`)
      );

      signOutResult.match(
        () => {
          // Sign out successful - redirect to landing page
          window.location.href = "/";
        },
        (error) => {
          console.error("[AuthContext] Error signing out:", error.message);
        }
      );
    } else {
      console.warn(
        "[AuthContext] Sign out called, but Supabase client is not initialized."
      );
      setSession(Option.none());
      setUser(Option.none());
      // Still redirect even if client is not initialized
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider
      // Ensure clientInitError is part of the value provided by the context
      // Convert Option<T> to T | null for backward compatibility
      value={{
        supabase,
        session: Option.isSome(session) ? session.value : null,
        user: Option.isSome(user) ? user.value : null,
        isLoading,
        clientInitError: Option.isSome(clientInitError) ? clientInitError.value : null,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
