"use client";

import React, { useState, useEffect } from "react";
import GameCard from "./game-card";
import type {
  DisplayableCard,
  PriceCardFaceData,
  PriceGameCard,
} from "./types";

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
  cards: DisplayableCard[]; // Changed from initialCards to cards, and type to DisplayableCard[]
  onToggleFlipCard: (id: string) => void;
  onDeleteCard: (id: string) => void;
  onFadedOut: (id: string) => void;
  // Add the new signal generation props from ActiveCardsSectionProps
  onGenerateDailyPerformanceSignal?: (priceCardData: PriceCardFaceData) => void;
  onGeneratePriceVsSmaSignal?: (
    faceData: PriceCardFaceData,
    smaPeriod: 50 | 200,
    smaValue: number
  ) => void;
  onGeneratePriceRangeContextSignal?: (
    faceData: PriceCardFaceData,
    levelType: "High" | "Low",
    levelValue: number
  ) => void;
  onGenerateIntradayTrendSignal?: (faceData: PriceCardFaceData) => void;
  onTakeSnapshot?: (card: PriceGameCard) => void;
}

export const ActiveCards: React.FC<ActiveCardsProps> = ({
  cards, // Destructured 'cards' prop
  onToggleFlipCard,
  onDeleteCard,
  onFadedOut,
  // Destructure the new props
  onGenerateDailyPerformanceSignal,
  onGeneratePriceVsSmaSignal,
  onGeneratePriceRangeContextSignal,
  onGenerateIntradayTrendSignal,
  onTakeSnapshot,
}) => {
  // Removed: const [cards, setCards] = useLocalStorage<Card[]>('activeCards', initialCards);
  const [hasMounted, setHasMounted] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null); // This local state is for the delete confirmation dialog

  // Removed: const setCardsRef = useRef(setCards);
  // Removed: useEffect for setCardsRef

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // ... loading state ...
    return (
      <div className="flex-grow p-4 bg-secondary/30 rounded-lg shadow-inner min-h-[400px]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold text-foreground">
              Active Cards & Signals
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
          <p className="col-span-full text-muted-foreground text-center py-10">
            Loading cards...
          </p>
        </div>{" "}
        {/* Changed gap to gap-10 */}
      </div>
    );
  }

  return (
    <div className="flex-grow p-4 bg-secondary/30 rounded-lg shadow-inner min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Live Quote & Generated Signals
          </h2>
        </div>
      </div>

      {/* Render using the 'cards' prop */}
      {cards.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
          <p className="text-muted-foreground text-center py-10">
            No active card or signals. Waiting for live data...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
          {" "}
          {/* Changed gap to gap-10 */}
          {cards.map((card) => (
            <GameCard
              key={card.id}
              card={card}
              onFadedOut={onFadedOut}
              onToggleFlip={onToggleFlipCard}
              onDeleteCard={onDeleteCard}
              // Pass down the new signal generation props to GameCard
              onGenerateDailyPerformanceSignal={
                onGenerateDailyPerformanceSignal
              }
              onGeneratePriceVsSmaSignal={onGeneratePriceVsSmaSignal}
              onGeneratePriceRangeContextSignal={
                onGeneratePriceRangeContextSignal
              }
              onGenerateIntradayTrendSignal={onGenerateIntradayTrendSignal}
              onTakeSnapshot={onTakeSnapshot}
            />
          ))}
        </div>
      )}
      <AlertDialog
        open={!!cardToDelete}
        onOpenChange={(open) => !open && setCardToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the card.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCardToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cardToDelete) {
                  // The actual deletion logic is handled by the onDeleteCard prop passed from the parent
                  onDeleteCard(cardToDelete);
                  setCardToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
