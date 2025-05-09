"use client";

import React, { useState, useEffect, useRef } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { ActiveGameCard, DiscoveredCard, PriceGameCard, PriceCardFaceData } from '@/components/game/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

import ActiveCardsSection from '@/components/game/active-cards-section';
import DiscoveredCardsSection from '@/components/game/discovered-cards-section';

import { subscribeToQuoteUpdates, unsubscribeFromQuoteUpdates, type LiveQuotePayload } from '@/lib/supabase/realtime-service';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

const INITIAL_ACTIVE_CARDS: ActiveGameCard[] = [];
const INITIAL_DISCOVERED_CARDS: DiscoveredCard[] = [];
const FADE_DURATION_MS = 4 * 60 * 1000;
const SYMBOL_TO_SUBSCRIBE = 'AAPL';

// Updated interface to match live_quote_indicators table for DB row
interface LiveQuoteIndicatorDBRow {
  id: string;
  symbol: string;
  current_price: number;
  api_timestamp: number; 
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
  is_market_open?: boolean | null; // NEW
  market_status_message?: string | null; // NEW
  market_exchange_name?: string | null; // NEW
}

export type MarketStatusDisplay = 'Open' | 'Closed' | 'Delayed' | 'Unknown' | 'Error';

export default function FinSignalGamePage() {
  const [activeCards, setActiveCards] = useLocalStorage<ActiveGameCard[]>('finSignal-activeCards', INITIAL_ACTIVE_CARDS);
  const [discoveredCards, setDiscoveredCards] = useLocalStorage<DiscoveredCard[]>('finSignal-discoveredCards', INITIAL_DISCOVERED_CARDS);
  const [marketStatusDisplay, setMarketStatusDisplay] = useState<MarketStatusDisplay>('Unknown');
  const [marketStatusMessage, setMarketStatusMessage] = useState<string | null>(null);
  const lastApiTimestampRef = useRef<number | null>(null);
  const { toast } = useToast();

  const setActiveCardsRef = useRef(setActiveCards);
  useEffect(() => {
    setActiveCardsRef.current = setActiveCards;
  }, [setActiveCards]);

  useEffect(() => {
    const supabase = createClient();

    const updateDisplayStatus = (quote: LiveQuoteIndicatorDBRow | LiveQuotePayload['new'] | null) => {
      if (!quote || quote.is_market_open === null || quote.is_market_open === undefined) {
        setMarketStatusDisplay('Unknown');
        setMarketStatusMessage('Market status currently unavailable.');
        lastApiTimestampRef.current = quote?.api_timestamp ?? null;
        return;
      }

      lastApiTimestampRef.current = quote.api_timestamp;
      setMarketStatusMessage(quote.market_status_message || (quote.is_market_open ? "Market is Open" : "Market is Closed"));

      if (quote.is_market_open) {
        const now = Date.now();
        const apiTimeMillis = quote.api_timestamp * 1000;
        const diffMinutes = (now - apiTimeMillis) / (1000 * 60);
        if (diffMinutes > 15) {
          setMarketStatusDisplay('Delayed');
        } else {
          setMarketStatusDisplay('Open');
        }
      } else {
        setMarketStatusDisplay('Closed');
      }
    };

    const processQuoteData = (quoteData: LiveQuoteIndicatorDBRow | LiveQuotePayload['new'], source: 'fetch' | 'realtime') => {
      if (!quoteData) return;
      console.log(`Page: Processing Quote Data from ${source}:`, quoteData);
      updateDisplayStatus(quoteData);
      
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
        explanation: `${quoteData.symbol} - Details`, 
        marketCap: quoteData.market_cap,
        sma50d: quoteData.sma_50d,
        sma200d: quoteData.sma_200d,
      };

      setActiveCardsRef.current(prevActiveCards => {
        const existingCardIndex = prevActiveCards.findIndex(card => card.type === 'price' && (card as PriceGameCard).faceData.symbol === SYMBOL_TO_SUBSCRIBE);
        let cardUpdatedOrCreated = false;

        if (existingCardIndex !== -1) {
          const existingCard = prevActiveCards[existingCardIndex] as PriceGameCard;
          if (source === 'realtime' && priceTimestamp.getTime() <= new Date(existingCard.faceData.timestamp).getTime() && quoteData.current_price === existingCard.faceData.price) {
              console.log(`Page: Stale/unchanged realtime quote data skipped for ${quoteData.symbol}`);
              return prevActiveCards;
          }
          const updatedCard: PriceGameCard = { ...existingCard, faceData: newPriceCardFaceData, backData: newPriceCardBackData, appearedAt: Date.now() };
          console.log(`Page: Updating existing card for ${quoteData.symbol} from ${source}`);
          const newCards = [...prevActiveCards];
          newCards[existingCardIndex] = updatedCard;
          if (source === 'realtime') toast({ title: "Live Card Updated!", description: `${quoteData.symbol}: $${quoteData.current_price.toFixed(2)}`});
          cardUpdatedOrCreated = true;
          return newCards;
        } else {
          console.log(`Page: Creating initial card for ${quoteData.symbol} from ${source}`);
          const newPriceCard: PriceGameCard = { id: `${SYMBOL_TO_SUBSCRIBE}-live-card`, type: 'price', faceData: newPriceCardFaceData, backData: newPriceCardBackData, isFlipped: false, isSecured: true, appearedAt: Date.now(), initialFadeDurationMs: null };
          toast({ title: "Live Card Loaded!", description: `${quoteData.symbol}: $${quoteData.current_price.toFixed(2)}` });
          cardUpdatedOrCreated = true;
          return [...prevActiveCards, newPriceCard];
        }
      });
    };

    let unsubscribeFromRealtime = () => {};
    const setupSubscription = async () => {
      await fetchInitialData();
      console.log("Page: Initial data fetch attempt complete. Setting up realtime subscription.");
      unsubscribeFromRealtime = subscribeToQuoteUpdates(SYMBOL_TO_SUBSCRIBE, handleRealtimeUpdate);
    };

    const fetchInitialData = async () => {
      console.log("Page: Attempting to fetch initial data for", SYMBOL_TO_SUBSCRIBE);
      const { data, error } = await supabase.from('live_quote_indicators').select('*').eq('symbol', SYMBOL_TO_SUBSCRIBE).order('fetched_at', { ascending: false }).limit(1).single();
      if (error && error.code !== 'PGRST116') { 
        console.error("Page: Error fetching initial data:", error); 
        updateDisplayStatus(null); // Update status to unknown/error
      }
      else if (data) { processQuoteData(data as LiveQuoteIndicatorDBRow, 'fetch'); }
      else { console.log("Page: No initial data found for", SYMBOL_TO_SUBSCRIBE); updateDisplayStatus(null); }
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
  }, []); 

  return (
    <div className="space-y-8">
      <div className="text-center p-2 bg-muted text-muted-foreground rounded-md text-sm">
        Status: <span className="font-semibold">{marketStatusDisplay}</span>
        {marketStatusMessage && <span className="text-xs block">({marketStatusMessage})</span>}
        {(marketStatusDisplay === 'Closed' || marketStatusDisplay === 'Delayed') && lastApiTimestampRef.current && (
          <span className="text-xs block">Last FMP Data: {format(new Date(lastApiTimestampRef.current * 1000), 'PP p')}</span>
        )}
      </div>

      <ActiveCardsSection activeCards={activeCards} setActiveCards={setActiveCards} discoveredCards={discoveredCards} setDiscoveredCards={setDiscoveredCards} />
      <DiscoveredCardsSection discoveredCards={discoveredCards} setDiscoveredCards={setDiscoveredCards} activeCards={activeCards} setActiveCards={setActiveCards} />
    </div>
  );
}
