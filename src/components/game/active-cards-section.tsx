"use client";

import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { 
  ActiveGameCard, 
  PriceGameCard, 
  PriceCardFaceData, 
  PriceChangeSignal, 
  DiscoveredCard, 
  PriceDiscoverySignal,
  DailyPerformanceSignal,
  DailyPerformanceSignalData,
  PriceVsSmaSignal, 
  PriceVsSmaSignalData 
} from './types';
import ActiveCardsPresentational from './active-cards';
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
    if (!cardBeingSecured) return;
    if (!cardBeingSecured.isSecured || fromFlip) {
      const newDiscoveryCard: PriceDiscoverySignal = { id: uuidv4(), type: 'price_discovery', symbol: cardBeingSecured.faceData.symbol, price: cardBeingSecured.faceData.price, timestamp: new Date(cardBeingSecured.faceData.timestamp), discoveredAt: new Date(), isFlipped: false, hasBeenFlippedAtLeastOnce: false, };
      const cardExistsInDiscovered = discoveredCards.some(card => card.type === 'price_discovery' && (card as PriceDiscoverySignal).symbol === newDiscoveryCard.symbol && (card as PriceDiscoverySignal).price === newDiscoveryCard.price && new Date((card as PriceDiscoverySignal).timestamp).getTime() === newDiscoveryCard.timestamp.getTime());
      if (!cardExistsInDiscovered) {
        setDiscoveredCards(prevCards => [newDiscoveryCard, ...prevCards].sort((a, b) => { const getDate = (c: DiscoveredCard): Date => (c.type === 'price_discovery' ? c.discoveredAt : c.type === 'price_change' ? c.generatedAt : (c as DailyPerformanceSignal | PriceVsSmaSignal).generatedAt); return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime(); }));
        toast({ title: "Price Card Secured & Discovered!", description: `Details of ${cardBeingSecured.faceData.symbol} at $${cardBeingSecured.faceData.price.toFixed(2)} logged.` });
      } else if (!cardBeingSecured.isSecured) { 
         toast({ title: "Price Card Secured", description: `This price point was already discovered. Card is now secured in active area.`});
      }
      setActiveCards(prev => prev.map(card => card.id === cardId && card.type === 'price' ? { ...card, isSecured: true, isFlipped: true, appearedAt: Date.now() } : card ));
      setSelectedCardsForCombine(prevSelected => { if (prevSelected.length < 2 && !prevSelected.includes(cardId)) { return [...prevSelected, cardId]; } if (prevSelected.length >= 2 && !prevSelected.includes(cardId)) { toast({ title: "Selection Limit Reached", description: "Card secured, but cannot auto-select. Deselect a card first.", variant: "default" }); } return prevSelected; });
    }
  }, [activeCards, discoveredCards, setActiveCards, setDiscoveredCards, toast]);

  const handleToggleFlipCard = useCallback((cardId: string) => {
    const cardToToggle = activeCards.find(c => c.id === cardId);
    if (!cardToToggle) return;
    if (cardToToggle.type === 'price' && !(cardToToggle as PriceGameCard).isSecured && !cardToToggle.isFlipped) {
      handleSecureCard(cardId, true);
    } else {
      setActiveCards(prevCards => prevCards.map(card => card.id === cardId ? { ...card, isFlipped: !card.isFlipped } : card ));
    }
  }, [activeCards, setActiveCards, handleSecureCard]);

  const handleFadedOut = useCallback((cardId: string) => {
    setActiveCards(prevCards => prevCards.filter(card => card.id !== cardId));
  }, [setActiveCards]);

  const handleSelectCardForCombine = useCallback((cardId: string) => {
    const card = activeCards.find(c => c.id === cardId);
    if (!card || card.type !== 'price' || !(card as PriceGameCard).isSecured) {
      if (card && (card.type === 'trend' || (card.type === 'price' && !(card as PriceGameCard).isSecured))) { handleToggleFlipCard(cardId); 
      } else { toast({ title: "Selection Info", description: "Only secured Price Cards can be selected for combination.", variant: "default" }); }
      return; 
    }
    setSelectedCardsForCombine(prev => { if (prev.includes(cardId)) { return prev.filter(id => id !== cardId); } if (prev.length < 2) { return [...prev, cardId]; } if (prev.length >= 2 && !prev.includes(cardId)) { toast({ title: "Selection Limit", description: "Maximum of 2 cards can be selected. Deselect one first.", variant: "destructive" }); } return prev; });
  }, [activeCards, toast, handleToggleFlipCard]);

  const handleCombineCards = useCallback(() => {
    if (selectedCardsForCombine.length !== 2) return;
    const card1 = activeCards.find(c => c.id === selectedCardsForCombine[0]) as PriceGameCard | undefined;
    const card2 = activeCards.find(c => c.id === selectedCardsForCombine[1]) as PriceGameCard | undefined;
    if (!card1 || !card2) { /* ... error ... */ return; }
    const newSignal: PriceChangeSignal = { id: uuidv4(), type: 'price_change', symbol: card1.faceData.symbol, price1: card1.faceData.price, timestamp1: new Date(card1.faceData.timestamp), price2: card2.faceData.price, timestamp2: new Date(card2.faceData.timestamp), generatedAt: new Date(), isFlipped: false, hasBeenFlippedAtLeastOnce: false };
    setDiscoveredCards(prev => [newSignal, ...prev].sort((a, b) => { const getDate = (c: DiscoveredCard): Date => (c.type === 'price_discovery' ? c.discoveredAt : c.type === 'price_change' ? c.generatedAt : (c as DailyPerformanceSignal | PriceVsSmaSignal).generatedAt); return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime(); }));
    setActiveCards(prev => prev.filter(c => c.id !== card1.id && c.id !== card2.id));
    toast({ title: "Price Change Signal Discovered!", description: `Comparing prices from ${format(newSignal.timestamp1, 'p')} and ${format(newSignal.timestamp2, 'p')}. Cards removed.` });
    setSelectedCardsForCombine([]);
  }, [selectedCardsForCombine, activeCards, setActiveCards, setDiscoveredCards, toast]);

  const handleGenerateDailyPerformanceSignal = useCallback((priceCardFaceData: PriceCardFaceData) => {
    if (priceCardFaceData.previousClose === null || priceCardFaceData.previousClose === undefined || priceCardFaceData.dayChange === null || priceCardFaceData.dayChange === undefined || priceCardFaceData.changePercentage === null || priceCardFaceData.changePercentage === undefined) {
      toast({ title: "Data Incomplete for Signal", description: "Cannot generate daily performance signal.", variant: "destructive" }); return;
    }
    const signalData: DailyPerformanceSignalData = { currentPrice: priceCardFaceData.price, previousClose: priceCardFaceData.previousClose, change: priceCardFaceData.dayChange, changePercentage: priceCardFaceData.changePercentage, quoteTimestamp: new Date(priceCardFaceData.timestamp), };
    const newSignalCard: DailyPerformanceSignal = { id: uuidv4(), type: 'daily_performance', symbol: priceCardFaceData.symbol, data: signalData, generatedAt: new Date(), isFlipped: false, hasBeenFlippedAtLeastOnce: false, };
    setDiscoveredCards(prev => [newSignalCard, ...prev].sort((a, b) => { const getDate = (c: DiscoveredCard): Date => (c.type === 'price_discovery' ? c.discoveredAt : c.type === 'price_change' ? c.generatedAt : (c as DailyPerformanceSignal | PriceVsSmaSignal).generatedAt); return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime(); }));
    toast({ title: "Signal Discovered!", description: `Daily Performance for ${newSignalCard.symbol} logged.` });
  }, [setDiscoveredCards, toast]);

  // --- NEW HANDLER for Price vs. SMA Signal ---
  const handleGeneratePriceVsSmaSignal = useCallback((faceData: PriceCardFaceData, smaPeriod: 50 | 200, smaValue: number) => {
    console.log("SMA Signal Handler - faceData received:", JSON.stringify(faceData)); // ADDED LOG
    if (faceData.price === null || faceData.price === undefined) {
      toast({ title: "Data Incomplete", description: "Current price data is missing for SMA comparison.", variant: "destructive" });
      return;
    }

    const signalData: PriceVsSmaSignalData = {
      currentPrice: faceData.price,
      smaValue: smaValue,
      smaPeriod: smaPeriod,
      priceAboveSma: faceData.price > smaValue,
      quoteTimestamp: new Date(faceData.timestamp),
    };

    const newSignalCard: PriceVsSmaSignal = {
      id: uuidv4(),
      type: 'price_vs_sma',
      symbol: faceData.symbol,
      data: signalData,
      generatedAt: new Date(),
      isFlipped: false,
      hasBeenFlippedAtLeastOnce: false,
    };

    setDiscoveredCards(prevDiscoveredCards =>
      [newSignalCard, ...prevDiscoveredCards].sort((a, b) => {
        const getDate = (card: DiscoveredCard): Date => {
          if (card.type === 'price_discovery') return card.discoveredAt;
          if (card.type === 'price_change') return card.generatedAt;
          // For DailyPerformanceSignal and PriceVsSmaSignal, use generatedAt
          return (card as DailyPerformanceSignal | PriceVsSmaSignal).generatedAt;
        };
        return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();
      })
    );

    toast({
      title: "SMA Signal Discovered!",
      description: `${faceData.symbol} price vs ${smaPeriod}D SMA logged.`,
    });

  }, [setDiscoveredCards, toast]);


  return (
    <ActiveCardsPresentational
      cards={activeCards}
      onSecureCard={handleSecureCard}
      onFadedOut={handleFadedOut}
      selectedCardsForCombine={selectedCardsForCombine}
      onSelectCardForCombine={handleSelectCardForCombine}
      onCombineCards={handleCombineCards}
      onToggleFlipCard={handleToggleFlipCard}
      onGenerateDailyPerformanceSignal={handleGenerateDailyPerformanceSignal}
      onGeneratePriceVsSmaSignal={handleGeneratePriceVsSmaSignal} // Pass new handler
    />
  );
};

export default ActiveCardsSection;
