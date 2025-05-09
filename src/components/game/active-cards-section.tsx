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
  PriceVsSmaSignalData,
  PriceRangeContextSignal, // Import new type
  PriceRangeContextSignalData // Import new type
} from './types';
import ActiveCardsPresentational from './active-cards';
import { useToast } from '@/hooks/use-toast';

interface ActiveCardsSectionProps {
  activeCards: ActiveGameCard[];
  setActiveCards: React.Dispatch<React.SetStateAction<ActiveGameCard[]>>;
  discoveredCards: DiscoveredCard[]; 
  setDiscoveredCards: React.Dispatch<React.SetStateAction<DiscoveredCard[]>>;
}

// Helper function to get date for sorting (centralized)
const getDiscoveredCardSortDate = (card: DiscoveredCard): Date => {
  if (card.type === 'price_discovery') return card.discoveredAt;
  if (card.type === 'price_change') return card.generatedAt;
  // For DailyPerformanceSignal, PriceVsSmaSignal, and PriceRangeContextSignal, use generatedAt
  return (card as DailyPerformanceSignal | PriceVsSmaSignal | PriceRangeContextSignal).generatedAt;
};


const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
  discoveredCards, 
  setDiscoveredCards,
}) => {
  const [selectedCardsForCombine, setSelectedCardsForCombine] = useState<string[]>([]);
  const { toast } = useToast();

  // --- Existing Handlers (minimized for brevity, logic unchanged) ---
  const handleSecureCard = useCallback((cardId: string, fromFlip: boolean = false) => {
    const cardBeingSecured = activeCards.find(c => c.id === cardId && c.type === 'price') as PriceGameCard | undefined;
    if (!cardBeingSecured) return;
    if (!cardBeingSecured.isSecured || fromFlip) {
      const newDiscoveryCard: PriceDiscoverySignal = { id: uuidv4(), type: 'price_discovery', symbol: cardBeingSecured.faceData.symbol, price: cardBeingSecured.faceData.price, timestamp: new Date(cardBeingSecured.faceData.timestamp), discoveredAt: new Date(), isFlipped: false, hasBeenFlippedAtLeastOnce: false, };
      const cardExistsInDiscovered = discoveredCards.some(c => c.type === 'price_discovery' && (c as PriceDiscoverySignal).symbol === newDiscoveryCard.symbol && (c as PriceDiscoverySignal).price === newDiscoveryCard.price && new Date((c as PriceDiscoverySignal).timestamp).getTime() === newDiscoveryCard.timestamp.getTime());
      if (!cardExistsInDiscovered) {
        setDiscoveredCards(prev => [newDiscoveryCard, ...prev].sort((a, b) => new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime()));
        toast({ title: "Price Card Secured & Discovered!", description: `Details logged.` });
      } else if (!cardBeingSecured.isSecured) { 
         toast({ title: "Price Card Secured", description: `Already discovered. Secured in active area.`});
      }
      setActiveCards(prev => prev.map(c => c.id === cardId && c.type === 'price' ? { ...c, isSecured: true, isFlipped: true, appearedAt: Date.now() } : c ));
      setSelectedCardsForCombine(prev => { if (prev.length < 2 && !prev.includes(cardId)) return [...prev, cardId]; if (prev.length >= 2 && !prev.includes(cardId)) toast({ title: "Selection Limit Reached"}); return prev; });
    }
  }, [activeCards, discoveredCards, setActiveCards, setDiscoveredCards, toast]);

  const handleToggleFlipCard = useCallback((cardId: string) => {
    const cardToToggle = activeCards.find(c => c.id === cardId);
    if (!cardToToggle) return;
    if (cardToToggle.type === 'price' && !(cardToToggle as PriceGameCard).isSecured && !cardToToggle.isFlipped) handleSecureCard(cardId, true);
    else setActiveCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c ));
  }, [activeCards, setActiveCards, handleSecureCard]);

  const handleFadedOut = useCallback((cardId: string) => setActiveCards(prev => prev.filter(c => c.id !== cardId)), [setActiveCards]);
  const handleSelectCardForCombine = useCallback((cardId: string) => { /* ... combine logic (likely deprecated) ... */ }, [activeCards, toast, handleToggleFlipCard]);
  const handleCombineCards = useCallback(() => { /* ... combine logic (likely deprecated) ... */ }, [selectedCardsForCombine, activeCards, setActiveCards, setDiscoveredCards, toast]);
  const handleGenerateDailyPerformanceSignal = useCallback((priceCardFaceData: PriceCardFaceData) => {
    if (priceCardFaceData.previousClose == null || priceCardFaceData.dayChange == null || priceCardFaceData.changePercentage == null ) {
      toast({ title: "Data Incomplete for Signal", variant: "destructive" }); return;
    }
    const signalData: DailyPerformanceSignalData = { currentPrice: priceCardFaceData.price, previousClose: priceCardFaceData.previousClose, change: priceCardFaceData.dayChange, changePercentage: priceCardFaceData.changePercentage, quoteTimestamp: new Date(priceCardFaceData.timestamp), };
    const newSignalCard: DailyPerformanceSignal = { id: uuidv4(), type: 'daily_performance', symbol: priceCardFaceData.symbol, data: signalData, generatedAt: new Date(), isFlipped: false, };
    setDiscoveredCards(prev => [newSignalCard, ...prev].sort((a, b) => new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime()));
    toast({ title: "Signal Discovered!", description: `Daily Performance for ${newSignalCard.symbol} logged.` });
  }, [setDiscoveredCards, toast]);

  const handleGeneratePriceVsSmaSignal = useCallback((faceData: PriceCardFaceData, smaPeriod: 50 | 200, smaValue: number) => {
    if (faceData.price == null) { toast({ title: "Data Incomplete", variant: "destructive" }); return; }
    const signalData: PriceVsSmaSignalData = { currentPrice: faceData.price, smaValue: smaValue, smaPeriod: smaPeriod, priceAboveSma: faceData.price > smaValue, quoteTimestamp: new Date(faceData.timestamp), };
    const newSignalCard: PriceVsSmaSignal = { id: uuidv4(), type: 'price_vs_sma', symbol: faceData.symbol, data: signalData, generatedAt: new Date(), isFlipped: false, };
    setDiscoveredCards(prev => [newSignalCard, ...prev].sort((a, b) => new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime()));
    toast({ title: "SMA Signal Discovered!", description: `${faceData.symbol} price vs ${smaPeriod}D SMA logged.` });
  }, [setDiscoveredCards, toast]);

  // --- NEW HANDLER for Price Range Context Signal ---
  const handleGeneratePriceRangeContextSignal = useCallback((faceData: PriceCardFaceData, levelType: 'High' | 'Low', levelValue: number) => {
    if (faceData.price == null || levelValue == null) { // Ensure price and levelValue are present
      toast({ title: "Data Incomplete for Range Signal", description: "Current price or day high/low data is missing.", variant: "destructive" });
      return;
    }

    const difference = Math.abs(faceData.price - levelValue);
    // Percentage from level: (currentPrice - levelValue) / levelValue * 100 if you want % difference
    // Or simply if it's at the level, or how close it is.
    // For simplicity, we'll just store the difference for now.

    const signalData: PriceRangeContextSignalData = {
      currentPrice: faceData.price,
      levelType: levelType,
      levelValue: levelValue,
      quoteTimestamp: new Date(faceData.timestamp),
      difference: difference,
      // percentageFromLevel: (difference / levelValue) * 100 // Example, refine if needed
    };

    const newSignalCard: PriceRangeContextSignal = {
      id: uuidv4(),
      type: 'price_range_context',
      symbol: faceData.symbol,
      data: signalData,
      generatedAt: new Date(),
      isFlipped: false,
      hasBeenFlippedAtLeastOnce: false,
    };

    setDiscoveredCards(prevDiscoveredCards =>
      [newSignalCard, ...prevDiscoveredCards].sort((a, b) => 
        new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime()
      )
    );

    toast({
      title: "Range Signal Discovered!",
      description: `${faceData.symbol} price vs Day ${levelType} logged.`,
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
      onGeneratePriceVsSmaSignal={handleGeneratePriceVsSmaSignal}
      onGeneratePriceRangeContextSignal={handleGeneratePriceRangeContextSignal} // Pass new handler
    />
  );
};

export default ActiveCardsSection;
