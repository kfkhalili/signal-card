/**
 * src/app/components/active-cards-section.tsx
 *
 * This "smart" component manages the state and logic for active cards,
 * including handling interactions, creating snapshots, and managing card lifecycle.
 * It uses ActiveCardsPresentational for rendering.
 */
"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import type { DisplayableCard } from "./types"; // Path: src/app/components/types.ts
import { ActiveCards as ActiveCardsPresentational } from "./active-cards"; // Path: src/app/components/active-cards.tsx
import { useToast } from "@/hooks/use-toast"; // Assuming path to your toast hook

import type {
  PriceCardData,
  PriceCardSnapshotData,
  PriceCardInteractionCallbacks,
} from "./cards/price-card/price-card.types"; // Path: src/app/components/cards/price-card/price-card.types.ts

interface ActiveCardsSectionProps {
  /** The current list of active cards. */
  readonly activeCards: DisplayableCard[];
  /** Function to update the list of active cards. */
  readonly setActiveCards: React.Dispatch<
    React.SetStateAction<DisplayableCard[]>
  >;
}

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
}) => {
  const { toast } = useToast();

  // Using a ref for setActiveCards to keep callbacks stable if setActiveCards itself isn't memoized by parent.
  // React's setState from useState is stable, so this is often for ESLint rules or complex scenarios.
  const setActiveCardsRef = useRef(setActiveCards);
  useEffect(() => {
    setActiveCardsRef.current = setActiveCards;
  }, [setActiveCards]);

  const handleToggleFlipCard = useCallback((cardId: string): void => {
    setActiveCardsRef.current((prevCards) =>
      prevCards.map((c) =>
        c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c
      )
    );
  }, []); // No dependency on setActiveCards due to ref

  const handleDeleteCard = useCallback(
    (cardIdToDelete: string): void => {
      setActiveCardsRef.current((prevCards) =>
        prevCards.filter((card) => card.id !== cardIdToDelete)
      );
      toast({
        title: "Card Removed",
        description: "The signal card has been removed.",
      });
    },
    [toast] // No dependency on setActiveCards due to ref
  );

  // Grouped PriceCard interaction handlers
  const priceCardInteractionHandlers: PriceCardInteractionCallbacks = {
    onPriceCardSmaClick: useCallback(
      (card: PriceCardData, smaPeriod: 50 | 200, smaValue: number): void => {
        console.log("PriceCard SMA Click:", {
          cardSymbol: card.symbol,
          smaPeriod,
          smaValue,
        });
        toast({
          title: "SMA Interaction",
          description: `${smaPeriod}D SMA of ${smaValue.toFixed(
            2
          )} clicked on ${card.symbol}.`,
        });
        // Example: Generate a new card based on this interaction
        // const newCard = { id: uuidv4(), type: "some_signal", symbol: card.symbol, createdAt: Date.now(), ... };
        // setActiveCardsRef.current(prev => [...prev, newCard]);
      },
      [toast]
    ),
    onPriceCardRangeContextClick: useCallback(
      (
        card: PriceCardData,
        levelType: "High" | "Low",
        levelValue: number
      ): void => {
        console.log("PriceCard Range Context Click:", {
          cardSymbol: card.symbol,
          levelType,
          levelValue,
        });
        toast({
          title: "Range Interaction",
          description: `Day ${levelType} of ${levelValue.toFixed(
            2
          )} clicked on ${card.symbol}.`,
        });
      },
      [toast]
    ),
    onPriceCardOpenPriceClick: useCallback(
      (card: PriceCardData): void => {
        console.log("PriceCard Open Price Click:", { cardSymbol: card.symbol });
        toast({
          title: "Open Price Interaction",
          description: `Open price ${
            card.faceData.dayOpen?.toFixed(2) ?? "N/A"
          } clicked on ${card.symbol}.`,
        });
      },
      [toast]
    ),
    onPriceCardGenerateDailyPerformanceSignal: useCallback(
      (card: PriceCardData): void => {
        console.log("PriceCard Generate Daily Performance Signal:", {
          cardSymbol: card.symbol,
        });
        toast({
          title: "Daily Perf Signal",
          description: `Daily performance signal generated for ${card.symbol}.`,
        });
      },
      [toast]
    ),
  };

  const handleTakeSnapshot = useCallback(
    (cardIdToSnapshot?: string): void => {
      const cardToSnapshot = cardIdToSnapshot
        ? activeCards.find(
            (c) => c.id === cardIdToSnapshot && c.type === "price"
          )
        : activeCards.find((c) => c.type === "price"); // Fallback to the first live price card

      const livePriceCard =
        cardToSnapshot?.type === "price"
          ? (cardToSnapshot as PriceCardData & { isFlipped: boolean }) // Type assertion after check
          : undefined;

      if (!livePriceCard || livePriceCard.faceData.price === null) {
        toast({
          title: "Snapshot Error",
          description: livePriceCard
            ? "Live price is not available to snapshot."
            : "Live price card not found to snapshot.",
          variant: "destructive",
        });
        return;
      }

      const currentTime = Date.now();

      // Constructing the new snapshot with the correct structure for PriceCardSnapshotData
      const newSnapshot: PriceCardSnapshotData & { isFlipped: boolean } = {
        // BaseCardData fields
        id: uuidv4(),
        type: "price_snapshot",
        symbol: livePriceCard.symbol,
        createdAt: currentTime, // All cards now have createdAt

        // PriceCardSnapshotData specific fields
        capturedPrice: livePriceCard.faceData.price, // Known to be non-null from the check above
        snapshotTime: currentTime, // Timestamp of when the data for the snapshot was captured

        // PriceCardSnapshotData requires backData of type PriceCardSnapshotSpecificBackData
        backData: {
          explanation: `Snapshot of ${livePriceCard.symbol} taken on ${new Date(
            currentTime
          ).toLocaleString()}.`,
          // discoveredReason: "User-initiated snapshot", // Optional: if you define this in PriceCardSnapshotSpecificBackData
        },

        // DisplayableCardState field
        isFlipped: false, // Snapshots start unflipped
      };

      setActiveCardsRef.current((prevCards) => {
        const mainPriceCardIndex = prevCards.findIndex(
          (c) => c.id === livePriceCard.id
        );
        if (mainPriceCardIndex !== -1) {
          // Insert the snapshot card immediately after its source live card
          const newCardsList = [...prevCards];
          newCardsList.splice(mainPriceCardIndex + 1, 0, newSnapshot);
          return newCardsList;
        }
        // Fallback: if the source card wasn't found (e.g., deleted just before snapshot), add to start
        return [newSnapshot, ...prevCards];
      });

      toast({
        title: "Snapshot Taken!",
        description: `Snapshot of ${livePriceCard.symbol} created.`,
      });
    },
    [activeCards, toast] // activeCards is a dependency for finding the card to snapshot
  );

  return (
    <ActiveCardsPresentational
      cards={activeCards}
      onToggleFlipCard={handleToggleFlipCard}
      onDeleteCard={handleDeleteCard}
      priceCardInteractions={priceCardInteractionHandlers}
      onTakeSnapshot={handleTakeSnapshot}
    />
  );
};

export default ActiveCardsSection;
