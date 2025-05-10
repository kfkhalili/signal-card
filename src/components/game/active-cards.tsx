/**
 * src/app/components/active-cards.tsx
 *
 * This component is responsible for displaying a list of active game cards (live quotes or signals),
 * handling user interactions like flipping cards, initiating deletion (with confirmation),
 * and taking snapshots. It passes interaction callbacks down to individual GameCard components.
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import GameCard from "@/components/game/GameCard";
import type { DisplayableCard } from "./types"; // Should resolve to src/app/components/types.ts
import type { PriceCardInteractionCallbacks } from "./cards/price-card/price-card.types"; // Should resolve to src/app/components/cards/price-card/price-card.types.ts

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Assuming this is your UI library path

interface ActiveCardsProps {
  /** Array of cards to display, combining concrete card data with UI state like isFlipped. */
  readonly cards: DisplayableCard[];
  /** Callback to toggle the flipped state of a card. */
  readonly onToggleFlipCard: (id: string) => void;
  /** Callback invoked after the user confirms the deletion of a card. */
  readonly onDeleteCard: (id: string) => void;
  /** Callback to trigger a snapshot action, optionally with the ID of the card that initiated it. */
  readonly onTakeSnapshot: (cardId?: string) => void;
  /** Grouped interaction callbacks specifically for PriceCard instances. */
  readonly priceCardInteractions?: PriceCardInteractionCallbacks;
}

export const ActiveCards: React.FC<ActiveCardsProps> = ({
  cards,
  onToggleFlipCard,
  onDeleteCard,
  onTakeSnapshot,
  priceCardInteractions,
}) => {
  const [hasMounted, setHasMounted] = useState<boolean>(false);
  const [cardIdToConfirmDelete, setCardIdToConfirmDelete] = useState<
    string | null
  >(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleDeleteRequest = useCallback((cardId: string): void => {
    setCardIdToConfirmDelete(cardId);
  }, []);

  const confirmDeletion = useCallback((): void => {
    if (cardIdToConfirmDelete) {
      onDeleteCard(cardIdToConfirmDelete);
      setCardIdToConfirmDelete(null);
    }
  }, [cardIdToConfirmDelete, onDeleteCard]);

  const cancelDeletion = useCallback((): void => {
    setCardIdToConfirmDelete(null);
  }, []);

  if (!hasMounted) {
    return (
      <div className="flex-grow p-4 bg-secondary/30 rounded-lg shadow-inner min-h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground text-center py-10">
          Loading cards...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-grow p-4 bg-secondary/30 rounded-lg shadow-inner min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-foreground">
          Live Quote & Generated Signals
        </h2>
        {/* Placeholder for global actions like "Add new card" or filters */}
      </div>

      {cards.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
          {" "}
          {/* Adjusted height for empty state */}
          <p className="text-muted-foreground text-center py-10">
            No active cards or signals. Waiting for live data...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {" "}
          {/* Added gap for better spacing */}
          {cards.map((card) => (
            <div key={card.id} className="flex justify-center items-start">
              {" "}
              {/* items-start for better alignment if cards have varying heights before flipping */}
              <GameCard
                card={card}
                onToggleFlip={onToggleFlipCard}
                onDeleteCardRequest={handleDeleteRequest} // GameCard calls this to show dialog
                onTakeSnapshot={onTakeSnapshot} // GameCard can call this with its card.id
                priceCardInteractions={priceCardInteractions} // Pass through PriceCard specific interactions
              />
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!cardIdToConfirmDelete}
        onOpenChange={(open: boolean): void => {
          // Explicitly type 'open'
          if (!open) {
            cancelDeletion();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the card. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeletion}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletion}
              className="bg-red-600 hover:bg-red-700 text-destructive-foreground" // Ensure text color contrasts with bg
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

ActiveCards.displayName = "ActiveCards";
