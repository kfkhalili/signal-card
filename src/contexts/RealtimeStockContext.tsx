"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { RealtimeStockManager } from "@/lib/supabase/realtime-stock-manager";

interface RealtimeStockContextType {
  manager: RealtimeStockManager | null;
}

const RealtimeStockContext = createContext<RealtimeStockContextType | undefined>(
  undefined
);

export function RealtimeStockProvider({ children }: { children: ReactNode }) {
  const { supabase } = useAuth();
  const [manager, setManager] = useState<RealtimeStockManager | null>(null);

  useEffect(() => {
    let newManager: RealtimeStockManager | null = null;
    if (supabase) {
      newManager = RealtimeStockManager.getInstance(supabase);
      setManager(newManager);
    }

    return () => {
      newManager?.destroy();
    };
  }, [supabase]);

  return (
    <RealtimeStockContext.Provider value={{ manager }}>
      {children}
    </RealtimeStockContext.Provider>
  );
}

export function useRealtimeStock() {
  const context = useContext(RealtimeStockContext);
  if (context === undefined) {
    throw new Error(
      "useRealtimeStock must be used within a RealtimeStockProvider"
    );
  }
  return context;
}