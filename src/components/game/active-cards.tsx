"use client";

import React, { useState, useEffect } from "react";
import GameCard from "./game-card";
import type { DisplayableCard } from "./types";
import { PriceCardFaceData } from "./cards/PriceCard/types";

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
  onDeleteCard: (id: string) => void;
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
  onTakeSnapshot?: () => void; // Changed signature
}

export const ActiveCards: React.FC<ActiveCardsProps> = ({
  cards,
  onToggleFlipCard,
  onDeleteCard,
  onGenerateDailyPerformanceSignal,
  onGeneratePriceVsSmaSignal,
  onGeneratePriceRangeContextSignal,
  onGenerateIntradayTrendSignal,
  onTakeSnapshot,
}) => {
  const [hasMounted, setHasMounted] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
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
        </div>
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

      {cards.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
          <p className="text-muted-foreground text-center py-10">
            No active card or signals. Waiting for live data...
          </p>
        </div>
      ) : (
        // Removed gap from grid, will rely on margin from card wrappers.
        // The grid will lay out the wrapper divs.
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {cards.map((card) => (
            // Added a wrapper div around GameCard to apply margin for spacing.
            // m-2 provides 0.5rem margin on all sides.
            // This means 0.5rem from one card + 0.5rem from the next = 1rem space between them.
            // flex justify-center items-center ensures the GameCard is centered within this wrapper.
            <div key={card.id} className="flex justify-center items-center m-2">
              <GameCard
                card={card}
                onToggleFlip={onToggleFlipCard}
                onDeleteCard={onDeleteCard}
                onGenerateDailyPerformanceSignal={
                  onGenerateDailyPerformanceSignal
                }
                onGeneratePriceVsSmaSignal={onGeneratePriceVsSmaSignal}
                onGeneratePriceRangeContextSignal={
                  onGeneratePriceRangeContextSignal
                }
                onGenerateIntradayTrendSignal={onGenerateIntradayTrendSignal}
                onTakeSnapshot={onTakeSnapshot} // Pass onTakeSnapshot prop
              />
            </div>
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
