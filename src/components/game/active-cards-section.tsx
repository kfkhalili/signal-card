"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  PriceGameCard,
  PriceCardFaceData,
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
        symbol: pfData.symbol, // Populate symbol for the signal card
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
        symbol: fData.symbol, // Populate symbol
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
      if (fData.price == null) {
        // lValue is a number, so lValue == null is always false
        toast({ title: "Data Incomplete", variant: "destructive" });
        return;
      }
      const diff = Math.abs(fData.price - lValue);

      const nSC: PriceRangeContextSignal = {
        id: uuidv4(),
        type: "price_range_context",
        symbol: fData.symbol, // Populate symbol
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
        symbol: fData.symbol, // Populate symbol
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
    () =>
      // cardClickedOn: DisplayableCard // The card that triggered the snapshot action
      {
        // Snapshot action always captures the current live PriceGameCard
        const livePriceCard = activeCards.find((c) => c.type === "price") as
          | PriceGameCard
          | undefined;

        if (
          !livePriceCard ||
          !livePriceCard.faceData ||
          !livePriceCard.backData
        ) {
          toast({
            title: "Snapshot Error",
            description: "Live price data not available to snapshot.",
            variant: "destructive",
          });
          return;
        }

        const newSnapSignal: PriceSnapshotSignal = {
          id: uuidv4(),
          type: "price_snapshot",
          symbol: livePriceCard.faceData.symbol, // Populate symbol from the live card being snapshotted
          snapshotFaceData: { ...livePriceCard.faceData },
          snapshotBackData: { ...livePriceCard.backData },
          discoveredAt: new Date(),
          isFlipped: false,
          backData: {
            explanation: `Snapshot of ${
              livePriceCard.faceData.symbol
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
          description: `Snapshot of ${livePriceCard.faceData.symbol} logged.`,
        });
      },
    [toast, activeCards] // Added activeCards as a dependency
  );

  return (
    <ActiveCardsPresentational
      cards={activeCards}
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
