// src/app/collection/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import CollectionClientPage from "./CollectionClientPage";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { ConcreteCardData } from "@/components/game/types";
import type { Json } from "@/lib/supabase/database.types"; // Import Json type

// Define the structure of a snapshot as fetched from the 'card_snapshots' table
// This is the type we want for our application logic.
interface CardSnapshotFromDB {
  id: string;
  card_type: CardType;
  symbol: string;
  company_name?: string | null;
  logo_url?: string | null;
  card_data_snapshot: ConcreteCardData; // Application expects this
  rarity_level?: string | null;
  rarity_reason?: string | null;
  first_seen_at: string;
}

// This interface represents the raw shape from Supabase join,
// where card_data_snapshot is still Json.
interface RawSupabaseSnapshot {
  id: string;
  card_type: string; // Comes as string from DB
  symbol: string;
  company_name?: string | null;
  logo_url?: string | null;
  card_data_snapshot: Json; // Comes as Json from DB
  rarity_level?: string | null;
  rarity_reason?: string | null;
  first_seen_at: string;
}

export interface ServerFetchedCollectedCard {
  user_collection_id: string;
  user_id: string;
  snapshot_id: string;
  captured_at: string;
  user_notes: string | null; // Changed from user_notes?: string | null;
  card_snapshot_data: CardSnapshotFromDB; // This will hold the correctly typed snapshot
}

export default async function CollectionPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please log in to view your collection.");
  }

  // Fetch user collection entries and the associated card snapshot data.
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

  const serverCollectedCards: ServerFetchedCollectedCard[] =
    userCollectionEntries
      ?.map((entry) => {
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

        const appTypedSnapshot: CardSnapshotFromDB = {
          id: rawSnapshotFromDB.id,
          card_type: rawSnapshotFromDB.card_type as CardType,
          symbol: rawSnapshotFromDB.symbol,
          company_name: rawSnapshotFromDB.company_name,
          logo_url: rawSnapshotFromDB.logo_url,
          card_data_snapshot:
            rawSnapshotFromDB.card_data_snapshot as unknown as ConcreteCardData,
          rarity_level: rawSnapshotFromDB.rarity_level,
          rarity_reason: rawSnapshotFromDB.rarity_reason,
          first_seen_at: rawSnapshotFromDB.first_seen_at,
        };

        if (
          appTypedSnapshot.card_type !==
          appTypedSnapshot.card_data_snapshot.type
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
          user_notes: entry.user_notes, // This is string | null from DB
          card_snapshot_data: appTypedSnapshot,
        };
      })
      // The type predicate now correctly aligns.
      .filter((card): card is ServerFetchedCollectedCard => card !== null) ||
    [];

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
