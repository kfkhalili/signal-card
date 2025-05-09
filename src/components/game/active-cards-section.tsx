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
  IntradayTrendSignalData,
  PriceSnapshotSignal, PriceSnapshotSignalData
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
  return (card as DailyPerformanceSignal | PriceVsSmaSignal | PriceRangeContextSignal | IntradayTrendSignal | PriceSnapshotSignal).generatedAt;
};

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
  discoveredCards, 
  setDiscoveredCards,
}) => {
  const [selectedCardsForCombine, setSelectedCardsForCombine] = useState<string[]>([]);
  const { toast } = useToast();

  const handleSecureCard = useCallback((cardId: string, fromFlip: boolean = false) => { 
    console.log(`ActiveCardsSection: handleSecureCard called for ${cardId}, fromFlip: ${fromFlip}`);
    const cardBeingSecured = activeCards.find(c => c.id === cardId && c.type === 'price') as PriceGameCard | undefined; 
    if (!cardBeingSecured) {
        console.error("ActiveCardsSection: Card to secure not found!");
        return;
    }
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
  
  const handleToggleFlipCard = useCallback((cardId: string) => {
    console.log(`ActiveCardsSection: handleToggleFlipCard called for ID: ${cardId}`); // LOG 1
    const cardToToggle = activeCards.find(c => c.id === cardId);
    if (!cardToToggle) {
      console.error("ActiveCardsSection: Card to toggle not found!");
      return;
    }
    console.log(`ActiveCardsSection: Card found. Current isFlipped: ${cardToToggle.isFlipped}`); // LOG 2

    if (cardToToggle.type === 'price' && !(cardToToggle as PriceGameCard).isSecured && !cardToToggle.isFlipped) {
      console.log("ActiveCardsSection: Unsecured price card, securing (will also flip)..."); // LOG 3A
      handleSecureCard(cardId, true);
    } else {
      console.log("ActiveCardsSection: Standard flip for secured/trend card..."); // LOG 3B
      setActiveCards(prevCards => {
        const newCards = prevCards.map(c =>
          c.id === cardId
            ? { ...c, isFlipped: !c.isFlipped }
            : c
        );
        const changedCard = newCards.find(c => c.id === cardId);
        console.log(`ActiveCardsSection: setActiveCards called. New isFlipped for ${cardId} should be: ${changedCard?.isFlipped}`); // LOG 4
        return newCards;
      });
    }
  }, [activeCards, setActiveCards, handleSecureCard]);

  // Simplified other handlers for brevity in this update, ensure they are complete in your actual file
  const handleFadedOut = useCallback((cardId: string) => setActiveCards(prev => prev.filter(c => c.id !== cardId)), [setActiveCards]);
  const handleSelectCardForCombine = useCallback((cardId: string) => { console.log("handleSelectCardForCombine called - likely deprecated"); }, [activeCards, toast, handleToggleFlipCard]);
  const handleCombineCards = useCallback(() => { console.log("handleCombineCards called - likely deprecated"); }, [selectedCardsForCombine, activeCards, setActiveCards, setDiscoveredCards, toast]);
  const handleGenerateDailyPerformanceSignal = useCallback((pfData: PriceCardFaceData) => { if (pfData.previousClose == null || pfData.dayChange == null || pfData.changePercentage == null ) { toast({ title: "Data Incomplete for Signal", variant: "destructive" }); return; } const signalData: DailyPerformanceSignalData = { currentPrice: pfData.price, previousClose: pfData.previousClose, change: pfData.dayChange, changePercentage: pfData.changePercentage, quoteTimestamp: new Date(pfData.timestamp), }; const newSignalCard: DailyPerformanceSignal = { id: uuidv4(), type: 'daily_performance', symbol: pfData.symbol, data: signalData, generatedAt: new Date(), isFlipped: false, }; setDiscoveredCards(prev => [newSignalCard, ...prev].sort((a,b) => new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime())); toast({ title: "Signal Discovered!", description: `Daily Performance for ${newSignalCard.symbol} logged.` }); }, [setDiscoveredCards, toast]);
  const handleGeneratePriceVsSmaSignal = useCallback((fData: PriceCardFaceData, smaP: 50|200, smaV: number) => { if (fData.price == null) { toast({ title: "Data Incomplete", variant: "destructive" }); return; } const signalData: PriceVsSmaSignalData = { currentPrice: fData.price, smaValue: smaV, smaPeriod: smaP, priceAboveSma: fData.price > smaV, quoteTimestamp: new Date(fData.timestamp), }; const newSignalCard: PriceVsSmaSignal = { id: uuidv4(), type: 'price_vs_sma', symbol: fData.symbol, data: signalData, generatedAt: new Date(), isFlipped: false, }; setDiscoveredCards(prev => [newSignalCard, ...prev].sort((a,b) => new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime())); toast({ title: "SMA Signal Discovered!", description: `${fData.symbol} price vs ${smaP}D SMA logged.` }); }, [setDiscoveredCards, toast]);
  const handleGeneratePriceRangeContextSignal = useCallback((fData: PriceCardFaceData, lType: 'High'|'Low', lValue: number) => { if (fData.price == null || lValue == null) { toast({ title: "Data Incomplete for Range Signal", variant: "destructive" }); return; } const diff = Math.abs(fData.price - lValue); const signalData: PriceRangeContextSignalData = { currentPrice: fData.price, levelType: lType, levelValue: lValue, quoteTimestamp: new Date(fData.timestamp), difference: diff, }; const newSignalCard: PriceRangeContextSignal = { id: uuidv4(), type: 'price_range_context', symbol: fData.symbol, data: signalData, generatedAt: new Date(), isFlipped: false, }; setDiscoveredCards(prev => [newSignalCard, ...prev].sort((a,b) => new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime())); toast({ title: "Range Signal Discovered!", description: `${fData.symbol} price vs Day ${lType} logged.` }); }, [setDiscoveredCards, toast]);
  const handleGenerateIntradayTrendSignal = useCallback((fData: PriceCardFaceData) => { if (fData.price == null || fData.dayOpen == null) { toast({ title: "Data Incomplete", variant: "destructive"}); return; } let rel: 'Above'|'Below'|'At'; if(fData.price > fData.dayOpen) rel='Above'; else if (fData.price < fData.dayOpen) rel='Below'; else rel='At'; const sD: IntradayTrendSignalData = {currentPrice:fData.price, openPrice:fData.dayOpen, relationToOpen:rel, quoteTimestamp:new Date(fData.timestamp)}; const nSC: IntradayTrendSignal = {id:uuidv4(), type:'intraday_trend', symbol:fData.symbol, data:sD, generatedAt:new Date(), isFlipped:false}; setDiscoveredCards(prev => [nSC, ...prev].sort((a,b) => new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime())); toast({title:"Intraday Trend Signal!", description:`${fData.symbol} price vs Open logged.`}); }, [setDiscoveredCards, toast]);
  const handleTakeSnapshot = useCallback((priceCard: PriceGameCard) => { if (!priceCard || !priceCard.faceData || !priceCard.backData) { toast({ title: "Snapshot Error", variant: "destructive" }); return; } const snapData: PriceSnapshotSignalData = { faceData: { ...priceCard.faceData }, backData: { ...priceCard.backData }, quoteTimestamp: new Date(priceCard.faceData.timestamp), }; const newSnapSignal: PriceSnapshotSignal = { id: uuidv4(), type: 'price_snapshot', symbol: priceCard.faceData.symbol, data: snapData, generatedAt: new Date(), isFlipped: false, }; setDiscoveredCards(prev => [newSnapSignal, ...prev].sort((a,b) => new Date(getDiscoveredCardSortDate(b)).getTime() - new Date(getDiscoveredCardSortDate(a)).getTime())); toast({ title: "Snapshot Taken!", description: `Snapshot of ${priceCard.faceData.symbol} logged.`}); }, [setDiscoveredCards, toast]);

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
      onGenerateIntradayTrendSignal={handleGenerateIntradayTrendSignal}
      onTakeSnapshot={handleTakeSnapshot} 
    />
  );
};

export default ActiveCardsSection;
