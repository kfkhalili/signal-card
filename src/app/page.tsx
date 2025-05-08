
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ActiveCardsArea from '@/components/game/active-cards-area';
import DiscoveredCards from '@/components/game/discovered-cards'; // Renamed import
import type { ActiveGameCard, PriceGameCard, TrendGameCard, PriceChangeSignal, PriceCardFaceData, TrendCardFaceData, DiscoveredCard, PriceDiscoverySignal } from '@/components/game/types'; // Renamed DiscoveredSignal to DiscoveredCard
import { useMockPriceFeed, type PriceData } from '@/hooks/use-mock-price-feed';
import useLocalStorage from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const FADE_DURATION_MINUTES = 10; // Default: 10-15 minutes. Using 10 for demo.
const FADE_DURATION_MS = FADE_DURATION_MINUTES * 60 * 1000;
// const FADE_DURATION_MS = 30 * 1000; // For testing: 30 seconds

// Define initial values for useLocalStorage outside the component to ensure stable references
const INITIAL_ACTIVE_CARDS: ActiveGameCard[] = [];
const INITIAL_DISCOVERED_CARDS: DiscoveredCard[] = []; // Renamed


export default function FinSignalGamePage() {
  const [activeCards, setActiveCards] = useLocalStorage<ActiveGameCard[]>('finSignal-activeCards', INITIAL_ACTIVE_CARDS);
  const [discoveredCards, setDiscoveredCards] = useLocalStorage<DiscoveredCard[]>('finSignal-discoveredCards', INITIAL_DISCOVERED_CARDS); // Renamed state and key
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
        // Check if a card with the same symbol and exact HH:MM already exists
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
  }, [latestPriceData, toast]); // Removed setActiveCards from deps as it's stable from useLocalStorage


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
      const newDiscoveryCard: PriceDiscoverySignal = { // Renamed variable
        id: uuidv4(),
        type: 'price_discovery',
        symbol: cardBeingSecured.faceData.symbol,
        price: cardBeingSecured.faceData.price,
        timestamp: new Date(cardBeingSecured.faceData.timestamp), 
        discoveredAt: new Date(),
        isFlipped: false, // Discovered cards start unflipped
      };
      
      const cardExists = discoveredCards.some(card =>  // Renamed variable and array
        card.type === 'price_discovery' &&
        (card as PriceDiscoverySignal).symbol === newDiscoveryCard.symbol &&
        (card as PriceDiscoverySignal).price === newDiscoveryCard.price &&
        new Date((card as PriceDiscoverySignal).timestamp).getTime() === newDiscoveryCard.timestamp.getTime()
      );

      if (!cardExists) {
        setDiscoveredCards(prevCards => [newDiscoveryCard, ...prevCards].sort((a, b) => new Date(b.discoveredAt || b.generatedAt).getTime() - new Date(a.discoveredAt || a.generatedAt).getTime())); // Renamed setter
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

      setActiveCards(prevCards =>
        prevCards.map(card =>
          card.id === cardId && card.type === 'price'
            ? { ...card, isSecured: true, isFlipped: true, appearedAt: Date.now() } // Secure and flip the card, reset fade timer
            : card
        )
      );
      
    }
  }, [activeCards, setActiveCards, setDiscoveredCards, discoveredCards, toast]); // Renamed dependencies


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
    
    for (let i = 0; i < priceHistory.length; i++) {
        const p = priceHistory[i];
        const pTimestamp = new Date(p.timestamp).getTime();
        if (pTimestamp < cardTimestamp) {
            previousPriceDataPoint = p;
            break; 
        } else if (pTimestamp === cardTimestamp && i + 1 < priceHistory.length) {
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
    
    // Allow flipping for any card type first.
    // If it's a Trend card, or an unsecured Price card, its primary action on click is to flip.
    // For secured Price cards, flipping is handled by GameCard's onClick directly calling onToggleFlip.
    if (card && (card.type === 'trend' || (card.type === 'price' && !(card as PriceGameCard).isSecured))) {
      handleToggleFlipCard(cardId);
      // Do not proceed to selection logic for Trend cards or unsecured Price cards.
      // Selection logic is only for secured Price cards.
      if (card.type === 'trend' || (card.type === 'price' && !(card as PriceGameCard).isSecured)) {
        return;
      }
    }
    
    // Only proceed with selection for secured Price cards.
    if (!card || card.type !== 'price' || !(card as PriceGameCard).isSecured) {
      // This toast might be redundant if the above flip logic handles the click for non-selectable cards.
      // However, it can serve as a fallback or for direct calls if needed.
      toast({ title: "Selection Info", description: "Only secured Price Cards can be selected for combination.", variant: "default" });
      return; 
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
      return prev; // Return current selection if limit reached and trying to add new
    });
  }, [activeCards, toast, handleToggleFlipCard, setSelectedCardsForCombine]);


  const handleCombineCards = useCallback(() => {
    if (selectedCardsForCombine.length !== 2) return;

    const card1FromState = activeCards.find(c => c.id === selectedCardsForCombine[0]) as PriceGameCard | undefined;
    const card2FromState = activeCards.find(c => c.id === selectedCardsForCombine[1]) as PriceGameCard | undefined;

    if (!card1FromState || !card2FromState || card1FromState.type !== 'price' || card2FromState.type !== 'price') {
      toast({ title: "Combine Error", description: "Invalid cards selected for combination.", variant: "destructive" });
      setSelectedCardsForCombine([]);
      return;
    }
    
    // Ensure timestamps are Date objects
    const card1Timestamp = card1FromState.faceData.timestamp instanceof Date ? card1FromState.faceData.timestamp : new Date(card1FromState.faceData.timestamp);
    const card2Timestamp = card2FromState.faceData.timestamp instanceof Date ? card2FromState.faceData.timestamp : new Date(card2FromState.faceData.timestamp);

    const [earlierCard, laterCard] = card1Timestamp.getTime() < card2Timestamp.getTime()
      ? [card1FromState, card2FromState]
      : [card2FromState, card1FromState];

    const newPriceChangeCard: PriceChangeSignal = { // Renamed variable
      id: uuidv4(),
      type: 'price_change',
      symbol: 'AAPL', // Assuming symbol is consistent or derived from cards
      price1: earlierCard.faceData.price,
      timestamp1: new Date(earlierCard.faceData.timestamp), // Ensure new Date objects for signal
      price2: laterCard.faceData.price,
      timestamp2: new Date(laterCard.faceData.timestamp), // Ensure new Date objects for signal
      generatedAt: new Date(),
      isFlipped: false, 
    };

    setDiscoveredCards(prev => [newPriceChangeCard, ...prev].sort((a, b) => new Date(b.discoveredAt || b.generatedAt).getTime() - new Date(a.discoveredAt || a.generatedAt).getTime())); // Renamed setter
    
    setActiveCards(prevActiveCards => 
      prevActiveCards.filter(card => card.id !== card1FromState.id && card.id !== card2FromState.id)
    );

    toast({ title: "Price Change Signal Discovered!", description: `Comparing prices from ${format(newPriceChangeCard.timestamp1, 'p')} and ${format(newPriceChangeCard.timestamp2, 'p')}. Cards removed.` });
    setSelectedCardsForCombine([]);
  }, [selectedCardsForCombine, activeCards, setActiveCards, setDiscoveredCards, toast]); // Renamed dependency


  const handleToggleFlipDiscoveredCard = useCallback((cardId: string) => { // Renamed handler
    setDiscoveredCards(prevCards => // Renamed setter
      prevCards.map(s =>
        s.id === cardId ? { ...s, isFlipped: !s.isFlipped } : s
      )
    );
  }, [setDiscoveredCards]); // Renamed dependency

  const handleDeleteDiscoveredCard = useCallback((cardId: string) => { // Renamed handler
    setDiscoveredCards(prevCards => prevCards.filter(s => s.id !== cardId)); // Renamed setter
    toast({ title: "Card Deleted", description: "The card has been removed from the discovered list." }); // Updated toast message
  }, [setDiscoveredCards, toast]); // Renamed dependency


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
      <DiscoveredCards 
        cards={discoveredCards} 
        onToggleFlipCard={handleToggleFlipDiscoveredCard} // Renamed prop
        onDeleteCard={handleDeleteDiscoveredCard} // Renamed prop
      />
    </div>
  );
}

