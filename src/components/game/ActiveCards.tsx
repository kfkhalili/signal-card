// src/components/game/active-cards.tsx
"use client";

import React from "react";
import GameCard from "@/components/game/GameCard";
import type { DisplayableCard } from "./types";
import type {
  BaseCardSocialInteractions,
  CardActionContext,
} from "./cards/base-card/base-card.types";
import type { PriceCardInteractionCallbacks } from "./cards/price-card/price-card.types";
import type { ProfileCardInteractionCallbacks } from "./cards/profile-card/profile-card.types"; // Import this

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
  onHeaderIdentityClick?: (context: CardActionContext) => void; // <<< ADDED THIS PROP

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
  profileSpecificInteractions, // Destructure
  onHeaderIdentityClick, // Destructure
  cardIdToConfirmDelete,
  onConfirmDeletion,
  onCancelDeletion,
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
    <div className="flex-grow p-4 bg-secondary/30 rounded-lg shadow-inner min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-foreground">
          Active Cards & Signals
        </h2>
      </div>

      {cards.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
          <p className="text-muted-foreground text-center py-10">
            No active cards. Click a Price Card header to load a profile.
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
                profileSpecificInteractions={profileSpecificInteractions} // Pass down
                onHeaderIdentityClick={onHeaderIdentityClick} // Pass down
              />
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!cardIdToConfirmDelete}
        onOpenChange={(open) => {
          if (!open) onCancelDeletion();
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the card.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelDeletion}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDeletion}
              className="bg-red-600 hover:bg-red-700 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
