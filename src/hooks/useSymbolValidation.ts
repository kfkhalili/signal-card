// src/hooks/useSymbolValidation.ts
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useSymbolValidation(ticker: string) {
  const { supabase } = useAuth();
  const [symbolValid, setSymbolValid] = useState<boolean | null>(null); // null = checking, true = valid, false = invalid

  useEffect(() => {
    if (!supabase || !ticker) return;

    // Check if symbol exists in listed_symbols
    supabase
      .from("listed_symbols")
      .select("symbol")
      .eq("symbol", ticker)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error(`[SymbolAnalysisPage] Error checking symbol validity:`, error);
          setSymbolValid(true); // Allow page to load on error (graceful degradation)
          return;
        }

        if (!data) {
          // Symbol not found
          setSymbolValid(false);
        } else {
          setSymbolValid(true);
        }
      });
  }, [supabase, ticker]);

  return symbolValid;
}
