"use client";

import React, { useState, useEffect, useRef } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { ActiveGameCard, DiscoveredCard, PriceGameCard, PriceCardFaceData, PriceCardBackData } from '@/components/game/types'; // Added PriceCardBackData
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

// Import the section components
import ActiveCardsSection from '@/components/game/active-cards-section';
import DiscoveredCardsSection from '@/components/game/discovered-cards-section';

// Import the subscription service and types
import { subscribeToQuoteUpdates, unsubscribeFromQuoteUpdates, type LiveQuotePayload } from '@/lib/supabase/realtime-service';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client'; // Import createClient for initial fetch


const INITIAL_ACTIVE_CARDS: ActiveGameCard[] = [];
const INITIAL_DISCOVERED_CARDS: DiscoveredCard[] = [];
const FADE_DURATION_MS = 4 * 60 * 1000; // Remains for potential future use, but new cards have null
const SYMBOL_TO_SUBSCRIBE = 'AAPL';

// Interface for the shape of data from live_quote_indicators table
interface LiveQuoteIndicatorDBRow {
  id: string;
  symbol: string;
  current_price: number;
  api_timestamp: number; // raw seconds
  fetched_at: string;
  change_percentage?: number | null;
  day_change?: number | null;
  day_low?: number | null;
  day_high?: number | null;
  market_cap?: number | null;
  day_open?: number | null;
  previous_close?: number | null;
  sma_50d?: number | null;
  sma_200d?: number | null;
  volume?: number | null;
}

export type MarketStatus = 'Open' | 'Closed' | 'Delayed' | 'Unknown'; // Define type

