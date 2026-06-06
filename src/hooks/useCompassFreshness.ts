import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export function useCompassFreshness(supabase: SupabaseClient<Database> | null) {
  return useQuery({
    queryKey: ["compass-freshness"],
    queryFn: async () => {
      if (!supabase) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc("get_compass_freshness" as any);
      if (error) {
        console.error("Failed to fetch compass freshness. Details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          raw: error
        });
        throw error;
      }
      return data as string;
    },
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
