// src/app/history/page.tsx

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HistorySelectionForm } from "@/components/comments/HistorySelectionForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";

export interface SymbolAndTypes {
  symbol: string;
  card_types: string[]; // e.g., ["price", "profile"]
}

async function getAvailableHistorySelections(): Promise<SymbolAndTypes[]> {
  const supabase = await createSupabaseServerClient();

  // Fetch all relevant symbol and card_type combinations
  // This is less efficient than an RPC for very large datasets, but will work.
  // For production with many snapshots, consider creating a database function (RPC)
  // to get distinct symbols and their associated card_types more efficiently.
  const { data: allSnapshots, error: allSnapshotsError } = await supabase
    .from("card_snapshots")
    .select("symbol, card_type") // Select only the columns needed
    .order("symbol")
    .order("card_type");

  if (allSnapshotsError) {
    console.error(
      "Error fetching snapshots for distinct processing:",
      allSnapshotsError
    );
    return [];
  }

  if (!allSnapshots || allSnapshots.length === 0) {
    return [];
  }

  // Process in JavaScript to get unique symbols and their card types
  const symbolMap = new Map<string, Set<string>>();
  allSnapshots.forEach((snapshot) => {
    if (!snapshot.symbol || !snapshot.card_type) return; // Skip if essential data is missing

    if (!symbolMap.has(snapshot.symbol)) {
      symbolMap.set(snapshot.symbol, new Set());
    }
    symbolMap.get(snapshot.symbol)!.add(snapshot.card_type);
  });

  const results: SymbolAndTypes[] = [];
  for (const [symbol, typesSet] of symbolMap) {
    results.push({ symbol, card_types: Array.from(typesSet).sort() });
  }
  // Ensure the final list of symbols is also sorted
  results.sort((a, b) => a.symbol.localeCompare(b.symbol));

  return results;
}

export default async function HistoryLandingPage() {
  const availableSelections = await getAvailableHistorySelections();

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">
          Signal History Explorer
        </h1>
        <Link
          href="/workspace"
          className="text-sm text-primary hover:underline">
          &larr; Back to Workspace
        </Link>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Select History to View</CardTitle>
          <CardDescription>
            Choose a symbol and the type of card history you want to explore.
            Only options with existing snapshots are shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableSelections.length > 0 ? (
            <HistorySelectionForm availableSelections={availableSelections} />
          ) : (
            <p className="text-muted-foreground text-center">
              No historical snapshots found yet. Start creating some signals!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
