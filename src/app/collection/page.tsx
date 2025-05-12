// src/app/collection/page.tsx
import { createClient } from "@/lib/supabase/server"; // Server client to fetch data
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import CollectionClientPage from "./CollectionClientPage"; // We'll create this next
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";

// This type will represent a row from your user_collected_cards table
// It will also include the fully parsed card_data_snapshot
export interface DisplayableCollectedCard {
  id: string; // DB row ID
  user_id: string;
  card_type: CardType;
  symbol: string;
  company_name?: string | null;
  logo_url?: string | null;
  captured_at: string; // ISO string
  card_data_snapshot: PriceCardData | ProfileCardData; // Parsed JSONB
  rarity_level?: string | null;
  rarity_reason?: string | null;
  user_notes?: string | null;
  source_card_id?: string | null;
  created_at: string; // DB row created_at

  // UI state for the collection page (managed client-side)
  isFlipped: boolean;
}

export default async function CollectionPage() {
  const cookieStore = cookies();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If you have a middleware protecting this route, this might not be strictly necessary
    // but it's good practice for server components that require auth.
    redirect("/auth?message=Please log in to view your collection.");
  }

  const { data: collectedCardsData, error } = await supabase
    .from("user_collected_cards")
    .select("*")
    .eq("user_id", user.id)
    .order("captured_at", { ascending: false });

  if (error) {
    console.error("Error fetching collected cards:", error);
    // Handle error display appropriately
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

  const displayableCollectedCards: DisplayableCollectedCard[] =
    collectedCardsData?.map((dbRow) => {
      // The card_data_snapshot from the DB is already the ConcreteCardData.
      // We just need to add the top-level DB fields and the UI state.
      const concreteCardData = dbRow.card_data_snapshot as
        | PriceCardData
        | ProfileCardData;

      return {
        id: dbRow.id, // This is the ID of the collected_card entry
        user_id: dbRow.user_id,
        card_type: dbRow.card_type as CardType,
        symbol: dbRow.symbol,
        company_name: dbRow.company_name,
        logo_url: dbRow.logo_url,
        captured_at: dbRow.captured_at,
        card_data_snapshot: concreteCardData,
        rarity_level: dbRow.rarity_level,
        rarity_reason: dbRow.rarity_reason,
        user_notes: dbRow.user_notes,
        source_card_id: dbRow.source_card_id,
        created_at: dbRow.created_at,
        isFlipped: false, // Default UI state for collection display
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
      <CollectionClientPage initialCollectedCards={displayableCollectedCards} />
    </div>
  );
}
