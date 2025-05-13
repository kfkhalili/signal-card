// src/components/game/ActiveCards.tsx
"use client";

import React from "react";
import GameCard from "@/components/game/GameCard"; // Ensure path is correct
import type { DisplayableCard } from "./types"; // Ensure path is correct
import type {
  BaseCardSocialInteractions,
  CardActionContext,
} from "./cards/base-card/base-card.types"; // Ensure path is correct
import type { PriceCardInteractionCallbacks } from "./cards/price-card/price-card.types"; // Ensure path is correct
import type { ProfileCardInteractionCallbacks } from "./cards/profile-card/profile-card.types"; // Ensure path is correct

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Ensure path is correct

// Define the shape for price-specific interactions passed to GameCard/PriceCardContainer
type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

// This is the props interface for the presentational component
interface ActiveCardsProps {
  cards: DisplayableCard[];
  onToggleFlipCard: (id: string) => void;
  onDeleteCardRequest: (id: string) => void;

  socialInteractions?: BaseCardSocialInteractions;
  priceSpecificInteractions?: PriceSpecificInteractionsForContainer;
  profileSpecificInteractions?: ProfileCardInteractionCallbacks; // <<< ADDED THIS PROP
  onHeaderIdentityClick?: (context: CardActionContext) => void;

  cardIdToConfirmDelete: string | null;
  onConfirmDeletion: () => void;
  onCancelDeletion: () => void;
}

export const ActiveCards: React.FC<ActiveCardsProps> = ({
  cards,
  onToggleFlipCard,
  onDeleteCardRequest,
  socialInteractions,
  priceSpecificInteractions,
  profileSpecificInteractions, // Destructure the new prop
  onHeaderIdentityClick,
  cardIdToConfirmDelete,
  onConfirmDeletion,
  onCancelDeletion,
}) => {
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // This helps prevent hydration mismatches if cards are loaded from localStorage
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
      {/* Header for the section can be added here if needed, or kept in WorkspacePage */}
      {/* Example:
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-foreground">
          Active Cards
        </h2>
      </div>
      */}

      {cards.length === 0 ? (
        // This empty state might be better handled by WorkspacePage if this component is purely for displaying cards
        <div className="flex items-center justify-center h-[calc(100vh-15rem)]">
          {" "}
          {/* Adjusted height */}
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
                socialInteractions={socialInteractions}
                priceSpecificInteractions={priceSpecificInteractions}
                profileSpecificInteractions={profileSpecificInteractions} // <<< PASSING IT DOWN
                onHeaderIdentityClick={onHeaderIdentityClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Deletion */}
      {cardIdToConfirmDelete && ( // Ensure dialog only renders when needed
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
