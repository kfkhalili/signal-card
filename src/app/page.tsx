
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ActiveCardsArea from '@/components/game/active-cards-area';
import DiscoveredCards from '@/components/game/discovered-cards';
import type { ActiveGameCard, PriceGameCard, TrendGameCard, PriceChangeSignal, PriceCardFaceData, TrendCardFaceData, DiscoveredCard, PriceDiscoverySignal } from '@/components/game/types';
import { useMockPriceFeed, type PriceData } from '@/hooks/use-mock-price-feed';
import useLocalStorage from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const FADE_DURATION_MINUTES = 4; // Default: 4 minutes.
const FADE_DURATION_MS = FADE_DURATION_MINUTES * 60 * 1000;
// const FADE_DURATION_MS = 30 * 1000; // For testing: 30 seconds

const INITIAL_ACTIVE_CARDS: ActiveGameCard[] = [];
const INITIAL_DISCOVERED_CARDS: DiscoveredCard[] = [];


export default function FinSignalGamePage() {
  const [activeCards, setActiveCards] = useLocalStorage<ActiveGameCard[]>('finSignal-activeCards', INITIAL_ACTIVE_CARDS);
  const [discoveredCards, setDiscoveredCards] = useLocalStorage<DiscoveredCard[]>('finSignal-discoveredCards', INITIAL_DISCOVERED_CARDS);
  const [selectedCardsForCombine, setSelectedCardsForCombine] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { latestPriceData, priceHistory, nextUpdateInSeconds } = useMockPriceFeed();

  useEffect(() => {
    if (latestPriceData) {
      const newPriceCardData: PriceCardFaceData = {
        symbol: 'AAPL',
        price: latestPriceData.price,
        timestamp: new Date(latestPriceData.timestamp),
      };

      setActiveCards(prevActiveCards => {
        const newCardTimestamp = newPriceCardData.timestamp;
        const isDuplicateByHHMM = prevActiveCards.some(card => {
          if (card.type === 'price') {
            const existingCardTimestamp = new Date((card as PriceGameCard).faceData.timestamp);
            return (
              (card as PriceGameCard).faceData.symbol === newPriceCardData.symbol &&
              existingCardTimestamp.getHours() === newCardTimestamp.getHours() &&
              existingCardTimestamp.getMinutes() === newCardTimestamp.getMinutes()
            );
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
  }, [latestPriceData, toast]);


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
      const newDiscoveryCard: PriceDiscoverySignal = {
        id: uuidv4(), // Use a new ID for the discovered card
        type: 'price_discovery',
        symbol: cardBeingSecured.faceData.symbol,
        price: cardBeingSecured.faceData.price,
        timestamp: new Date(cardBeingSecured.faceData.timestamp), 
        discoveredAt: new Date(),
        isFlipped: false, // Discovered cards start unflipped
      };
      
      // Check if this specific discovery (price point at specific time) already exists in discovered list
      const cardExistsInDiscovered = discoveredCards.some(card => 
        card.type === 'price_discovery' &&
        (card as PriceDiscoverySignal).symbol === newDiscoveryCard.symbol &&
        (card as PriceDiscoverySignal).price === newDiscoveryCard.price &&
        new Date((card as PriceDiscoverySignal).timestamp).getTime() === newDiscoveryCard.timestamp.getTime()
      );

      if (!cardExistsInDiscovered) {
        setDiscoveredCards(prevCards => [newDiscoveryCard, ...prevCards].sort((a, b) => new Date(b.discoveredAt || b.generatedAt).getTime() - new Date(a.discoveredAt || a.generatedAt).getTime()));
        toast({ 
          title: "Price Card Secured & Discovered!", 
          description: `Details of ${cardBeingSecured.faceData.symbol} at $${cardBeingSecured.faceData.price.toFixed(2)} logged.` 
        });
      } else {
         toast({ 
          title: "Price Card Secured", 
          description: `This price point was already discovered. Card is now secured in active area.`
        });
      }

      // Secure the active card
      setActiveCards(prevCards =>
        prevCards.map(card =>
          card.id === cardId && card.type === 'price'
            ? { ...card, isSecured: true, isFlipped: true, appearedAt: Date.now() } // Flip to back when secured
            : card
        )
      );
    }
  }, [activeCards, setActiveCards, setDiscoveredCards, discoveredCards, toast]);


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
    
    // Find the price point immediately preceding the examined card's timestamp in history
    // History is sorted with most recent first
    for (let i = 0; i < priceHistory.length; i++) {
        const p = priceHistory[i];
        const pTimestamp = new Date(p.timestamp).getTime();
        if (pTimestamp < cardTimestamp) { // Found a point strictly before
            previousPriceDataPoint = p;
            break; 
        } else if (pTimestamp === cardTimestamp && i + 1 < priceHistory.length) {
            // If current history point matches card's exact time, use the one before that
            previousPriceDataPoint = priceHistory[i+1];
            break;
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
      // Check for duplicate Trend card
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
          isFlipped: false, // Trend cards start unflipped
        };
        toast({ title: "Trend Card Generated!", description: `AAPL price trend: ${trend}` });
        return [...prevActiveCards, newTrendCard];
      }
      return prevActiveCards;
    });

  }, [priceHistory, setActiveCards, toast]);


  const handleSelectCardForCombine = useCallback((cardId: string) => {
    const card = activeCards.find(c => c.id === cardId);
    
    // Prevent selection of non-price cards or unsecured price cards
    if (!card || card.type !== 'price' || !(card as PriceGameCard).isSecured) {
      // If it's a trend card or an unsecured price card, just flip it if clicked.
      if (card && (card.type === 'trend' || (card.type === 'price' && !(card as PriceGameCard).isSecured))) {
        handleToggleFlipCard(cardId);
      } else {
        toast({ title: "Selection Info", description: "Only secured Price Cards can be selected for combination.", variant: "default" });
      }
      return; 
    }

    // Handle selection logic for secured price cards
    setSelectedCardsForCombine(prev => {
      if (prev.includes(cardId)) {
        // Deselect if already selected
        return prev.filter(id => id !== cardId);
      }
      if (prev.length < 2) {
        // Select if less than 2 are selected
        return [...prev, cardId];
      }
      // If 2 are already selected and trying to select a third, show a message.
      // The card itself won't be added to selection.
      if (prev.length >= 2 && !prev.includes(cardId)) {
        toast({ title: "Selection Limit", description: "Maximum of 2 cards can be selected. Deselect one first.", variant: "destructive" });
      }
      return prev; // Return previous state if limit reached
    });
  }, [activeCards, toast, handleToggleFlipCard]);


  const handleCombineCards = useCallback(() => {
    if (selectedCardsForCombine.length !== 2) return;

    const card1FromState = activeCards.find(c => c.id === selectedCardsForCombine[0]) as PriceGameCard | undefined;
    const card2FromState = activeCards.find(c => c.id === selectedCardsForCombine[1]) as PriceGameCard | undefined;

    if (!card1FromState || !card2FromState || card1FromState.type !== 'price' || card2FromState.type !== 'price') {
      toast({ title: "Combine Error", description: "Invalid cards selected for combination.", variant: "destructive" });
      setSelectedCardsForCombine([]);
      return;
    }
    
    const card1Timestamp = card1FromState.faceData.timestamp instanceof Date ? card1FromState.faceData.timestamp : new Date(card1FromState.faceData.timestamp);
    const card2Timestamp = card2FromState.faceData.timestamp instanceof Date ? card2FromState.faceData.timestamp : new Date(card2FromState.faceData.timestamp);

    const [earlierCard, laterCard] = card1Timestamp.getTime() < card2Timestamp.getTime()
      ? [card1FromState, card2FromState]
      : [card2FromState, card1FromState];

    const newPriceChangeCard: PriceChangeSignal = {
      id: uuidv4(),
      type: 'price_change',
      symbol: 'AAPL',
      price1: earlierCard.faceData.price,
      timestamp1: new Date(earlierCard.faceData.timestamp),
      price2: laterCard.faceData.price,
      timestamp2: new Date(laterCard.faceData.timestamp),
      generatedAt: new Date(),
      isFlipped: false, // Combined cards start unflipped
    };

    setDiscoveredCards(prev => [newPriceChangeCard, ...prev].sort((a, b) => new Date(b.discoveredAt || b.generatedAt).getTime() - new Date(a.discoveredAt || a.generatedAt).getTime()));
    
    setActiveCards(prevActiveCards => 
      prevActiveCards.filter(card => card.id !== card1FromState.id && card.id !== card2FromState.id)
    );

    toast({ title: "Price Change Signal Discovered!", description: `Comparing prices from ${format(newPriceChangeCard.timestamp1, 'p')} and ${format(newPriceChangeCard.timestamp2, 'p')}. Cards removed.` });
    setSelectedCardsForCombine([]);
  }, [selectedCardsForCombine, activeCards, setActiveCards, setDiscoveredCards, toast]);


  const handleToggleFlipDiscoveredCard = useCallback((cardId: string) => {
    setDiscoveredCards(prevCards =>
      prevCards.map(s =>
        s.id === cardId ? { ...s, isFlipped: !s.isFlipped } : s
      )
    );
  }, [setDiscoveredCards]);

  const handleDeleteDiscoveredCard = useCallback((cardId: string) => {
    const cardToDelete = discoveredCards.find(s => s.id === cardId);
    if (!cardToDelete) return;

    setDiscoveredCards(prevCards => prevCards.filter(s => s.id !== cardId));

    let toastMessage = "Card deleted from discovered list.";

    if (cardToDelete.type === 'price_discovery') {
      const deletedDiscoverySignal = cardToDelete as PriceDiscoverySignal;
      // Find the corresponding active card and unsecure it / restart timer
      setActiveCards(prevActiveCards => 
        prevActiveCards.map(activeCard => {
          if (activeCard.type === 'price') {
            const priceGameCard = activeCard as PriceGameCard;
            // Match by symbol, price, and original timestamp
            if (
              priceGameCard.faceData.symbol === deletedDiscoverySignal.symbol &&
              priceGameCard.faceData.price === deletedDiscoverySignal.price &&
              new Date(priceGameCard.faceData.timestamp).getTime() === new Date(deletedDiscoverySignal.timestamp).getTime() &&
              priceGameCard.isSecured // Only act if it was the one that was secured
            ) {
              toastMessage = `Card deleted. Corresponding active card unsecured and timer restarted.`;
              return {
                ...priceGameCard,
                isSecured: false,
                isFlipped: false, // Flip back to front
                appearedAt: Date.now(), // Restart fade timer
              };
            }
          }
          return activeCard;
        })
      );
    }
    toast({ title: "Card Update", description: toastMessage });
  }, [discoveredCards, setDiscoveredCards, setActiveCards, toast]);


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
        newCardCountdownSeconds={nextUpdateInSeconds}
      />
      <DiscoveredCards 
        cards={discoveredCards} 
        onToggleFlipCard={handleToggleFlipDiscoveredCard}
        onDeleteCard={handleDeleteDiscoveredCard}
      />
    </div>
  );
}

    
