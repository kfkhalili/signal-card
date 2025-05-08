"use client";

import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import useLocalStorage from '@/hooks/use-local-storage'; // Use the actual hook
import type { ActiveGameCard, DiscoveredCard, PriceGameCard, PriceCardFaceData } from '@/components/game/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

// Import the section components
import ActiveCardsSection from '@/components/game/active-cards-section';
import DiscoveredCardsSection from '@/components/game/discovered-cards-section';

// Import the subscription service and types
import { subscribeToPriceUpdates, unsubscribeFromPriceUpdates, type LivePricePayload } from '@/lib/supabase/realtime-service';
import { useToast } from '@/hooks/use-toast';


const INITIAL_ACTIVE_CARDS: ActiveGameCard[] = [];
const INITIAL_DISCOVERED_CARDS: DiscoveredCard[] = [];
const FADE_DURATION_MS = 4 * 60 * 1000;
const SYMBOL_TO_SUBSCRIBE = 'AAPL';

export default function FinSignalGamePage() {
  // Use useLocalStorage again
  const [activeCards, setActiveCards] = useLocalStorage<ActiveGameCard[]>('finSignal-activeCards', INITIAL_ACTIVE_CARDS);
  const [discoveredCards, setDiscoveredCards] = useLocalStorage<DiscoveredCard[]>('finSignal-discoveredCards', INITIAL_DISCOVERED_CARDS);
  const { toast } = useToast();

  // --- Ref workaround for unstable setActiveCards from useLocalStorage ---
  const setActiveCardsRef = useRef(setActiveCards);
  useEffect(() => {
    // Keep the ref updated with the latest setter function from the hook
    setActiveCardsRef.current = setActiveCards;
  }, [setActiveCards]);
  // --- End Ref workaround ---


  // Effect to manage the subscription lifecycle via the service
  useEffect(() => {
    // Callback function to handle price updates
    // Uses the ref to call the state setter, ensuring the latest version is always used
    const handlePriceUpdate = (payload: LivePricePayload) => {
      console.log(`Page: Received Price event (${payload.eventType}):`, payload.new);
      if (payload.eventType === 'DELETE' || !payload.new) return;

      const { symbol, current_price, api_timestamp } = payload.new;

      if (symbol !== SYMBOL_TO_SUBSCRIBE) {
        console.warn("Page: Received non-AAPL price:", payload.new);
        return;
      }

      const priceTimestamp = new Date(api_timestamp * 1000);
      const newPriceCardData: PriceCardFaceData = { symbol: symbol, price: current_price, timestamp: priceTimestamp, };

      // Call the state setter using the ref's current value
      setActiveCardsRef.current(prevActiveCards => {
        const isDuplicateByHHMM = prevActiveCards.some(card => {
          if (card.type === 'price') {
            const existingCardTimestamp = new Date((card as PriceGameCard).faceData.timestamp);
            return ( (card as PriceGameCard).faceData.symbol === newPriceCardData.symbol && existingCardTimestamp.getHours() === priceTimestamp.getHours() && existingCardTimestamp.getMinutes() === priceTimestamp.getMinutes() );
          } return false; });

        if (!isDuplicateByHHMM) {
          const newPriceCard: PriceGameCard = { id: uuidv4(), type: 'price', faceData: newPriceCardData, backData: { explanation: `${symbol}'s stock price at ${format(priceTimestamp, 'PP p')}.` }, isFlipped: false, isSecured: false, appearedAt: Date.now(), initialFadeDurationMs: FADE_DURATION_MS, };
          toast({ title: "New Price Card Appeared!", description: `${symbol}: $${current_price.toFixed(2)} at ${format(priceTimestamp, 'p')}` });
          return [...prevActiveCards, newPriceCard];
        } else {
           const existingCard = prevActiveCards.find(card => { if (card.type === 'price') { return ( (card as PriceGameCard).faceData.symbol === newPriceCardData.symbol && new Date((card as PriceGameCard).faceData.timestamp).getHours() === priceTimestamp.getHours() && new Date((card as PriceGameCard).faceData.timestamp).getMinutes() === priceTimestamp.getMinutes()); } return false; });
          if (existingCard && (existingCard as PriceGameCard).faceData.price !== current_price){ console.log(`Page: Price updated for ${symbol} within same minute: ${current_price}`); }
          else { console.log(`Page: Duplicate/unchanged price card for ${symbol} at ${format(priceTimestamp, 'HH:mm')} skipped.`); }
          return prevActiveCards; // No change if duplicate
        }
      });
    }; // End of handlePriceUpdate

    // Subscribe using the service
    const unsubscribe = subscribeToPriceUpdates(SYMBOL_TO_SUBSCRIBE, handlePriceUpdate);

    // Return the cleanup function provided by the service
    return () => {
      unsubscribe();
    };

  }, []); // Empty dependency array - runs only on mount/unmount


  return (
    <div className="space-y-8">
      {/* Section components remain */}
      <ActiveCardsSection
        activeCards={activeCards}
        setActiveCards={setActiveCards} // Still pass the (potentially unstable) setter down
        discoveredCards={discoveredCards}
        setDiscoveredCards={setDiscoveredCards}
      />
      <DiscoveredCardsSection
        discoveredCards={discoveredCards}
        setDiscoveredCards={setDiscoveredCards}
        activeCards={activeCards}
        setActiveCards={setActiveCards} // Still pass the (potentially unstable) setter down
      />
    </div>
  );
}
