// src/contexts/AuthContext.tsx
"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  type ReactNode,
} from "react";
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const supabase = createSupabaseBrowserClient(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clientInitError, setClientInitError] = useState<string | null>(null); // Initialized here

  useEffect(() => {
    if (!supabase) {
      setClientInitError(
        "Authentication service is currently unavailable due to a configuration issue."
      );
      setIsLoading(false);
      setSession(null);
      setUser(null);
      return;
    }

    setClientInitError(null);
    setIsLoading(true);

    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("[AuthContext] Error getting session:", error.message);
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      console.warn(
        "[AuthContext] Sign out called, but Supabase client is not initialized."
      );
      setSession(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      // Ensure clientInitError is part of the value provided by the context
      value={{ supabase, session, user, isLoading, clientInitError, signOut }}>
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
