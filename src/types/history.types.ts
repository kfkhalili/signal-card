// src/types/history.types.ts
import type { Tables } from "@/lib/supabase/database.types";
import type { ConcreteCardData } from "@/components/game/types";

export interface ProcessedCardSnapshot
  extends Omit<Tables<"card_snapshots">, "card_data_snapshot"> {
  card_data_snapshot: ConcreteCardData;
  like_count: number;
  comment_count: number;
  collection_count: number;
}
