// src/app/history/[symbol]/[cardType]/page.tsx

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SnapshotHistoryItem } from "@/components/history/SnapshotHistoryItem";
import type { CardType as APICardType } from "@/components/game/cards/base-card/base-card.types";
import type { ConcreteCardData } from "@/components/game/types";
import type { SupabaseClient } from "@supabase/supabase-js"; // Import SupabaseClient type

// Interface for the data structure of a snapshot fetched from the database, including social counts
export interface CardSnapshotFromDB {
  id: string; // snapshot_id
  card_type: APICardType;
  symbol: string;
  company_name?: string | null;
  logo_url?: string | null;
  card_data_snapshot: ConcreteCardData; // Parsed JSONB
  rarity_level?: string | null;
  rarity_reason?: string | null;
  first_seen_at: string; // ISO string for timestamp

  // Social interaction counts
  like_count: number;
  comment_count: number;
  collection_count: number;
}

interface SignalHistoryPageProps {
  params: Promise<{
    symbol: string;
    cardType: string; // Will be 'price' or 'profile' from the URL
  }>;
  searchParams: Promise<{
    highlight_snapshot?: string; // Optional snapshot ID to highlight
  }>;
}

/**
 * Fetches snapshots for a given symbol and card type, including their social interaction counts.
 * NOTE: This function currently uses N+1 queries to fetch counts.
 * For production, optimize this with a Supabase RPC call.
 * @param supabase The Supabase client instance.
 * @param symbol The stock symbol.
 * @param cardType The type of card ('price' or 'profile').
 * @returns A promise that resolves to an array of CardSnapshotFromDB.
 */
async function getSnapshotsWithCounts(
  supabase: SupabaseClient, // Accepts SupabaseClient type
  symbol: string,
  cardType: APICardType
): Promise<CardSnapshotFromDB[]> {
  // Step 1: Fetch the base snapshot data
  const { data: snapshotsWithoutCounts, error: snapshotsError } = await supabase
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
    .order("first_seen_at", { ascending: false }); // Show newest snapshots first

  if (snapshotsError) {
    console.error(
      `Error fetching snapshots for ${symbol} (${cardType}):`,
      snapshotsError
    );
    throw snapshotsError; // Re-throw to be handled by the calling page component
  }

  if (!snapshotsWithoutCounts || snapshotsWithoutCounts.length === 0) {
    return [];
  }

  // Step 2: For each snapshot, fetch its social counts (N+1 queries - optimize for production)
  const snapshotsWithCountsPromises = snapshotsWithoutCounts.map(
    async (snapshot) => {
      // Fetch like count
      const { count: like_count, error: likeError } = await supabase
        .from("snapshot_likes")
        .select("id", { count: "exact", head: true })
        .eq("snapshot_id", snapshot.id);

      // Fetch comment count
      const { count: comment_count, error: commentError } = await supabase
        .from("snapshot_comments")
        .select("id", { count: "exact", head: true })
        .eq("snapshot_id", snapshot.id);

      // Fetch collection (bookmark) count
      const { count: collection_count, error: collectionError } = await supabase
        .from("user_collections")
        .select("id", { count: "exact", head: true })
        .eq("snapshot_id", snapshot.id);

      if (likeError)
        console.warn(
          `Error fetching like count for snapshot ${snapshot.id}:`,
          likeError.message
        );
      if (commentError)
        console.warn(
          `Error fetching comment count for snapshot ${snapshot.id}:`,
          commentError.message
        );
      if (collectionError)
        console.warn(
          `Error fetching collection count for snapshot ${snapshot.id}:`,
          collectionError.message
        );

      return {
        ...snapshot,
        card_type: snapshot.card_type as APICardType, // Ensure correct type after fetch
        card_data_snapshot: snapshot.card_data_snapshot as ConcreteCardData, // Ensure correct type
        like_count: like_count || 0,
        comment_count: comment_count || 0,
        collection_count: collection_count || 0,
      };
    }
  );

  const resolvedSnapshotsWithCounts = await Promise.all(
    snapshotsWithCountsPromises
  );
  return resolvedSnapshotsWithCounts as CardSnapshotFromDB[]; // Cast to the full type
}

export default async function SignalHistoryPage({
  params,
  searchParams,
}: SignalHistoryPageProps) {
  const supabase = createClient(); // Server-side Supabase client
  const { symbol: symbolParam, cardType: cardTypeParam } = await params;
  const symbol = symbolParam.toUpperCase();
  // Ensure cardType is one of the expected values, otherwise notFound
  const cardType = cardTypeParam.toLowerCase() as APICardType;
  const { highlight_snapshot } = await searchParams;

  if (cardType !== "price" && cardType !== "profile") {
    console.warn(`Invalid cardType received in URL: ${cardType}`);
    notFound();
  }

  let typedSnapshots: CardSnapshotFromDB[] = [];
  let fetchError: string | null = null;

  try {
    // Fetch snapshots with their counts
    typedSnapshots = await getSnapshotsWithCounts(
      await supabase,
      symbol,
      cardType
    );
  } catch (error: any) {
    console.error(
      `Failed to load signal history for ${symbol} (${cardType}):`,
      error
    );
    fetchError =
      error.message ||
      "An unexpected error occurred while loading signal history.";
  }

  // Render error state if fetching failed
  if (fetchError) {
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
        <p className="text-destructive text-center mt-10">
          Error: {fetchError}
        </p>
      </div>
    );
  }

  // Render empty state if no snapshots are found
  if (typedSnapshots.length === 0) {
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
        <p className="text-center text-muted-foreground mt-10">
          No historical snapshots found for {symbol} ({cardType}).
        </p>
      </div>
    );
  }

  // Render the list of snapshots
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
            snapshot={snapshot} // snapshot now includes the counts
            isHighlighted={highlight_snapshot === snapshot.id.toString()}
          />
        ))}
      </div>
    </div>
  );
}
