// src/components/game/ActiveCards.tsx
"use client";

import React from "react";
import GameCard from "@/components/game/GameCard";
import type { DisplayableCard } from "./types";
import type { OnGenericInteraction } from "./cards/base-card/base-card.types";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ActiveCardsProps {
  cards: DisplayableCard[];
  onToggleFlipCard: (id: string) => void;
  onDeleteCardRequest: (id: string) => void;
  cardIdToConfirmDelete: string | null;
  onConfirmDeletion: () => void;
  onCancelDeletion: () => void;
  onGenericInteraction: OnGenericInteraction;
  // NEW PROPS
  isSelectionMode: boolean;
  selectedDataItems: SelectedDataItem[];
  onToggleItemSelection: (item: SelectedDataItem) => void;
}

export const ActiveCards: React.FC<ActiveCardsProps> = ({
  cards,
  onToggleFlipCard,
  onDeleteCardRequest,
  cardIdToConfirmDelete,
  onConfirmDeletion,
  onCancelDeletion,
  onGenericInteraction,
  // NEW PROPS
  isSelectionMode,
  selectedDataItems,
  onToggleItemSelection,
}) => {
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
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
    <div className="flex-grow p-4 bg-secondary/30 dark:bg-background/30 rounded-lg shadow-inner min-h-screen">
      {cards.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-15rem)]">
          <p className="text-muted-foreground text-center py-10">
            No cards in the workspace. Add one to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.id} className="flex justify-center items-start">
              <GameCard
                card={card}
                onToggleFlip={onToggleFlipCard}
                onDeleteCardRequest={onDeleteCardRequest}
                onGenericInteraction={onGenericInteraction}
                // NEW PROPS PASSED DOWN
                isSelectionMode={isSelectionMode}
                selectedDataItems={selectedDataItems}
                onToggleItemSelection={onToggleItemSelection}
              />
            </div>
          ))}
        </div>
      )}

      {cardIdToConfirmDelete && (
        <AlertDialog
          open={!!cardIdToConfirmDelete}
          onOpenChange={(open) => {
            if (!open) onCancelDeletion();
          }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Card?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will remove the card from your workspace. It can be
                added again later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={onCancelDeletion}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirmDeletion}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};
