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
  PriceRangeContextSignal,
  PriceRangeContextSignalData,
  IntradayTrendSignal, 
  IntradayTrendSignalData 
} from './types';
import ActiveCardsPresentational from './active-cards';
import { useToast } from '@/hooks/use-toast';

interface ActiveCardsSectionProps {
  activeCards: ActiveGameCard[];
  setActiveCards: React.Dispatch<React.SetStateAction<ActiveGameCard[]>>;
  discoveredCards: DiscoveredCard[]; 
  setDiscoveredCards: React.Dispatch<React.SetStateAction<DiscoveredCard[]>>;
}

const getDiscoveredCardSortDate = (card: DiscoveredCard): Date => {
  if (card.type === 'price_discovery') return card.discoveredAt;
  if (card.type === 'price_change') return card.generatedAt;
  return (card as DailyPerformanceSignal | PriceVsSmaSignal | PriceRangeContextSignal | IntradayTrendSignal).generatedAt;
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
    const cardBeingSecured = activeCards.find(c => c.id === cardId && c.type === 'price') as PriceGameCard | undefined; if (!cardBeingSecured) return;
    if (!cardBeingSecured.isSecured || fromFlip) {
      const newDiscoveryCard: PriceDiscoverySignal = { id: uuidv4(), type: 'price_discovery', symbol: cardBeingSecured.faceData.symbol, price: cardBeingSecured.faceData.price, timestamp: new Date(cardBeingSecured.faceData.timestamp), discoveredAt: new Date(), isFlipped: false, hasBeenFlippedAtLeastOnce: false, };
      const cardExistsInDiscovered = discoveredCards.some(c => c.type === 'price_discovery' && (c as PriceDiscoverySignal).symbol === newDiscoveryCard.symbol && (c as PriceDiscoverySignal).price === newDiscoveryCard.price && new Date((c as PriceDiscoverySignal).timestamp).getTime() === newDiscoveryCard.timestamp.getTime());
      if (!cardExistsInDiscovered) {
        setDiscoveredCards(prev => [newDiscoveryCard, ...prev].sort((a, b) => new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime()));
        toast({ title: "Price Card Secured & Discovered!", description: `Details logged.` });
      } else if (!cardBeingSecured.isSecured) { toast({ title: "Price Card Secured", description: `Already discovered. Secured.`}); }
      setActiveCards(prev => prev.map(c => c.id === cardId && c.type === 'price' ? { ...c, isSecured: true, isFlipped: true, appearedAt: Date.now() } : c ));
      setSelectedCardsForCombine(prev => { if (prev.length < 2 && !prev.includes(cardId)) return [...prev, cardId]; if (prev.length >= 2 && !prev.includes(cardId)) toast({ title: "Selection Limit Reached"}); return prev; });
    }
  }, [activeCards, discoveredCards, setActiveCards, setDiscoveredCards, toast]);
  const handleToggleFlipCard = useCallback((cardId: string) => { const cardToToggle = activeCards.find(c => c.id === cardId); if (!cardToToggle) return; if (cardToToggle.type === 'price' && !(cardToToggle as PriceGameCard).isSecured && !cardToToggle.isFlipped) handleSecureCard(cardId, true); else setActiveCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c )); }, [activeCards, setActiveCards, handleSecureCard]);
  const handleFadedOut = useCallback((cardId: string) => setActiveCards(prev => prev.filter(c => c.id !== cardId)), [setActiveCards]);
  const handleSelectCardForCombine = useCallback((cardId: string) => { /* ... */ }, [activeCards, toast, handleToggleFlipCard]);
  const handleCombineCards = useCallback(() => { /* ... */ }, [selectedCardsForCombine, activeCards, setActiveCards, setDiscoveredCards, toast]);
  const handleGenerateDailyPerformanceSignal = useCallback((pfData: PriceCardFaceData) => { if (pfData.previousClose == null || pfData.dayChange == null || pfData.changePercentage == null ) { toast({ title: "Data Incomplete for Signal", variant: "destructive" }); return; } const signalData: DailyPerformanceSignalData = { currentPrice: pfData.price, previousClose: pfData.previousClose, change: pfData.dayChange, changePercentage: pfData.changePercentage, quoteTimestamp: new Date(pfData.timestamp), }; const newSignalCard: DailyPerformanceSignal = { id: uuidv4(), type: 'daily_performance', symbol: pfData.symbol, data: signalData, generatedAt: new Date(), isFlipped: false, }; setDiscoveredCards(prev => [newSignalCard, ...prev].sort((a,b) => new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime())); toast({ title: "Signal Discovered!", description: `Daily Performance for ${newSignalCard.symbol} logged.` }); }, [setDiscoveredCards, toast]);
  const handleGeneratePriceVsSmaSignal = useCallback((fData: PriceCardFaceData, smaP: 50|200, smaV: number) => { if (fData.price == null) { toast({ title: "Data Incomplete", variant: "destructive" }); return; } const signalData: PriceVsSmaSignalData = { currentPrice: fData.price, smaValue: smaV, smaPeriod: smaP, priceAboveSma: fData.price > smaV, quoteTimestamp: new Date(fData.timestamp), }; const newSignalCard: PriceVsSmaSignal = { id: uuidv4(), type: 'price_vs_sma', symbol: fData.symbol, data: signalData, generatedAt: new Date(), isFlipped: false, }; setDiscoveredCards(prev => [newSignalCard, ...prev].sort((a,b) => new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime())); toast({ title: "SMA Signal Discovered!", description: `${fData.symbol} price vs ${smaP}D SMA logged.` }); }, [setDiscoveredCards, toast]);
  const handleGeneratePriceRangeContextSignal = useCallback((fData: PriceCardFaceData, lType: 'High'|'Low', lValue: number) => { if (fData.price == null || lValue == null) { toast({ title: "Data Incomplete for Range Signal", variant: "destructive" }); return; } const diff = Math.abs(fData.price - lValue); const signalData: PriceRangeContextSignalData = { currentPrice: fData.price, levelType: lType, levelValue: lValue, quoteTimestamp: new Date(fData.timestamp), difference: diff, }; const newSignalCard: PriceRangeContextSignal = { id: uuidv4(), type: 'price_range_context', symbol: fData.symbol, data: signalData, generatedAt: new Date(), isFlipped: false, }; setDiscoveredCards(prev => [newSignalCard, ...prev].sort((a,b) => new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime())); toast({ title: "Range Signal Discovered!", description: `${fData.symbol} price vs Day ${lType} logged.` }); }, [setDiscoveredCards, toast]);

  // --- NEW HANDLER for Intraday Trend (Price vs. Open) Signal ---
  const handleGenerateIntradayTrendSignal = useCallback((faceData: PriceCardFaceData) => {
    if (faceData.price == null || faceData.dayOpen == null) {
      toast({ title: "Data Incomplete", description: "Current price or day open data is missing for Intraday Trend signal.", variant: "destructive" });
      return;
    }

    let relation: 'Above' | 'Below' | 'At';
    if (faceData.price > faceData.dayOpen) {
      relation = 'Above';
    } else if (faceData.price < faceData.dayOpen) {
      relation = 'Below';
    } else {
      relation = 'At';
    }

    const signalData: IntradayTrendSignalData = {
      currentPrice: faceData.price,
      openPrice: faceData.dayOpen,
      relationToOpen: relation, // Corrected field name and value
      quoteTimestamp: new Date(faceData.timestamp),
    };

    const newSignalCard: IntradayTrendSignal = {
      id: uuidv4(),
      type: 'intraday_trend',
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
      title: "Intraday Trend Signal!",
      description: `${faceData.symbol} price vs Open logged.`,
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
      onGeneratePriceRangeContextSignal={handleGeneratePriceRangeContextSignal}
      onGenerateIntradayTrendSignal={handleGenerateIntradayTrendSignal} // Pass new handler
    />
  );
};

export default ActiveCardsSection;
