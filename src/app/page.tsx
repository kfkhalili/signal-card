"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ActiveCardsArea from '@/components/game/active-cards-area';
import DiscoveredSignalsLog from '@/components/game/discovered-signals-log';
import type { ActiveGameCard, PriceGameCard, TrendGameCard, PriceChangeSignal, PriceCardFaceData, TrendCardFaceData, DiscoveredSignal, PriceDiscoverySignal } from '@/components/game/types';
import { useMockPriceFeed, type PriceData } from '@/hooks/use-mock-price-feed';
import useLocalStorage from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const FADE_DURATION_MINUTES = 10; // Default: 10-15 minutes. Using 10 for demo.
const FADE_DURATION_MS = FADE_DURATION_MINUTES * 60 * 1000;
// const FADE_DURATION_MS = 30 * 1000; // For testing: 30 seconds

export default function FinSignalGamePage() {
  const [activeCards, setActiveCards] = useLocalStorage<ActiveGameCard[]>('finSignal-activeCards', []);
  const [discoveredSignals, setDiscoveredSignals] = useLocalStorage<DiscoveredSignal[]>('finSignal-discoveredSignals', []);
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
          new Date((card as PriceGameCard).faceData.timestamp).getTime() === new Date(newPriceCardData.timestamp).getTime()
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
  }, [latestPriceData]); 

  const handleSecureCard = useCallback((cardId: string) => {
    const cardBeingSecured = activeCards.find(c => c.id === cardId && c.type === 'price') as PriceGameCard | undefined;

    if (cardBeingSecured && !cardBeingSecured.isSecured) {
      // Create PriceDiscoverySignal for the log
      const newDiscoverySignal: PriceDiscoverySignal = {
        id: uuidv4(),
        type: 'price_discovery',
        symbol: cardBeingSecured.faceData.symbol,
        price: cardBeingSecured.faceData.price,
        timestamp: new Date(cardBeingSecured.faceData.timestamp), // Ensure it's a Date object
        discoveredAt: new Date(),
      };
      setDiscoveredSignals(prevSignals => [...prevSignals, newDiscoverySignal]);

      // Update active cards state
      setActiveCards(prevCards =>
        prevCards.map(card =>
          card.id === cardId && card.type === 'price'
            ? { ...card, isSecured: true, isFlipped: true, appearedAt: Date.now() } // Reset appearedAt to stop fade, flip to back
            : card
        )
      );
      
      toast({ 
        title: "Price Card Secured & Discovered!", 
        description: `Details of ${cardBeingSecured.faceData.symbol} at $${cardBeingSecured.faceData.price.toFixed(2)} logged.` 
      });
    } else if (cardBeingSecured && cardBeingSecured.isSecured) {
      // This case should ideally not be hit if GameCard calls onSecureCard only for unsecured cards.
      // If it is, it means we are trying to "secure" an already secured card.
      // We might just want to flip it, which is handled by onToggleFlipCard.
      // For now, let's assume GameCard prevents this call for already secured cards.
      // If not, this toast is a fallback.
      toast({ title: "Card Already Secured", description: "This card was already secured and its details logged." });
    }
  }, [activeCards, setActiveCards, setDiscoveredSignals, toast]);

  const handleFadedOut = useCallback((cardId: string) => {
    setActiveCards(prevCards => prevCards.filter(card => card.id !== cardId));
    toast({ title: "Card Faded Out", description: "A price card was removed due to inactivity." });
  }, [setActiveCards, toast]);

  const handleExamineCard = useCallback((priceCard: PriceGameCard) => {
    if (priceHistory.length < 2) {
      toast({ title: "Not enough data", description: "Need at least two price points to determine trend.", variant: "destructive" });
      return;
    }

    const cardTimestamp = new Date(priceCard.faceData.timestamp).getTime(); 
    let previousPriceData: PriceData | undefined;
    
    // Find the price data point immediately preceding the card's timestamp from history
    // Price history is sorted descending by time (newest first)
    for (let i = 0; i < priceHistory.length; i++) {
      const historyTimestamp = new Date(priceHistory[i].timestamp).getTime();
      if (historyTimestamp < cardTimestamp) {
        previousPriceData = priceHistory[i];
        break; 
      }
    }
   
    // Fallback: if card is the newest, compare with the one right before it in history
    if (!previousPriceData && priceHistory.length > 1) {
        const cardIndexInHistory = priceHistory.findIndex(p => new Date(p.timestamp).getTime() === cardTimestamp);
        if (cardIndexInHistory === 0 && priceHistory.length > 1) { // Card is the newest in history
             previousPriceData = priceHistory[1];
        } else if (cardIndexInHistory > 0) { // Card is in history but not the newest
            previousPriceData = priceHistory[cardIndexInHistory +1]; // This might be off, should be cardIndexInHistory -1 if history is [newest, older, oldest]
                                                                    // Let's assume priceHistory is [newest, older, ..., oldest]
                                                                    // If card is at index `i`, previous is `i+1`
           if(priceHistory[cardIndexInHistory + 1]) {
             previousPriceData = priceHistory[cardIndexInHistory + 1];
           }
        }
    }


    if (!previousPriceData) {
      toast({ title: "Trend Unavailable", description: "Could not find a preceding price point in recent history to compare.", variant: "destructive" });
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
      // If 2 cards already selected and trying to select a 3rd, show a toast and don't change selection
      if (prev.length >= 2 && !prev.includes(cardId)) {
        toast({ title: "Selection Limit", description: "Maximum of 2 cards can be selected for combination.", variant: "destructive" });
      }
      return prev;
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

    const card1Timestamp = new Date(card1.faceData.timestamp);
    const card2Timestamp = new Date(card2.faceData.timestamp);

    const [earlierCard, laterCard] = card1Timestamp.getTime() < card2Timestamp.getTime()
      ? [card1, card2]
      : [card2, card1];

    const newSignal: PriceChangeSignal = {
      id: uuidv4(),
      type: 'price_change',
      symbol: 'AAPL',
      price1: earlierCard.faceData.price,
      timestamp1: new Date(earlierCard.faceData.timestamp),
      price2: laterCard.faceData.price,
      timestamp2: new Date(laterCard.faceData.timestamp),
      generatedAt: new Date(),
    };

    setDiscoveredSignals(prev => [...prev, newSignal]);
    
    setActiveCards(prevActiveCards => 
      prevActiveCards.filter(card => card.id !== card1.id && card.id !== card2.id)
    );

    toast({ title: "Price Change Signal Discovered!", description: `Comparing prices from ${format(newSignal.timestamp1, 'p')} and ${format(newSignal.timestamp2, 'p')}. Cards removed.` });
    setSelectedCardsForCombine([]);
  }, [selectedCardsForCombine, activeCards, setDiscoveredSignals, setActiveCards, toast]);

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
