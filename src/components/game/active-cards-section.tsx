"use client";

import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { ActiveGameCard, PriceGameCard, PriceChangeSignal, DiscoveredCard, PriceDiscoverySignal } from './types';
import ActiveCardsPresentational from './active-cards'; // Presentational component
import { useToast } from '@/hooks/use-toast';

interface ActiveCardsSectionProps {
  activeCards: ActiveGameCard[];
  setActiveCards: React.Dispatch<React.SetStateAction<ActiveGameCard[]>>;
  discoveredCards: DiscoveredCard[];
  setDiscoveredCards: React.Dispatch<React.SetStateAction<DiscoveredCard[]>>;
}

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
  discoveredCards,
  setDiscoveredCards,
}) => {
  const [selectedCardsForCombine, setSelectedCardsForCombine] = useState<string[]>([]);
  const { toast } = useToast();

  const handleSecureCard = useCallback((cardId: string, fromFlip: boolean = false) => {
    const cardBeingSecured = activeCards.find(c => c.id === cardId && c.type === 'price') as PriceGameCard | undefined;

    if (cardBeingSecured && (!cardBeingSecured.isSecured || fromFlip)) {
      const newDiscoveryCard: PriceDiscoverySignal = {
        id: uuidv4(), 
        type: 'price_discovery',
        symbol: cardBeingSecured.faceData.symbol,
        price: cardBeingSecured.faceData.price,
        timestamp: new Date(cardBeingSecured.faceData.timestamp), 
        discoveredAt: new Date(),
        isFlipped: false, 
        hasBeenFlippedAtLeastOnce: false,
      };
      
      const cardExistsInDiscovered = discoveredCards.some(card => 
        card.type === 'price_discovery' &&
        (card as PriceDiscoverySignal).symbol === newDiscoveryCard.symbol &&
        (card as PriceDiscoverySignal).price === newDiscoveryCard.price &&
        new Date((card as PriceDiscoverySignal).timestamp).getTime() === newDiscoveryCard.timestamp.getTime()
      );

      if (!cardExistsInDiscovered) {
        setDiscoveredCards(prevCards => 
          [newDiscoveryCard, ...prevCards].sort((a, b) => {
            const dateA = a.type === 'price_discovery' ? a.discoveredAt : a.generatedAt;
            const dateB = b.type === 'price_discovery' ? b.discoveredAt : b.generatedAt;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          })
        );
        toast({ 
          title: "Price Card Secured & Discovered!", 
          description: `Details of ${cardBeingSecured.faceData.symbol} at $${cardBeingSecured.faceData.price.toFixed(2)} logged.` 
        });
      } else if (!cardBeingSecured.isSecured) { 
         toast({ 
          title: "Price Card Secured", 
          description: `This price point was already discovered. Card is now secured in active area.`
        });
      }

      setActiveCards(prev => prev.map(card =>
          card.id === cardId && card.type === 'price'
            ? { ...card, isSecured: true, isFlipped: true, appearedAt: Date.now() } 
            : card
      ));

      setSelectedCardsForCombine(prevSelected => {
        if (prevSelected.length < 2 && !prevSelected.includes(cardId)) {
          return [...prevSelected, cardId];
        }
        if (prevSelected.length >= 2 && !prevSelected.includes(cardId)) {
           toast({ title: "Selection Limit Reached", description: "Card secured, but cannot auto-select. Deselect a card first.", variant: "default" });
        }
        return prevSelected;
      });
    }
  }, [activeCards, discoveredCards, setActiveCards, setDiscoveredCards, toast]);

  const handleToggleFlipCard = useCallback((cardId: string) => {
    const cardToToggle = activeCards.find(c => c.id === cardId);
    if (!cardToToggle) return;

    if (cardToToggle.type === 'price' && !cardToToggle.isSecured && !cardToToggle.isFlipped) {
      handleSecureCard(cardId, true);
    } else {
      setActiveCards(prevCards =>
        prevCards.map(card =>
          card.id === cardId
            ? { ...card, isFlipped: !card.isFlipped }
            : card
        )
      );
    }
  }, [activeCards, setActiveCards, handleSecureCard]);

  const handleFadedOut = useCallback((cardId: string) => {
    setActiveCards(prevCards => prevCards.filter(card => card.id !== cardId));
  }, [setActiveCards]);

  const handleSelectCardForCombine = useCallback((cardId: string) => {
    const card = activeCards.find(c => c.id === cardId);
    
    if (!card || card.type !== 'price' || !(card as PriceGameCard).isSecured) {
      if (card && (card.type === 'trend' || (card.type === 'price' && !(card as PriceGameCard).isSecured))) {
        handleToggleFlipCard(cardId); 
      } else {
        toast({ title: "Selection Info", description: "Only secured Price Cards can be selected for combination.", variant: "default" });
      }
      return; 
    }

    setSelectedCardsForCombine(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      }
      if (prev.length < 2) {
        return [...prev, cardId];
      }
      if (prev.length >= 2 && !prev.includes(cardId)) {
        toast({ title: "Selection Limit", description: "Maximum of 2 cards can be selected. Deselect one first.", variant: "destructive" });
      }
      return prev; 
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
      isFlipped: false, 
      hasBeenFlippedAtLeastOnce: false,
    };

    setDiscoveredCards(prev => 
      [newPriceChangeCard, ...prev].sort((a, b) => {
        const dateA = a.type === 'price_discovery' ? a.discoveredAt : a.generatedAt;
        const dateB = b.type === 'price_discovery' ? b.discoveredAt : b.generatedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
    );
    
    setActiveCards(prevActiveCards => 
      prevActiveCards.filter(card => card.id !== card1FromState.id && card.id !== card2FromState.id)
    );

    toast({ title: "Price Change Signal Discovered!", description: `Comparing prices from ${format(newPriceChangeCard.timestamp1, 'p')} and ${format(newPriceChangeCard.timestamp2, 'p')}. Cards removed.` });
    setSelectedCardsForCombine([]);
  }, [selectedCardsForCombine, activeCards, setActiveCards, setDiscoveredCards, toast]);

  return (
    <ActiveCardsPresentational
      cards={activeCards}
      onSecureCard={handleSecureCard}
      onFadedOut={handleFadedOut}
      selectedCardsForCombine={selectedCardsForCombine}
      onSelectCardForCombine={handleSelectCardForCombine}
      onCombineCards={handleCombineCards}
      onToggleFlipCard={handleToggleFlipCard} newCardCountdownSeconds={null}      // newCardCountdownSeconds prop correctly removed here
    />
  );
};

export default ActiveCardsSection;
