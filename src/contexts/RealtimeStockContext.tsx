"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Option } from "effect";
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
  const [manager, setManager] = useState<Option.Option<RealtimeStockManager>>(Option.none());

  useEffect(() => {
    let newManager: RealtimeStockManager | null = null;
    if (supabase) {
      newManager = RealtimeStockManager.getInstance(supabase);
      // Schedule state update to avoid cascading renders
      queueMicrotask(() => {
        if (newManager) {
          setManager(Option.some(newManager));
        }
      });
    } else {
      // Schedule state update to avoid cascading renders
      queueMicrotask(() => {
        setManager(Option.none());
      });
    }

    return () => {
      newManager?.destroy();
    };
  }, [supabase]);

  return (
    <RealtimeStockContext.Provider
      // Convert Option<T> to T | null for backward compatibility
      value={{ manager: Option.isSome(manager) ? manager.value : null }}>
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