export default function FinSignalGamePage() {
  const [activeCards, setActiveCards] = useLocalStorage<ActiveGameCard[]>('finSignal-activeCards', INITIAL_ACTIVE_CARDS);
  const [discoveredCards, setDiscoveredCards] = useLocalStorage<DiscoveredCard[]>('finSignal-discoveredCards', INITIAL_DISCOVERED_CARDS);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>('Unknown'); // New state
  const lastApiTimestampRef = useRef<number | null>(null); // To track the latest api_timestamp
  const { toast } = useToast();

  const setActiveCardsRef = useRef(setActiveCards);
  useEffect(() => {
    setActiveCardsRef.current = setActiveCards;
  }, [setActiveCards]);


  // Effect to manage initial data fetch and subscription lifecycle
  useEffect(() => {
    const supabase = createClient(); // Client for initial fetch

    const updateMarketStatus = (apiTimestampSeconds: number | null) => {
      if (apiTimestampSeconds === null) {
        setMarketStatus('Unknown'); 
        return;
      }

      const now = Date.now();
      const apiTimeMillis = apiTimestampSeconds * 1000;
      const diffMinutes = (now - apiTimeMillis) / (1000 * 60);

      const apiDate = new Date(apiTimeMillis);
      const dayOfWeek = apiDate.getUTCDay(); 
      const hourUTC = apiDate.getUTCHours();

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isOutsideMarketHours = hourUTC < 13 || hourUTC > 21; 

      if (isWeekend || isOutsideMarketHours) {
          if (diffMinutes > 60 * 3) { 
             setMarketStatus('Closed');
          } else if (diffMinutes > 15) { 
             setMarketStatus('Closed'); 
          } else {
             setMarketStatus('Closed'); 
          }
      } else {
        if (diffMinutes > 15) { 
            setMarketStatus('Delayed');
        } else {
            setMarketStatus('Open');
        }
      }
      lastApiTimestampRef.current = apiTimestampSeconds; 
    };

    // --- Function to process quote data and update/create card ---
    const processQuoteData = (quoteData: LiveQuoteIndicatorDBRow | LiveQuotePayload['new'], source: 'fetch' | 'realtime') => {
      if (!quoteData) return;

      console.log(`Page: Processing Quote Data from ${source}:`, quoteData);
      updateMarketStatus(quoteData.api_timestamp); 
      const priceTimestamp = new Date(quoteData.api_timestamp * 1000);

      const newPriceCardFaceData: PriceCardFaceData = {
        symbol: quoteData.symbol,
        price: quoteData.current_price,
        timestamp: priceTimestamp,
        changePercentage: quoteData.change_percentage,
        dayChange: quoteData.day_change,
        dayLow: quoteData.day_low,
        dayHigh: quoteData.day_high,
        volume: quoteData.volume,
        dayOpen: quoteData.day_open,
        previousClose: quoteData.previous_close,
      };

      const newPriceCardBackData: PriceCardBackData = {
        explanation: `${quoteData.symbol} - Daily Stats & Technicals`, 
        marketCap: quoteData.market_cap,
        sma50d: quoteData.sma_50d,
        sma200d: quoteData.sma_200d,
      };

      setActiveCardsRef.current(prevActiveCards => {
        const existingCardIndex = prevActiveCards.findIndex(card => card.type === 'price' && (card as PriceGameCard).faceData.symbol === SYMBOL_TO_SUBSCRIBE);

        if (existingCardIndex !== -1) { // Update existing card
          const existingCard = prevActiveCards[existingCardIndex] as PriceGameCard;
          if (source === 'realtime' && priceTimestamp.getTime() <= new Date(existingCard.faceData.timestamp).getTime() && quoteData.current_price === existingCard.faceData.price) {
              console.log(`Page: Stale/unchanged realtime quote data skipped for ${quoteData.symbol}`);
              return prevActiveCards;
          }

          const updatedCard: PriceGameCard = {
            ...existingCard,
            faceData: newPriceCardFaceData,  // Assign new rich face data
            backData: newPriceCardBackData,   // Assign new rich back data
            appearedAt: Date.now(), 
          };
          console.log(`Page: Updating existing card for ${quoteData.symbol} from ${source}`);
          const newCards = [...prevActiveCards];
          newCards[existingCardIndex] = updatedCard;
          if (source === 'realtime') { 
            toast({ title: "Live Card Updated!", description: `${quoteData.symbol}: $${quoteData.current_price.toFixed(2)}`});
          }
          return newCards;

        } else { // Create initial card
          console.log(`Page: Creating initial card for ${quoteData.symbol} from ${source}`);
          const newPriceCard: PriceGameCard = {
            id: `${SYMBOL_TO_SUBSCRIBE}-live-card`, 
            type: 'price',
            faceData: newPriceCardFaceData, // Assign new rich face data
            backData: newPriceCardBackData,  // Assign new rich back data
            isFlipped: false,
            isSecured: true,
            appearedAt: Date.now(),
            initialFadeDurationMs: null, 
          };
          if (source === 'fetch') { 
            toast({ title: "Live Card Loaded!", description: `${quoteData.symbol}: $${quoteData.current_price.toFixed(2)}` });
          } else {
             toast({ title: "Live Card Added!", description: `${quoteData.symbol}: $${quoteData.current_price.toFixed(2)}` });
          }
          return [...prevActiveCards, newPriceCard];
        }
      });
    }; // End of processQuoteData


    let unsubscribeFromRealtime = () => {};
    const setupSubscription = async () => {
      await fetchInitialData();
      console.log("Page: Initial data fetch attempt complete. Setting up realtime subscription.");
      unsubscribeFromRealtime = subscribeToQuoteUpdates(SYMBOL_TO_SUBSCRIBE, handleRealtimeUpdate);
    };

    const fetchInitialData = async () => {
      console.log("Page: Attempting to fetch initial data for", SYMBOL_TO_SUBSCRIBE);
      const { data, error } = await supabase.from('live_quote_indicators').select('*').eq('symbol', SYMBOL_TO_SUBSCRIBE).order('fetched_at', { ascending: false }).limit(1).single();
      if (error && error.code !== 'PGRST116') { console.error("Page: Error fetching initial data:", error); updateMarketStatus(null); }
      else if (data) { processQuoteData(data as LiveQuoteIndicatorDBRow, 'fetch'); }
      else { console.log("Page: No initial data found for", SYMBOL_TO_SUBSCRIBE); updateMarketStatus(null); }
    };

    const handleRealtimeUpdate = (payload: LiveQuotePayload) => {
      if (payload.eventType === 'DELETE' || !payload.new) return;
      processQuoteData(payload.new, 'realtime');
    };
    
    setupSubscription();
    return () => {
        console.log("Page: useEffect cleanup - calling unsubscribe function.");
        unsubscribeFromRealtime();
    };

  }, []); // Empty dependency array - runs only on mount/unmount


  return (
    <div className="space-y-8">
      {/* Display Market Status */}
      <div className="text-center p-2 bg-muted text-muted-foreground rounded-md text-sm">
        Market Status: <span className="font-semibold">{marketStatus}</span>
        {(marketStatus === 'Closed' || marketStatus === 'Delayed') && lastApiTimestampRef.current && (
          <span className="text-xs block"> (Last FMP Data: {format(new Date(lastApiTimestampRef.current * 1000), 'PPpp')})</span>
        )}
      </div>

      <ActiveCardsSection
        activeCards={activeCards}
        setActiveCards={setActiveCards}
        discoveredCards={discoveredCards}
        setDiscoveredCards={setDiscoveredCards}
      />
      <DiscoveredCardsSection
        discoveredCards={discoveredCards}
        setDiscoveredCards={setDiscoveredCards}
        activeCards={activeCards}
        setActiveCards={setActiveCards}
      />
    </div>
  );
}
