"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  PriceGameCard,
  PriceCardFaceData,
  DiscoveredCard,
  DailyPerformanceSignal,
  PriceVsSmaSignal,
  PriceRangeContextSignal,
  IntradayTrendSignal,
  PriceSnapshotSignal,
  DisplayableCard,
} from "./types";
import { ActiveCards as ActiveCardsPresentational } from "./active-cards"; // Changed to named import with alias
import { useToast } from "@/hooks/use-toast";

interface ActiveCardsSectionProps {
  activeCards: DisplayableCard[];
  setActiveCards: React.Dispatch<React.SetStateAction<DisplayableCard[]>>;
}

// This helper is for sorting DiscoveredCard types if they were in a separate list.
// If all cards (live + signals) are in activeCards and need specific sorting, this might need adjustment.
// For now, signal cards are just prepended/appended to activeCards.
const getDiscoveredCardSortDate = (card: DiscoveredCard): Date => {
  // price_discovery and price_change are deprecated and removed from DiscoveredCard union
  return (
    card as
      | DailyPerformanceSignal
      | PriceVsSmaSignal
      | PriceRangeContextSignal
      | IntradayTrendSignal
      | PriceSnapshotSignal
  ).discoveredAt; // Standardized to discoveredAt
};

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
}) => {
  const { toast } = useToast();

  const setActiveCardsRef = useRef(setActiveCards);
  useEffect(() => {
    setActiveCardsRef.current = setActiveCards;
  }, [setActiveCards]);

  const handleToggleFlipCard = useCallback((cardId: string) => {
    setActiveCardsRef.current((prevCards) => {
      const newCards = prevCards.map((c) =>
        c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c
      );
      return newCards;
    });
  }, []);

  const handleFadedOut = useCallback((cardId: string) => {
    console.log(
      `ActiveCardsSection: handleFadedOut called for ${cardId} - card should not fade.`
    );
  }, []);

  // --- NEW HANDLER for Deleting a Card ---
  const handleDeleteCard = useCallback(
    (cardIdToDelete: string) => {
      console.log(
        `ActiveCardsSection: handleDeleteCard called for ID: ${cardIdToDelete}`
      );
      setActiveCardsRef.current((prevCards) =>
        prevCards.filter((card) => card.id !== cardIdToDelete)
      );
      toast({
        title: "Card Removed",
        description: "The signal card has been removed.",
      });
    },
    [toast]
  ); // setActiveCards is via ref

  // --- Signal Generation Handlers update activeCards ---
  const handleGenerateDailyPerformanceSignal = useCallback(
    (pfData: PriceCardFaceData) => {
      if (
        pfData.price == null ||
        pfData.previousClose == null ||
        pfData.dayChange == null ||
        pfData.changePercentage == null
      ) {
        toast({ title: "Data Incomplete", variant: "destructive" });
        return;
      }

      const nSC: DailyPerformanceSignal = {
        id: uuidv4(),
        type: "daily_performance",
        // symbol: pfData.symbol, // Symbol is part of PriceCardFaceData, not directly on DailyPerformanceSignal
        // It will be part of the explanation or context, but not a direct prop of the signal card itself.
        // If needed, it should be added to the DailyPerformanceSignal type.
        // For now, assuming it's implicitly known or part of backData.explanation.
        currentPrice: pfData.price,
        previousClose: pfData.previousClose,
        dayChange: pfData.dayChange,
        changePercentage: pfData.changePercentage,
        // quoteTimestamp: new Date(pfData.timestamp), // This info is now part of discoveredAt or within backData
        discoveredAt: new Date(),
        isFlipped: false,
        backData: {
          explanation: `Daily performance for ${pfData.symbol} as of ${new Date(
            pfData.timestamp
          ).toLocaleTimeString()}`,
        },
      };
      setActiveCardsRef.current((prev) => [prev[0], nSC, ...prev.slice(1)]);
      toast({
        title: "Signal Discovered!",
        description: `Daily Performance logged.`,
      });
    },
    [toast]
  );

  const handleGeneratePriceVsSmaSignal = useCallback(
    (fData: PriceCardFaceData, smaP: 50 | 200, smaV: number) => {
      if (fData.price == null) {
        toast({ title: "Data Incomplete", variant: "destructive" });
        return;
      }

      const nSC: PriceVsSmaSignal = {
        id: uuidv4(),
        type: "price_vs_sma",
        // symbol: fData.symbol, // Similar to DailyPerformanceSignal, symbol is contextual
        currentPrice: fData.price,
        smaValue: smaV,
        smaPeriod: smaP,
        priceRelation:
          fData.price > smaV ? "above" : fData.price < smaV ? "below" : "at",
        // quoteTimestamp: new Date(fData.timestamp),
        discoveredAt: new Date(),
        isFlipped: false,
        backData: {
          explanation: `${fData.symbol} price vs ${smaP}D SMA at ${new Date(
            fData.timestamp
          ).toLocaleTimeString()}`,
        },
      };
      setActiveCardsRef.current((prev) => [prev[0], nSC, ...prev.slice(1)]);
      toast({
        title: "SMA Signal Discovered!",
        description: `Price vs ${smaP}D SMA logged.`,
      });
    },
    [toast]
  );

  const handleGeneratePriceRangeContextSignal = useCallback(
    (fData: PriceCardFaceData, lType: "High" | "Low", lValue: number) => {
      if (fData.price == null || lValue == null) {
        toast({ title: "Data Incomplete", variant: "destructive" });
        return;
      }
      const diff = Math.abs(fData.price - lValue);

      const nSC: PriceRangeContextSignal = {
        id: uuidv4(),
        type: "price_range_context",
        // symbol: fData.symbol,
        currentPrice: fData.price,
        dayHigh: lType === "High" ? lValue : null, // Assuming fData contains dayHigh/Low for full context
        dayLow: lType === "Low" ? lValue : null, // Or adjust based on what fData provides
        // This signal might need more context from fData
        // levelType: lType, // This is now part of the structure (dayHigh/dayLow)
        // levelValue: lValue,
        // difference: diff, // Can be calculated in the rendering if needed
        discoveredAt: new Date(),
        isFlipped: false,
        backData: {
          explanation: `${
            fData.symbol
          } price context vs Day ${lType} at ${new Date(
            fData.timestamp
          ).toLocaleTimeString()}`,
        },
      };
      setActiveCardsRef.current((prev) => [prev[0], nSC, ...prev.slice(1)]);
      toast({
        title: "Range Signal Discovered!",
        description: `Price vs Day ${lType} logged.`,
      });
    },
    [toast]
  );

  const handleGenerateIntradayTrendSignal = useCallback(
    (fData: PriceCardFaceData) => {
      if (fData.price == null || fData.dayOpen == null) {
        toast({ title: "Data Incomplete", variant: "destructive" });
        return;
      }
      let rel: "Above" | "Below" | "At";
      if (fData.price > fData.dayOpen) rel = "Above";
      else if (fData.price < fData.dayOpen) rel = "Below";
      else rel = "At";

      const nSC: IntradayTrendSignal = {
        id: uuidv4(),
        type: "intraday_trend",
        // symbol: fData.symbol,
        // currentPrice: fData.price, // These would be part of observedTrendDescription or specific fields
        // openPrice: fData.dayOpen,
        // relationToOpen: rel,
        observedTrendDescription: `Price ${fData.price.toFixed(
          2
        )} is ${rel.toLowerCase()} open price ${fData.dayOpen.toFixed(2)} for ${
          fData.symbol
        }.`,
        // quoteTimestamp: new Date(fData.timestamp),
        discoveredAt: new Date(),
        isFlipped: false,
        backData: {
          explanation: `Intraday trend for ${
            fData.symbol
          } relative to open at ${new Date(
            fData.timestamp
          ).toLocaleTimeString()}`,
        },
      };
      setActiveCardsRef.current((prev) => [prev[0], nSC, ...prev.slice(1)]);
      toast({
        title: "Intraday Trend Signal!",
        description: `Price vs Open logged.`,
      });
    },
    [toast]
  );

  const handleTakeSnapshot = useCallback(
    (priceCard: PriceGameCard) => {
      if (!priceCard || !priceCard.faceData || !priceCard.backData) {
        toast({ title: "Snapshot Error", variant: "destructive" });
        return;
      }

      const newSnapSignal: PriceSnapshotSignal = {
        id: uuidv4(),
        type: "price_snapshot",
        // symbol: priceCard.faceData.symbol, // Symbol is in snapshotFaceData
        snapshotFaceData: { ...priceCard.faceData },
        snapshotBackData: { ...priceCard.backData },
        // quoteTimestamp: new Date(priceCard.faceData.timestamp), // Timestamp is in snapshotFaceData
        discoveredAt: new Date(),
        isFlipped: false,
        backData: {
          explanation: `Snapshot of ${
            priceCard.faceData.symbol
          } taken at ${new Date().toLocaleTimeString()}`,
        },
      };
      setActiveCardsRef.current((prev) => [
        prev[0],
        newSnapSignal,
        ...prev.slice(1),
      ]);
      toast({
        title: "Snapshot Taken!",
        description: `Snapshot of ${priceCard.faceData.symbol} logged.`,
      });
    },
    [toast]
  );

  return (
    <ActiveCardsPresentational
      cards={activeCards}
      onFadedOut={handleFadedOut}
      onToggleFlipCard={handleToggleFlipCard}
      onDeleteCard={handleDeleteCard} // Pass new handler
      onGenerateDailyPerformanceSignal={handleGenerateDailyPerformanceSignal}
      onGeneratePriceVsSmaSignal={handleGeneratePriceVsSmaSignal}
      onGeneratePriceRangeContextSignal={handleGeneratePriceRangeContextSignal}
      onGenerateIntradayTrendSignal={handleGenerateIntradayTrendSignal}
      onTakeSnapshot={handleTakeSnapshot}
    />
  );
};

export default ActiveCardsSection;
