// src/hooks/useExchangeRate.ts
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fromPromise } from "neverthrow";

type ExchangeRates = Record<string, number>;

export function useExchangeRate() {
  const { supabase } = useAuth();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});

  useEffect(() => {
    async function fetchRates() {
      if (!supabase) return;

      const queryResult = await fromPromise(
        supabase.from("exchange_rates").select("*"),
        (e) => new Error(`Failed to fetch exchange rates: ${(e as Error).message}`)
      );

      queryResult.match(
        (response) => {
          const { data, error } = response;

          if (error) {
            console.error("Error fetching exchange rates:", error);
            return;
          }

          const rates: ExchangeRates = {};
          if (data) {
            data.forEach((rate) => {
              rates[rate.target_code] = rate.rate;
            });
          }
          setExchangeRates(rates);
        },
        (err) => {
          console.error("Error fetching exchange rates:", err);
          // Keep existing rates on error (don't clear them)
        }
      );
    }

    fetchRates();
  }, [supabase]);

  return exchangeRates;
}