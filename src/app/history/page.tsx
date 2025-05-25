// src/app/history/[symbol]/[cardType]/page.tsx

import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SnapshotHistoryItem } from "@/components/history/SnapshotHistoryItem";
import type { CardType as APICardType } from "@/components/game/cards/base-card/base-card.types";
import type { ConcreteCardData } from "@/components/game/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProcessedCardSnapshot } from "@/types/history.types";
import type { Json } from "@/lib/supabase/database.types";
import type {
  PriceCardData,
  PriceCardStaticData,
  PriceCardLiveData,
} from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";

interface SignalHistoryPageServerProps {
  params: Promise<{ symbol: string; cardType: string }>;
  searchParams: Promise<{ highlight_snapshot?: string | undefined }>;
}

// Helper to safely cast and structure the snapshot data (similar to collection page)
function processHistoryCardDataSnapshot(
  card_type: APICardType,
  snapshotJson: Json
): ConcreteCardData {
  const rawData = snapshotJson as any;

  if (card_type === "price") {
    return {
      id: rawData.id,
      type: "price",
      symbol: rawData.symbol,
      createdAt: rawData.createdAt,
      companyName: rawData.companyName,
      logoUrl: rawData.logoUrl,
      staticData: rawData.staticData as PriceCardStaticData,
      liveData: rawData.liveData as PriceCardLiveData,
      backData: rawData.backData,
    } as PriceCardData;
  } else if (card_type === "profile") {
    return rawData as ProfileCardData;
  }
  console.warn(
    `Unknown card type in processHistoryCardDataSnapshot: ${card_type}`
  );
  return rawData as ConcreteCardData;
}

export default async function SignalHistoryPage({
  params,
  searchParams,
}: SignalHistoryPageServerProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { symbol: symbolParam, cardType: cardTypeParam } = resolvedParams;
  const symbol = symbolParam.toUpperCase();
  const cardType = cardTypeParam.toLowerCase() as APICardType;
  const { highlight_snapshot } = resolvedSearchParams;

  const supabaseClient = await createSupabaseServerClient();

  if (cardType !== "price" && cardType !== "profile") {
    console.warn(`Invalid cardType received in URL: ${cardType}`);
    notFound();
  }

  let typedSnapshots: ProcessedCardSnapshot[] = [];
  let fetchError: string | null = null;

  try {
    typedSnapshots = await getSnapshotsWithCounts(
      supabaseClient,
      symbol,
      cardType
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while loading signal history.";
    console.error(
      `Failed to load signal history for ${symbol} (${cardType}):`,
      error
    );
    fetchError = errorMessage;
  }

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
            snapshot={snapshot} // ProcessedCardSnapshot now has ConcreteCardData
            isHighlighted={highlight_snapshot === snapshot.id.toString()}
          />
        ))}
      </div>
    </div>
  );
}

async function getSnapshotsWithCounts(
  supabase: SupabaseClient,
  symbol: string,
  cardType: APICardType
): Promise<ProcessedCardSnapshot[]> {
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
    .order("first_seen_at", { ascending: false });

  if (snapshotsError) {
    console.error(
      `Error fetching snapshots for ${symbol} (${cardType}):`,
      snapshotsError
    );
    throw snapshotsError;
  }

  if (!snapshotsWithoutCounts || snapshotsWithoutCounts.length === 0) {
    return [];
  }

  const snapshotsWithCountsPromises = snapshotsWithoutCounts.map(
    async (snapshot) => {
      const { count: like_count, error: likeError } = await supabase
        .from("snapshot_likes")
        .select("id", { count: "exact", head: true })
        .eq("snapshot_id", snapshot.id);

      const { count: comment_count, error: commentError } = await supabase
        .from("snapshot_comments")
        .select("id", { count: "exact", head: true })
        .eq("snapshot_id", snapshot.id);

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

      const cardTypeFromDB = snapshot.card_type as APICardType;
      const concreteData = processHistoryCardDataSnapshot(
        cardTypeFromDB,
        snapshot.card_data_snapshot
      );

      return {
        ...snapshot,
        card_type: cardTypeFromDB, // Ensure it's APICardType
        card_data_snapshot: concreteData, // Use processed data
        like_count: like_count || 0,
        comment_count: comment_count || 0,
        collection_count: collection_count || 0,
      };
    }
  );

  // The result of Promise.all will match the return type of the async function,
  // which after processing, aligns with Omit<Tables<"card_snapshots">, "card_data_snapshot"> & { card_data_snapshot: ConcreteCardData; ...counts }
  const resolvedSnapshotsWithCounts = await Promise.all(
    snapshotsWithCountsPromises
  );
  return resolvedSnapshotsWithCounts as ProcessedCardSnapshot[];
}
