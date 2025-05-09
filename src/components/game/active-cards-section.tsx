"use client";

import React, { useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { 
  ActiveGameCard, 
  PriceGameCard, 
  PriceCardFaceData, 
  DiscoveredCard, // Still needed for the sort date helper arg type
  DailyPerformanceSignal,
  DailyPerformanceSignalData,
  PriceVsSmaSignal,
  PriceVsSmaSignalData,
  PriceRangeContextSignal,
  PriceRangeContextSignalData,
  IntradayTrendSignal, 
  IntradayTrendSignalData,
  PriceSnapshotSignal, PriceSnapshotSignalData,
  DisplayableCard 
} from './types';
import { ActiveCards as ActiveCardsPresentational } from './active-cards'; // Changed to named import with alias
import { useToast } from '@/hooks/use-toast';

interface ActiveCardsSectionProps {
  activeCards: DisplayableCard[]; 
  setActiveCards: React.Dispatch<React.SetStateAction<DisplayableCard[]>>;
}

// This helper is for sorting DiscoveredCard types if they were in a separate list.
// If all cards (live + signals) are in activeCards and need specific sorting, this might need adjustment.
// For now, signal cards are just prepended/appended to activeCards.
const getDiscoveredCardSortDate = (card: DiscoveredCard): Date => {
  if (card.type === 'price_discovery') return (card as any).discoveredAt; // price_discovery is deprecated
  if (card.type === 'price_change') return (card as any).generatedAt; // price_change is deprecated
  return (card as DailyPerformanceSignal | PriceVsSmaSignal | PriceRangeContextSignal | IntradayTrendSignal | PriceSnapshotSignal).generatedAt;
};

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
}) => {
  const { toast } = useToast();

  const setActiveCardsRef = useRef(setActiveCards);
  useEffect(() => { setActiveCardsRef.current = setActiveCards; }, [setActiveCards]);

  const handleToggleFlipCard = useCallback((cardId: string) => {
    setActiveCardsRef.current(prevCards => { 
      const newCards = prevCards.map(c => c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c );
      return newCards;
    });
  }, []); 

  const handleFadedOut = useCallback((cardId: string) => {
    console.log(`ActiveCardsSection: handleFadedOut called for ${cardId} - card should not fade.`);
  }, []); 

  // --- NEW HANDLER for Deleting a Card ---
  const handleDeleteCard = useCallback((cardIdToDelete: string) => {
    console.log(`ActiveCardsSection: handleDeleteCard called for ID: ${cardIdToDelete}`);
    setActiveCardsRef.current(prevCards => 
      prevCards.filter(card => card.id !== cardIdToDelete)
    );
    toast({ title: "Card Removed", description: "The signal card has been removed." });
  }, [toast]); // setActiveCards is via ref

  // --- Signal Generation Handlers update activeCards ---
  const handleGenerateDailyPerformanceSignal = useCallback((pfData: PriceCardFaceData) => { 
    if (pfData.previousClose == null || pfData.dayChange == null || pfData.changePercentage == null ) { toast({ title: "Data Incomplete", variant: "destructive" }); return; } 
    const sD: DailyPerformanceSignalData = { currentPrice: pfData.price, previousClose: pfData.previousClose, change: pfData.dayChange, changePercentage: pfData.changePercentage, quoteTimestamp: new Date(pfData.timestamp), }; 
    const nSC: DailyPerformanceSignal = { id: uuidv4(), type: 'daily_performance', symbol: pfData.symbol, data: sD, generatedAt: new Date(), isFlipped: false, hasBeenFlippedAtLeastOnce: false }; 
    setActiveCardsRef.current(prev => [prev[0], nSC, ...prev.slice(1)]); 
    toast({ title: "Signal Discovered!", description: `Daily Performance logged.` }); 
  }, [toast]);

  const handleGeneratePriceVsSmaSignal = useCallback((fData: PriceCardFaceData, smaP: 50|200, smaV: number) => { 
    if (fData.price == null) { toast({ title: "Data Incomplete", variant: "destructive" }); return; } 
    const sD: PriceVsSmaSignalData = { currentPrice: fData.price, smaValue: smaV, smaPeriod: smaP, priceAboveSma: fData.price > smaV, quoteTimestamp: new Date(fData.timestamp), }; 
    const nSC: PriceVsSmaSignal = { id: uuidv4(), type: 'price_vs_sma', symbol: fData.symbol, data: sD, generatedAt: new Date(), isFlipped: false, hasBeenFlippedAtLeastOnce: false }; 
    setActiveCardsRef.current(prev => [prev[0], nSC, ...prev.slice(1)]); 
    toast({ title: "SMA Signal Discovered!", description: `Price vs ${smaP}D SMA logged.` }); 
  }, [toast]);

  const handleGeneratePriceRangeContextSignal = useCallback((fData: PriceCardFaceData, lType: 'High'|'Low', lValue: number) => { 
    if (fData.price == null || lValue == null) { toast({ title: "Data Incomplete", variant: "destructive" }); return; } 
    const diff = Math.abs(fData.price - lValue); 
    const sD: PriceRangeContextSignalData = { currentPrice: fDatal.price, levelType: lType, levelValue: lValue, quoteTimestamp: new Date(fData.timestamp), difference: diff, }; 
    const nSC: PriceRangeContextSignal = { id: uuidv4(), type: 'price_range_context', symbol: fData.symbol, data: sD, generatedAt: new Date(), isFlipped: false, hasBeenFlippedAtLeastOnce: false }; 
    setActiveCardsRef.current(prev => [prev[0], nSC, ...prev.slice(1)]);
    toast({ title: "Range Signal Discovered!", description: `Price vs Day ${lType} logged.` }); 
  }, [toast]);

  const handleGenerateIntradayTrendSignal = useCallback((fData: PriceCardFaceData) => { 
    if (fData.price == null || fData.dayOpen == null) { toast({ title: "Data Incomplete", variant: "destructive"}); return; } 
    let rel: 'Above'|'Below'|'At'; if(fData.price > fData.dayOpen) rel='Above'; else if (fData.price < fData.dayOpen) rel='Below'; else rel='At'; 
    const sD: IntradayTrendSignalData = {currentPrice:fData.price, openPrice:fData.dayOpen, relationToOpen:rel, quoteTimestamp:new Date(fData.timestamp)}; 
    const nSC: IntradayTrendSignal = {id:uuidv4(), type:'intraday_trend', symbol:fData.symbol, data:sD, generatedAt:new Date(), isFlipped:false, hasBeenFlippedAtLeastOnce: false};
    setActiveCardsRef.current(prev => [prev[0], nSC, ...prev.slice(1)]);
    toast({title:"Intraday Trend Signal!", description:`Price vs Open logged.`}); 
  }, [toast]);

  const handleTakeSnapshot = useCallback((priceCard: PriceGameCard) => { 
    if (!priceCard || !priceCard.faceData || !priceCard.backData) { toast({ title: "Snapshot Error", variant: "destructive" }); return; } 
    const snapData: PriceSnapshotSignalData = { faceData: { ...priceCard.faceData }, backData: { ...priceCard.backData }, quoteTimestamp: new Date(priceCard.faceData.timestamp), }; 
    const newSnapSignal: PriceSnapshotSignal = { id: uuidv4(), type: 'price_snapshot', symbol: priceCard.faceData.symbol, data: snapData, generatedAt: new Date(), isFlipped: false, hasBeenFlippedAtLeastOnce: false }; 
    setActiveCardsRef.current(prev => [prev[0], newSnapSignal, ...prev.slice(1)]);
    toast({ title: "Snapshot Taken!", description: `Snapshot of ${priceCard.faceData.symbol} logged.`}); 
  }, [toast]);

  return (
    <ActiveCardsPresentational
      cards={activeCards}
      onFadedOut={handleFadedOut} 
      onToggleFlipCard={handleToggleFlipCard}
      onDeleteCard={handleDeleteCard} // Pass new handler
      onGenerateDailyPerformanceSignal={handleGenerateDailyPerformanceSignal}
      onGeneratePriceVsSmaSignal={handleGeneratePriceVsSmaSignal}
      onGeneratePriceRangeContextSignal={handleGeneratePriceRangeContextSignal}
      onGenerateIntradayTrendSignal={handleGenerateIntradayTrendSignal}
      onTakeSnapshot={handleTakeSnapshot} 
    />
  );
};

export default ActiveCardsSection;
