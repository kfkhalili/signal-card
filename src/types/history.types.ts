// src/types/history.types.ts
import type { Tables } from "@/lib/supabase/database.types";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { ConcreteCardData } from "@/components/game/types";

export interface ProcessedCardSnapshot
  extends Omit<Tables<"card_snapshots">, "card_data_snapshot" | "card_type"> {
  card_type: CardType; // Ensure card_type is the enum CardType
  card_data_snapshot: ConcreteCardData; // This should align with the new structures
  like_count: number;
  comment_count: number;
  collection_count: number;
}
