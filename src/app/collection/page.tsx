// src/app/collection/page.tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import CollectionClientPage from "./CollectionClientPage";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { ConcreteCardData } from "@/components/game/types";

// Define the structure of a snapshot as fetched from the 'card_snapshots' table
interface CardSnapshotFromDB {
  id: string; // This is the snapshot_id (UUID) from card_snapshots table
  card_type: CardType;
  symbol: string;
  company_name?: string | null;
  logo_url?: string | null;
  card_data_snapshot: ConcreteCardData; // Parsed JSONB object
  rarity_level?: string | null;
  rarity_reason?: string | null;
  first_seen_at: string; // ISO string for timestamp
}

// Define the structure of the data passed from Server to Client
export interface ServerFetchedCollectedCard {
  user_collection_id: string; // The ID of the entry in user_collections (UUID)
  user_id: string;
  snapshot_id: string;
  captured_at: string;
  user_notes?: string | null;
  card_snapshot_data: CardSnapshotFromDB;
}

export default async function CollectionPage() {
  const supabase = await createClient();

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

  const serverCollectedCards: ServerFetchedCollectedCard[] =
    (userCollectionEntries
      ?.map((entry) => {
        // --- Corrected Handling ---
        // Supabase might return card_snapshots as an array or an object depending on the join.
        // If it's a to-one relationship, it's often an object. If it could be many, it's an array.
        // Given snapshot_id is a direct FK to card_snapshots.id (PK), it should be one.
        // However, the type inference suggests it might be an array.
        let snapshotData: CardSnapshotFromDB | null = null;
        if (Array.isArray(entry.card_snapshots)) {
          if (entry.card_snapshots.length > 0) {
            snapshotData = entry.card_snapshots[0] as CardSnapshotFromDB;
          }
        } else if (entry.card_snapshots) {
          // If it's already an object (and not null)
          snapshotData = entry.card_snapshots as CardSnapshotFromDB;
        }
        // --- End Corrected Handling ---

        if (!snapshotData) {
          console.warn(
            `Collection entry ${entry.id} is missing its card snapshot data. Skipping.`
          );
          return null;
        }

        const concreteCardData =
          snapshotData.card_data_snapshot as ConcreteCardData;

        if (snapshotData.card_type !== concreteCardData.type) {
          console.warn(
            `Data inconsistency: snapshotData.card_type (${snapshotData.card_type}) vs. concreteCardData.type (${concreteCardData.type}) for snapshot ID ${snapshotData.id}. Using snapshotData.card_type.`
          );
        }

        const correctlyTypedSnapshot: CardSnapshotFromDB = {
          ...snapshotData,
          card_data_snapshot: concreteCardData,
          card_type: snapshotData.card_type as CardType,
        };

        return {
          user_collection_id: entry.id,
          user_id: entry.user_id,
          snapshot_id: entry.snapshot_id,
          captured_at: entry.captured_at,
          user_notes: entry.user_notes,
          card_snapshot_data: correctlyTypedSnapshot,
        };
      })
      .filter(Boolean) as ServerFetchedCollectedCard[]) || [];

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
