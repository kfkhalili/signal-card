"use client";

import React, { useCallback } from 'react';
import type { DiscoveredCard, PriceGameCard, PriceDiscoverySignal, ActiveGameCard } from './types';
import DiscoveredCardsPresentational from './discovered-cards'; // Renamed to avoid confusion
import { useToast } from '@/hooks/use-toast';

const FADE_DURATION_MS = 4 * 60 * 1000; // Default, can be prop if needed by logic here

interface DiscoveredCardsSectionProps {
  discoveredCards: DiscoveredCard[];
  setDiscoveredCards: React.Dispatch<React.SetStateAction<DiscoveredCard[]>>;
  activeCards: ActiveGameCard[]; // Needed for handleDeleteDiscoveredCard
  setActiveCards: React.Dispatch<React.SetStateAction<ActiveGameCard[]>>;
  // toast: ReturnType<typeof useToast>['toast']; // If toast is passed from page.tsx
}

const DiscoveredCardsSection: React.FC<DiscoveredCardsSectionProps> = ({
  discoveredCards,
  setDiscoveredCards,
  activeCards, // Added to props
  setActiveCards,
  // toast, // Use local toast for now
}) => {
  const { toast } = useToast(); // Local toast instance

  const handleToggleFlipDiscoveredCard = useCallback((cardId: string) => {
    setDiscoveredCards(prevCards =>
      prevCards.map(s =>
        s.id === cardId ? { ...s, isFlipped: !s.isFlipped, hasBeenFlippedAtLeastOnce: true } : s
      )
    );
  }, [setDiscoveredCards]);

  const handleDeleteDiscoveredCard = useCallback((cardId: string) => {
    const cardToDelete = discoveredCards.find(s => s.id === cardId);
    if (!cardToDelete) return;

    setDiscoveredCards(prevCards => prevCards.filter(s => s.id !== cardId));

    let toastMessage = "Card deleted from discovered list.";

    // If a discovered price point is deleted, unsecure the corresponding active card (if any) and restart its timer
    if (cardToDelete.type === 'price_discovery') {
      const deletedDiscoverySignal = cardToDelete as PriceDiscoverySignal;
      setActiveCards(prevActiveCards => 
        prevActiveCards.map(activeCard => {
          if (activeCard.type === 'price') {
            const priceGameCard = activeCard as PriceGameCard;
            if (
              priceGameCard.faceData.symbol === deletedDiscoverySignal.symbol &&
              priceGameCard.faceData.price === deletedDiscoverySignal.price &&
              new Date(priceGameCard.faceData.timestamp).getTime() === new Date(deletedDiscoverySignal.timestamp).getTime() &&
              priceGameCard.isSecured 
            ) {
              toastMessage = `Card deleted. Corresponding active card unsecured and timer restarted.`;
              return {
                ...priceGameCard,
                isSecured: false,
                isFlipped: false, 
                appearedAt: Date.now(), // Reset timer for unsecured card
                initialFadeDurationMs: FADE_DURATION_MS // Ensure it gets a fade duration
              };
            }
          }
          return activeCard;
        })
      );
    }
    toast({ title: "Card Update", description: toastMessage });
  }, [discoveredCards, setDiscoveredCards, setActiveCards, toast]); // Added activeCards and setActiveCards to dependencies

  return (
    <DiscoveredCardsPresentational
      cards={discoveredCards}
      onToggleFlipCard={handleToggleFlipDiscoveredCard}
      onDeleteCard={handleDeleteDiscoveredCard}
    />
  );
};

export default DiscoveredCardsSection;
