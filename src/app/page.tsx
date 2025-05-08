"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ActiveCardsArea from '@/components/game/active-cards-area';
import DiscoveredSignalsLog from '@/components/game/discovered-signals-log';
import type { ActiveGameCard, PriceGameCard, TrendGameCard, PriceChangeSignal, PriceCardFaceData, TrendCardFaceData } from '@/components/game/types';
import { useMockPriceFeed, type PriceData } from '@/hooks/use-mock-price-feed';
import useLocalStorage from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const FADE_DURATION_MINUTES = 10; // Default: 10-15 minutes. Using 10 for demo.
const FADE_DURATION_MS = FADE_DURATION_MINUTES * 60 * 1000;
// const FADE_DURATION_MS = 30 * 1000; // For testing: 30 seconds

export default function FinSignalGamePage() {
  const [activeCards, setActiveCards] = useLocalStorage<ActiveGameCard[]>('finSignal-activeCards', []);
  const [discoveredSignals, setDiscoveredSignals] = useLocalStorage<PriceChangeSignal[]>('finSignal-discoveredSignals', []);
  const [selectedCardsForCombine, setSelectedCardsForCombine] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { latestPriceData, priceHistory } = useMockPriceFeed();

  // Add new price card when latestPriceData changes
  useEffect(() => {
    if (latestPriceData) {
      const newPriceCardData: PriceCardFaceData = {
        symbol: 'AAPL',
        price: latestPriceData.price,
        timestamp: latestPriceData.timestamp,
      };

      setActiveCards(prevActiveCards => {
        const isDuplicate = prevActiveCards.some(card =>
          card.type === 'price' &&
          (card as PriceGameCard).faceData.symbol === newPriceCardData.symbol &&
          (card as PriceGameCard).faceData.timestamp.getTime() === newPriceCardData.timestamp.getTime()
        );

        if (!isDuplicate) {
          const newPriceCard: PriceGameCard = {
            id: uuidv4(),
            type: 'price',
            faceData: newPriceCardData,
            backData: {
              explanation: `Apple Inc.'s stock price at ${format(latestPriceData.timestamp, 'PP p')}.`,
            },
            isFlipped: false,
            isSecured: false,
            appearedAt: Date.now(),
            initialFadeDurationMs: FADE_DURATION_MS,
          };
          toast({ title: "New Price Card Appeared!", description: `AAPL: $${latestPriceData.price.toFixed(2)} at ${format(latestPriceData.timestamp, 'p')}` });
          return [...prevActiveCards, newPriceCard];
        }
        return prevActiveCards;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestPriceData]); // Only re-run when latestPriceData itself changes for new card generation logic. setActiveCards and toast are stable or used with functional updates.

  const handleSecureCard = useCallback((cardId: string) => {
    setActiveCards(prevCards =>
      prevCards.map(card =>
        card.id === cardId && card.type === 'price'
          ? { ...card, isSecured: true, isFlipped: true, appearedAt: Date.now() } // Reset appearedAt to effectively stop fade
          : card
      )
    );
    toast({ title: "Card Secured!", description: "This card will no longer fade." });
  }, [setActiveCards, toast]);

  const handleFadedOut = useCallback((cardId: string) => {
    setActiveCards(prevCards => prevCards.filter(card => card.id !== cardId));
    toast({ title: "Card Faded Out", description: "A price card was removed due to inactivity." });
  }, [setActiveCards, toast]);

  const handleExamineCard = useCallback((priceCard: PriceGameCard) => {
    if (priceHistory.length < 2) {
      toast({ title: "Not enough data", description: "Need at least two price points to determine trend.", variant: "destructive" });
      return;
    }

    const cardTimestamp = new Date(priceCard.faceData.timestamp).getTime(); // Ensure it's a Date object
    let previousPriceData: PriceData | undefined;
    
    // priceHistory is sorted newest to oldest. We need to find the first price *before* the card's timestamp.
    for (let i = 0; i < priceHistory.length; i++) {
      const historyTimestamp = new Date(priceHistory[i].timestamp).getTime();
      if (historyTimestamp < cardTimestamp) {
        previousPriceData = priceHistory[i];
        break; // Found the first price data point strictly older than the card's timestamp
      }
    }
   
    // Fallback: If the card is the OLDEST in current history, compare with the next one (if history has more than 1)
    // This might happen if the card was generated from a very old priceData that's no longer in the truncated priceHistory
    if (!previousPriceData && priceHistory.length > 1) {
        const cardIndexInHistory = priceHistory.findIndex(p => new Date(p.timestamp).getTime() === cardTimestamp);
        // If card is found and not the newest, use the next older one
        if (cardIndexInHistory !== -1 && cardIndexInHistory < priceHistory.length - 1) { 
            previousPriceData = priceHistory[cardIndexInHmmistory + 1];
        // If card is the newest (index 0) and there's at least one older, use that.
        } else if (cardIndexInHistory === 0 && priceHistory.length > 1) {
             previousPriceData = priceHistory[1];
        }
    }


    if (!previousPriceData) {
      toast({ title: "Trend Unavailable", description: "Could not find a preceding price point in recent history.", variant: "destructive" });
      return;
    }
    
    const currentPrice = priceCard.faceData.price;
    const prevPrice = previousPriceData.price;
    let trend: TrendCardFaceData['trend'];
    if (currentPrice > prevPrice) trend = 'UP';
    else if (currentPrice < prevPrice) trend = 'DOWN';
    else trend = 'FLAT';

    const newTrendCardFaceData: TrendCardFaceData = {
      symbol: 'AAPL',
      trend,
      referenceTimeStart: new Date(previousPriceData.timestamp),
      referenceTimeEnd: new Date(priceCard.faceData.timestamp),
    };

    setActiveCards(prevActiveCards => {
      const isDuplicate = prevActiveCards.some(card =>
        card.type === 'trend' &&
        (card as TrendGameCard).faceData.symbol === newTrendCardFaceData.symbol &&
        (card as TrendGameCard).faceData.trend === newTrendCardFaceData.trend &&
        new Date((card as TrendGameCard).faceData.referenceTimeStart).getTime() === newTrendCardFaceData.referenceTimeStart.getTime() &&
        new Date((card as TrendGameCard).faceData.referenceTimeEnd).getTime() === newTrendCardFaceData.referenceTimeEnd.getTime()
      );

      if (!isDuplicate) {
        const newTrendCard: TrendGameCard = {
          id: uuidv4(),
          type: 'trend',
          faceData: newTrendCardFaceData,
          backData: {
            explanation: `AAPL price went ${trend.toLowerCase()} in the interval between ${format(newTrendCardFaceData.referenceTimeStart, 'p')} (Price: $${prevPrice.toFixed(2)}) and ${format(newTrendCardFaceData.referenceTimeEnd, 'p')} (Price: $${currentPrice.toFixed(2)}).`,
          },
          isFlipped: false,
        };
        toast({ title: "Trend Card Generated!", description: `AAPL price trend: ${trend}` });
        return [...prevActiveCards, newTrendCard];
      }
      return prevActiveCards;
    });

  }, [priceHistory, setActiveCards, toast]);

  const handleSelectCardForCombine = useCallback((cardId: string) => {
    const card = activeCards.find(c => c.id === cardId);
    if (!card || card.type !== 'price' || !(card as PriceGameCard).isSecured) {
      toast({ title: "Selection Error", description: "Only secured Price Cards can be combined.", variant: "destructive" });
      return;
    }

    setSelectedCardsForCombine(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId); // Deselect
      }
      if (prev.length < 2) {
        return [...prev, cardId]; // Select
      }
      return prev; // Max 2 selected
    });
  }, [activeCards, toast]);

  const handleCombineCards = useCallback(() => {
    if (selectedCardsForCombine.length !== 2) return;

    const card1 = activeCards.find(c => c.id === selectedCardsForCombine[0]) as PriceGameCard | undefined;
    const card2 = activeCards.find(c => c.id === selectedCardsForCombine[1]) as PriceGameCard | undefined;

    if (!card1 || !card2 || card1.type !== 'price' || card2.type !== 'price') {
      toast({ title: "Combine Error", description: "Invalid cards selected for combination.", variant: "destructive" });
      setSelectedCardsForCombine([]);
      return;
    }

    // Ensure card timestamps are Date objects
    const card1Timestamp = new Date(card1.faceData.timestamp);
    const card2Timestamp = new Date(card2.faceData.timestamp);

    // Ensure card1 is earlier than card2 for consistent signal display
    const [earlierCard, laterCard] = card1Timestamp.getTime() < card2Timestamp.getTime()
      ? [card1, card2]
      : [card2, card1];

    const newSignal: PriceChangeSignal = {
      id: uuidv4(),
      symbol: 'AAPL',
      price1: earlierCard.faceData.price,
      timestamp1: new Date(earlierCard.faceData.timestamp),
      price2: laterCard.faceData.price,
      timestamp2: new Date(laterCard.faceData.timestamp),
      generatedAt: new Date(),
    };

    setDiscoveredSignals(prev => [...prev, newSignal]);
    toast({ title: "Price Change Signal Discovered!", description: `Comparing prices from ${format(newSignal.timestamp1, 'p')} and ${format(newSignal.timestamp2, 'p')}.` });
    setSelectedCardsForCombine([]); // Clear selection
  }, [selectedCardsForCombine, activeCards, setDiscoveredSignals, toast]);

  const handleToggleFlipCard = useCallback((cardId: string) => {
    setActiveCards(prevCards =>
      prevCards.map(card =>
        card.id === cardId ? { ...card, isFlipped: !card.isFlipped } : card
      )
    );
  }, [setActiveCards]);

  return (
    <div className="space-y-8">
      <ActiveCardsArea
        cards={activeCards}
        onSecureCard={handleSecureCard}
        onExamineCard={handleExamineCard}
        onFadedOut={handleFadedOut}
        selectedCardsForCombine={selectedCardsForCombine}
        onSelectCardForCombine={handleSelectCardForCombine}
        onCombineCards={handleCombineCards}
        onToggleFlipCard={handleToggleFlipCard}
      />
      <DiscoveredSignalsLog signals={discoveredSignals} />
    </div>
  );
}
