// src/app/collection/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import CollectionClientPage from "./CollectionClientPage";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { ConcreteCardData } from "@/components/game/types";
import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
// Import the new utility
import { getLiveDataInitializer } from "@/components/game/cardLiveDataDefaults";

// Define the structure of a snapshot as fetched from the 'card_snapshots' table
// This is the type we want for our application logic.
// Updated to include social counts
interface CardSnapshotFromDB {
  id: string;
  card_type: CardType;
  symbol: string;
  company_name?: string | null;
  logo_url?: string | null;
  card_data_snapshot: ConcreteCardData;
  rarity_level?: string | null;
  rarity_reason?: string | null;
  first_seen_at: string;
  like_count: number; // Added
  comment_count: number; // Added
  collection_count: number; // Added
}

// This interface represents the raw shape from Supabase join,
// where card_data_snapshot is still Json.
interface RawSupabaseSnapshot {
  id: string;
  card_type: string;
  symbol: string;
  company_name?: string | null;
  logo_url?: string | null;
  card_data_snapshot: Json;
  rarity_level?: string | null;
  rarity_reason?: string | null;
  first_seen_at: string;
  // Counts will be added after fetching
}

export interface ServerFetchedCollectedCard {
  user_collection_id: string;
  user_id: string;
  snapshot_id: string;
  captured_at: string;
  user_notes: string | null;
  card_snapshot_data: CardSnapshotFromDB; // This will hold the correctly typed snapshot with counts
}

// Helper to safely cast and structure the snapshot data
function processCardDataSnapshot(
  card_type: CardType,
  snapshotJson: Json
): ConcreteCardData {
  const rawData = snapshotJson as Record<string, any>; // Cast to Record for easier manipulation

  // Ensure the base 'type' property in the blob matches card_type from the snapshot table record
  // This helps align the blob's internal type with the table's authoritative type.
  rawData.type = card_type;

  // Check if liveData is missing or not an object
  if (!rawData.liveData || typeof rawData.liveData !== "object") {
    const initializer = getLiveDataInitializer(card_type);
    if (initializer) {
      rawData.liveData = initializer();
    } else {
      // If no specific liveData initializer, it implies this card type might not
      // have a 'liveData' field as per its ConcreteCardData definition,
      // or an initializer hasn't been registered.
      // Setting it to an empty object can prevent crashes if some downstream
      // logic unexpectedly tries to access it, but for types defined without
      // liveData, this field might just be ignored.
      // It's also a good place to warn if a type *should* have liveData but lacks an initializer.
      console.warn(
        `LiveData is missing or not an object for card_type "${card_type}" and no initializer was found. Ensuring 'liveData' key exists as empty object if not part of its type definition.`
      );
      // Only add liveData: {} if the type definition for this card_type actually includes liveData.
      // For now, we will add it to be safe, assuming most cards might have it or it's optional.
      // A more advanced setup could check against a schema.
      rawData.liveData = {};
    }
  }
  // The rawData, now with ensured rawData.type and potentially initialized/defaulted rawData.liveData,
  // is cast to ConcreteCardData. The specific card type (PriceCardData, ProfileCardData, etc.)
  // will determine if rawData.liveData is further refined or used based on its definition.
  return rawData as ConcreteCardData;
}

async function getSnapshotCounts(
  supabase: SupabaseClient,
  snapshotId: string
): Promise<{
  like_count: number;
  comment_count: number;
  collection_count: number;
}> {
  const [likes, comments, collections] = await Promise.all([
    supabase
      .from("snapshot_likes")
      .select("id", { count: "exact", head: true })
      .eq("snapshot_id", snapshotId),
    supabase
      .from("snapshot_comments")
      .select("id", { count: "exact", head: true })
      .eq("snapshot_id", snapshotId),
    supabase
      .from("user_collections")
      .select("id", { count: "exact", head: true }) // This counts how many users collected this snapshot
      .eq("snapshot_id", snapshotId),
  ]);

  if (likes.error)
    console.warn(
      `Error fetching like count for snapshot ${snapshotId}:`,
      likes.error.message
    );
  if (comments.error)
    console.warn(
      `Error fetching comment count for snapshot ${snapshotId}:`,
      comments.error.message
    );
  if (collections.error)
    console.warn(
      `Error fetching collection count for snapshot ${snapshotId}:`,
      collections.error.message
    );

  return {
    like_count: likes.count || 0,
    comment_count: comments.count || 0,
    collection_count: collections.count || 0,
  };
}

