
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
        timestamp: new Date(latestPriceData.timestamp), // Ensure it's a Date object
      };

      setActiveCards(prevActiveCards => {
        const newCardTimestamp = newPriceCardData.timestamp;
        const isDuplicateByHHMM = prevActiveCards.some(card => {
          if (card.type === 'price') {
            const existingCardTimestamp = new Date((card as PriceGameCard).faceData.timestamp);
            return existingCardTimestamp.getHours() === newCardTimestamp.getHours() &&
                   existingCardTimestamp.getMinutes() === newCardTimestamp.getMinutes() &&
                   (card as PriceGameCard).faceData.symbol === newPriceCardData.symbol;
          }
          return false;
        });

        if (!isDuplicateByHHMM) {
          const newPriceCard: PriceGameCard = {
            id: uuidv4(),
            type: 'price',
            faceData: newPriceCardData,
            backData: {
              explanation: `Apple Inc.'s stock price at ${format(newPriceCardData.timestamp, 'PP p')}.`,
            },
            isFlipped: false,
            isSecured: false,
            appearedAt: Date.now(),
            initialFadeDurationMs: FADE_DURATION_MS,
          };
          toast({ title: "New Price Card Appeared!", description: `AAPL: $${latestPriceData.price.toFixed(2)} at ${format(newPriceCardData.timestamp, 'p')}` });
          return [...prevActiveCards, newPriceCard];
        }
        return prevActiveCards;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestPriceData, toast]); // Removed setActiveCards from dependency array as it's stable from useLocalStorage if initialValue/key are stable. It is actually not stable.


  const handleToggleFlipCard = useCallback((cardId: string) => {
    setActiveCards(prevCards =>
      prevCards.map(card =>
        card.id === cardId ? { ...card, isFlipped: !card.isFlipped } : card
      )
    );
  }, [setActiveCards]);

  const handleSecureCard = useCallback((cardId: string) => {
    const cardBeingSecured = activeCards.find(c => c.id === cardId && c.type === 'price') as PriceGameCard | undefined;

    if (cardBeingSecured && !cardBeingSecured.isSecured) {
      // Create PriceDiscoverySignal for the log
      const newDiscoverySignal: PriceDiscoverySignal = {
        id: uuidv4(),
        type: 'price_discovery',
        symbol: cardBeingSecured.faceData.symbol,
        price: cardBeingSecured.faceData.price,
        timestamp: new Date(cardBeingSecured.faceData.timestamp), 
        discoveredAt: new Date(),
        isFlipped: true, // Initialize isFlipped to true for log card when secured (shows back initially)
      };
      
      // Check if a similar signal already exists (same symbol, price, and timestamp)
      const signalExists = discoveredSignals.some(signal => 
        signal.type === 'price_discovery' &&
        (signal as PriceDiscoverySignal).symbol === newDiscoverySignal.symbol &&
        (signal as PriceDiscoverySignal).price === newDiscoverySignal.price &&
        new Date((signal as PriceDiscoverySignal).timestamp).getTime() === newDiscoverySignal.timestamp.getTime()
      );

      if (!signalExists) {
        setDiscoveredSignals(prevSignals => [newDiscoverySignal, ...prevSignals].sort((a, b) => new Date(b.discoveredAt || b.generatedAt).getTime() - new Date(a.discoveredAt || a.generatedAt).getTime()));
        toast({ 
          title: "Price Card Secured & Discovered!", 
          description: `Details of ${cardBeingSecured.faceData.symbol} at $${cardBeingSecured.faceData.price.toFixed(2)} logged.` 
        });
      } else {
         toast({ 
          title: "Price Card Secured", 
          description: `This price point was already discovered. Card is now secured.`
        });
      }


      // Update active cards state
      setActiveCards(prevCards =>
        prevCards.map(card =>
          card.id === cardId && card.type === 'price'
            ? { ...card, isSecured: true, isFlipped: true, appearedAt: Date.now() } 
            : card
        )
      );
      
    } else if (cardBeingSecured && cardBeingSecured.isSecured) {
      // This case is now primarily handled by onSelectCardForCombine and onToggleFlip in GameCard.
      // If specific logic for "re-securing" or re-logging an already secured card is needed here,
      // it would go here. However, the current flow for already secured cards is selection/flipping.
      // "Rediscovery" after deletion is handled by handleDeleteSignal making the card unsecured again.
    }
  }, [activeCards, setActiveCards, setDiscoveredSignals, discoveredSignals, toast]);


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
    let previousPriceDataPoint: PriceData | undefined;
    
    for (const p of priceHistory) {
      if (new Date(p.timestamp).getTime() < cardTimestamp) {
        previousPriceDataPoint = p;
        break;
      }
    }
   
    if (!previousPriceDataPoint && priceHistory.length > 0) {
        const cardIndexInHistory = priceHistory.findIndex(p => new Date(p.timestamp).getTime() === cardTimestamp);
        if (cardIndexInHistory === 0 && priceHistory.length > 1) { 
             previousPriceDataPoint = priceHistory[1];
        } else if (cardIndexInHistory > 0 && priceHistory[cardIndexInHistory -1]) {
            previousPriceDataPoint = priceHistory[cardIndexInHistory -1 ]; 
        }
    }


    if (!previousPriceDataPoint) {
      toast({ title: "Trend Unavailable", description: "Could not find a preceding price point in recent history to compare.", variant: "destructive" });
      return;
    }
    
    const currentPrice = priceCard.faceData.price;
    const prevPrice = previousPriceDataPoint.price;
    let trend: TrendCardFaceData['trend'];
    if (currentPrice > prevPrice) trend = 'UP';
    else if (currentPrice < prevPrice) trend = 'DOWN';
    else trend = 'FLAT';

    const newTrendCardFaceData: TrendCardFaceData = {
      symbol: 'AAPL',
      trend,
      referenceTimeStart: new Date(previousPriceDataPoint.timestamp),
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
      // If card is not securable (e.g. Trend card), or not secured, just toggle flip.
      // This path is usually taken for Trend cards or unsecured Price cards that might be directly flipped.
      const targetCard = activeCards.find(c => c.id === cardId);
       if (targetCard && (targetCard.type === 'trend' || (targetCard.type === 'price' && !(targetCard as PriceGameCard).isSecured))) {
         handleToggleFlipCard(cardId); // Allow flipping for non-combinable or unsecured cards.
      } else if (targetCard && targetCard.type === 'price' && (targetCard as PriceGameCard).isSecured) {
        // If it's a secured price card, it means GameCard's logic already called onSelectForCombine
        // and potentially onToggleFlip. We just need to update selection state here.
        // No toast error here, just manage selection.
      } else {
        toast({ title: "Selection Info", description: "This card cannot be selected for combination. Only secured Price Cards can.", variant: "default" });
      }
       // This early return might prevent selection logic for secured cards if not careful.
      // The intention of this block is primarily to handle clicks on cards that AREN'T eligible for combine selection.
      // For secured cards, we want the selection logic below to run.
      if (!(card && card.type === 'price' && (card as PriceGameCard).isSecured)) {
        return; // Explicitly stop if not a secured price card.
      }
    }


    setSelectedCardsForCombine(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId); // Deselect
      }
      if (prev.length < 2) {
        return [...prev, cardId]; // Select
      }
      if (prev.length >= 2 && !prev.includes(cardId)) {
        toast({ title: "Selection Limit", description: "Maximum of 2 cards can be selected for combination.", variant: "destructive" });
      }
      return prev;
    });
  }, [activeCards, toast, handleToggleFlipCard]);

  const handleCombineCards = useCallback(() => {
    if (selectedCardsForCombine.length !== 2) return;

    const card1 = activeCards.find(c => c.id === selectedCardsForCombine[0]) as PriceGameCard | undefined;
    const card2 = activeCards.find(c => c.id === selectedCardsForCombine[1]) as PriceGameCard | undefined;

    if (!card1 || !card2 || card1.type !== 'price' || card2.type !== 'price') {
      toast({ title: "Combine Error", description: "Invalid cards selected for combination.", variant: "destructive" });
      setSelectedCardsForCombine([]);
      return;
    }
    
    const card1Timestamp = card1.faceData.timestamp instanceof Date ? card1.faceData.timestamp : new Date(card1.faceData.timestamp);
    const card2Timestamp = card2.faceData.timestamp instanceof Date ? card2.faceData.timestamp : new Date(card2.faceData.timestamp);


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
      isFlipped: false, 
    };

    setDiscoveredSignals(prev => [newSignal, ...prev].sort((a, b) => new Date(b.discoveredAt || b.generatedAt).getTime() - new Date(a.discoveredAt || a.generatedAt).getTime()));
    
    setActiveCards(prevActiveCards => 
      prevActiveCards.filter(card => card.id !== card1.id && card.id !== card2.id)
    );

    toast({ title: "Price Change Signal Discovered!", description: `Comparing prices from ${format(newSignal.timestamp1, 'p')} and ${format(newSignal.timestamp2, 'p')}. Cards removed.` });
    setSelectedCardsForCombine([]);
  }, [selectedCardsForCombine, activeCards, setDiscoveredSignals, setActiveCards, toast]);


  const handleToggleFlipSignal = useCallback((signalId: string) => {
    setDiscoveredSignals(prevSignals =>
      prevSignals.map(s =>
        s.id === signalId ? { ...s, isFlipped: !s.isFlipped } : s
      )
    );
  }, [setDiscoveredSignals]);

  const handleDeleteSignal = useCallback((signalId: string) => {
    const deletedSignal = discoveredSignals.find(s => s.id === signalId);
    
    setDiscoveredSignals(prevSignals => prevSignals.filter(s => s.id !== signalId));
    toast({ title: "Signal Deleted", description: "The signal has been removed from the log." });

    if (deletedSignal && deletedSignal.type === 'price_discovery') {
      const { symbol, price, timestamp } = deletedSignal as PriceDiscoverySignal;
      setActiveCards(prevActiveCards =>
        prevActiveCards.map(card => {
          if (
            card.type === 'price' &&
            (card as PriceGameCard).isSecured && // Only consider secured cards
            (card as PriceGameCard).faceData.symbol === symbol &&
            (card as PriceGameCard).faceData.price === price &&
            new Date((card as PriceGameCard).faceData.timestamp).getTime() === new Date(timestamp).getTime()
          ) {
            // Revert the card to an unsecured, face-up state
            return { ...card, isSecured: false, isFlipped: false }; 
          }
          return card;
        })
      );
    }
  }, [discoveredSignals, setDiscoveredSignals, setActiveCards, toast]);


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
      <DiscoveredSignalsLog 
        signals={discoveredSignals} 
        onToggleFlipSignal={handleToggleFlipSignal}
        onDeleteSignal={handleDeleteSignal}
      />
    </div>
  );
}

