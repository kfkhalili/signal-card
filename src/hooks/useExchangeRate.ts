// src/hooks/useExchangeRate.ts
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

type ExchangeRates = Record<string, number>;

export function useExchangeRate() {
  const { supabase } = useAuth();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});

  useEffect(() => {
    async function fetchRates() {
      if (!supabase) return;

      const { data, error } = await supabase.from("exchange_rates").select("*");

      if (error) {
        console.error("Error fetching exchange rates:", error);
        return;
      }

      const rates: ExchangeRates = {};
      data.forEach((rate) => {
        rates[rate.target_code] = rate.rate;
      });
      setExchangeRates(rates);
    }

    fetchRates();
  }, [supabase]);

  return exchangeRates;
}