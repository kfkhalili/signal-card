// src/app/collection/page.tsx
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import CollectionClientPage from "./CollectionClientPage";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { ConcreteCardData } from "@/components/game/types"; // Import ConcreteCardData

// Define the structure of the data passed from Server to Client
// This combines the DB row data with the fully typed snapshot
export interface ServerFetchedCollectedCard {
  // DB Row fields
  id: string; // user_collected_cards.id
  user_id: string;
  card_type: CardType;
  symbol: string;
  company_name?: string | null;
  logo_url?: string | null;
  captured_at: string; // ISO string
  card_data_snapshot: ConcreteCardData; // Parsed JSONB object (PriceCardData | ProfileCardData)
  rarity_level?: string | null;
  rarity_reason?: string | null;
}

export default async function CollectionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please log in to view your collection.");
  }

  // Fetch only the columns needed for ServerFetchedCollectedCard
  const { data: collectedCardsData, error } = await supabase
    .from("user_collected_cards")
    .select(
      "id, user_id, card_type, symbol, company_name, logo_url, captured_at, card_data_snapshot, rarity_level, rarity_reason" // Select specific columns
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

  // Map directly to ServerFetchedCollectedCard
  const serverCollectedCards: ServerFetchedCollectedCard[] =
    collectedCardsData?.map((dbRow) => {
      // Assert the type of the snapshot fetched from the DB
      const concreteCardData = dbRow.card_data_snapshot as ConcreteCardData;

      // Ensure card_type from DB matches the type within the snapshot
      if (dbRow.card_type !== concreteCardData.type) {
        console.warn(
          `Mismatch between dbRow.card_type (${dbRow.card_type}) and snapshot.type (${concreteCardData.type}) for card ID ${dbRow.id}. Using dbRow.card_type.`
        );
        // Potentially log this mismatch more formally or handle it
      }

      return {
        id: dbRow.id,
        user_id: dbRow.user_id,
        card_type: dbRow.card_type as CardType,
        symbol: dbRow.symbol,
        company_name: dbRow.company_name,
        logo_url: dbRow.logo_url,
        captured_at: dbRow.captured_at,
        card_data_snapshot: concreteCardData,
        rarity_level: dbRow.rarity_level,
        rarity_reason: dbRow.rarity_reason,
      };
    }) || [];

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">My Card Collection</h1>
        <Link href="/" className="text-sm text-primary hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>
      {/* Pass the new structure to the client */}
      <CollectionClientPage initialCollectedCards={serverCollectedCards} />
    </div>
  );
}