export default async function CollectionPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please log in to view your collection.");
  }

  const { data: userCollectionEntries, error } = await supabase
    .from("user_collections")
    .select(
      `
      id,
      user_id,
      captured_at,
      user_notes,
      snapshot_id,
      card_snapshots (
        id,
        card_type,
        symbol,
        company_name,
        logo_url,
        card_data_snapshot,
        rarity_level,
        rarity_reason,
        first_seen_at
      )
    `
    )
    .eq("user_id", user.id)
    .order("captured_at", { ascending: false });

  if (error) {
    console.error("Error fetching collected cards:", error);
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-primary">
          My Card Collection
        </h1>
        <p className="text-destructive">
          Could not load your collection: {error.message}
        </p>
      </div>
    );
  }

  const serverCollectedCardsPromises =
    userCollectionEntries?.map(async (entry) => {
      let rawSnapshotFromDB: RawSupabaseSnapshot | null = null;

      if (Array.isArray(entry.card_snapshots)) {
        if (entry.card_snapshots.length > 0) {
          rawSnapshotFromDB = entry.card_snapshots[0] as RawSupabaseSnapshot;
        }
      } else if (entry.card_snapshots) {
        rawSnapshotFromDB = entry.card_snapshots as RawSupabaseSnapshot;
      }

      if (!rawSnapshotFromDB) {
        console.warn(
          `Collection entry ${entry.id} is missing its card snapshot data. Skipping.`
        );
        return null;
      }

      const cardTypeFromDB = rawSnapshotFromDB.card_type as CardType;
      const concreteData = processCardDataSnapshot(
        cardTypeFromDB,
        rawSnapshotFromDB.card_data_snapshot
      );

      // Fetch counts for this snapshot
      const counts = await getSnapshotCounts(supabase, rawSnapshotFromDB.id);

      const appTypedSnapshot: CardSnapshotFromDB = {
        id: rawSnapshotFromDB.id,
        card_type: cardTypeFromDB,
        symbol: rawSnapshotFromDB.symbol,
        company_name: rawSnapshotFromDB.company_name,
        logo_url: rawSnapshotFromDB.logo_url,
        card_data_snapshot: concreteData,
        rarity_level: rawSnapshotFromDB.rarity_level,
        rarity_reason: rawSnapshotFromDB.rarity_reason,
        first_seen_at: rawSnapshotFromDB.first_seen_at,
        like_count: counts.like_count,
        comment_count: counts.comment_count,
        collection_count: counts.collection_count,
      };

      if (
        appTypedSnapshot.card_type !== appTypedSnapshot.card_data_snapshot.type
      ) {
        console.warn(
          `Data inconsistency for snapshot ID ${appTypedSnapshot.id}: ` +
            `Snapshot table card_type is "${appTypedSnapshot.card_type}", but ` +
            `card_data_snapshot.type is "${appTypedSnapshot.card_data_snapshot.type}". ` +
            `Using card_type from snapshot table ("${appTypedSnapshot.card_type}").`
        );
      }

      return {
        user_collection_id: entry.id,
        user_id: entry.user_id,
        snapshot_id: entry.snapshot_id,
        captured_at: entry.captured_at,
        user_notes: entry.user_notes,
        card_snapshot_data: appTypedSnapshot,
      };
    }) || [];

  const serverCollectedCards = (
    await Promise.all(serverCollectedCardsPromises)
  ).filter((card): card is ServerFetchedCollectedCard => card !== null);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">My Card Collection</h1>
        <Link
          href="/workspace"
          className="text-sm text-primary hover:underline">
          &larr; Back to Workspace
        </Link>
      </div>
      <CollectionClientPage initialCollectedCards={serverCollectedCards} />
    </div>
  );
}
