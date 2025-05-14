// src/app/history/[symbol]/[cardType]/page.tsx
// NEW FILE
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import GameCard from "@/components/game/GameCard"; // Adjust path as necessary
import { SnapshotHistoryItem } from "@/components/history/SnapshotHistoryItem";
import type { CardType as APICardType } from "@/components/game/cards/base-card/base-card.types";
import type { ConcreteCardData } from "@/components/game/types";

// This should match the structure returned by your card_snapshots table,
// similar to what's used in src/app/collection/page.tsx
export interface CardSnapshotFromDB {
  id: string; // snapshot_id
  card_type: APICardType;
  symbol: string;
  company_name?: string | null;
  logo_url?: string | null;
  card_data_snapshot: ConcreteCardData; // Parsed JSONB
  rarity_level?: string | null;
  rarity_reason?: string | null;
  first_seen_at: string; // ISO string
  // Add other fields from card_snapshots if needed, like like_count, comment_count if you implement those directly on the table
}

interface SignalHistoryPageProps {
  params: {
    symbol: string;
    cardType: string;
  };
  searchParams: {
    highlight_snapshot?: string;
  };
}

export default async function SignalHistoryPage({
  params,
  searchParams,
}: SignalHistoryPageProps) {
  const supabase = await createClient();
  const symbol = params.symbol.toUpperCase();
  const cardType = params.cardType.toLowerCase() as APICardType;

  if (cardType !== "price" && cardType !== "profile") {
    notFound();
  }

  const { data: snapshots, error } = await supabase
    .from("card_snapshots")
    .select(
      `
      id,
      card_type,
      symbol,
      company_name,
      logo_url,
      card_data_snapshot,
      rarity_level,
      rarity_reason,
      first_seen_at
    `
    )
    .eq("symbol", symbol)
    .eq("card_type", cardType)
    .order("first_seen_at", { ascending: false }); // Show newest first

  if (error) {
    console.error("Error fetching snapshots for history:", error);
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-primary">
          Signal History for {symbol} ({cardType})
        </h1>
        <p className="text-destructive">
          Could not load signal history: {error.message}
        </p>
      </div>
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">
            Signal History for {symbol} ({cardType})
          </h1>
          <Link
            href="/workspace"
            className="text-sm text-primary hover:underline">
            &larr; Back to Workspace
          </Link>
        </div>
        <p className="text-center text-muted-foreground mt-10">
          No snapshots found for {symbol} ({cardType}).
        </p>
      </div>
    );
  }

  // Cast to the correct type, ensuring card_data_snapshot is ConcreteCardData
  const typedSnapshots: CardSnapshotFromDB[] = snapshots.map((s: any) => ({
    ...s,
    card_type: s.card_type as APICardType,
    card_data_snapshot: s.card_data_snapshot as ConcreteCardData,
  }));

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary capitalize">
          Signal History: {symbol} - {cardType}
        </h1>
        <Link
          href="/workspace"
          className="text-sm text-primary hover:underline">
          &larr; Back to Workspace
        </Link>
      </div>

      <div className="space-y-8">
        {typedSnapshots.map((snapshot) => (
          <SnapshotHistoryItem
            key={snapshot.id}
            snapshot={snapshot}
            isHighlighted={
              searchParams.highlight_snapshot === snapshot.id.toString()
            }
          />
        ))}
      </div>
    </div>
  );
}
