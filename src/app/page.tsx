"use client";

import React from 'react'; 
import useLocalStorage from '@/hooks/use-local-storage';
import type { ActiveGameCard, DiscoveredCard } from '@/components/game/types';

import ActiveCardsSection from '@/components/game/active-cards-section';
import DiscoveredCardsSection from '@/components/game/discovered-cards-section';

const INITIAL_ACTIVE_CARDS: ActiveGameCard[] = [];
const INITIAL_DISCOVERED_CARDS: DiscoveredCard[] = [];

export default function FinSignalGamePage() {
  const [activeCards, setActiveCards] = useLocalStorage<ActiveGameCard[]>('finSignal-activeCards', INITIAL_ACTIVE_CARDS);
  const [discoveredCards, setDiscoveredCards] = useLocalStorage<DiscoveredCard[]>('finSignal-discoveredCards', INITIAL_DISCOVERED_CARDS);

  return (
    <div className="space-y-8">
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
