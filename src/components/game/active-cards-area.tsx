import React, { useState, useEffect } from 'react';
import type { ActiveGameCard, PriceGameCard } from './types';
import GameCard from './game-card';
import { Button } from '@/components/ui/button';

interface ActiveCardsAreaProps {
  cards: ActiveGameCard[];
  onSecureCard: (cardId: string) => void;
  onExamineCard: (card: PriceGameCard) => void;
  onFadedOut: (cardId: string) => void;
  selectedCardsForCombine: string[];
  onSelectCardForCombine: (cardId: string) => void;
  onCombineCards: () => void;
  onToggleFlipCard: (cardId: string) => void;
}

const ActiveCardsArea: React.FC<ActiveCardsAreaProps> = ({
  cards,
  onSecureCard,
  onExamineCard,
  onFadedOut,
  selectedCardsForCombine,
  onSelectCardForCombine,
  onCombineCards,
  onToggleFlipCard,
}) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const canCombine = selectedCardsForCombine.length === 2;

  // This structure prevents mismatched content between server and client initial render
  if (!hasMounted) {
    return (
      <div className="flex-grow p-4 bg-secondary/30 rounded-lg shadow-inner min-h-[400px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-foreground">Active Cards Area</h2>
          <Button onClick={onCombineCards} disabled={!canCombine}>
            Combine Selected ({selectedCardsForCombine.length}/2)
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <p className="col-span-full text-muted-foreground text-center py-10">Loading cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow p-4 bg-secondary/30 rounded-lg shadow-inner min-h-[400px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-foreground">Active Cards Area</h2>
        <Button onClick={onCombineCards} disabled={!canCombine}>
          Combine Selected ({selectedCardsForCombine.length}/2)
        </Button>
      </div>
      
      {cards.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No active cards. New cards will appear automatically.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <GameCard
              key={card.id}
              card={card}
              onSecureCard={onSecureCard}
              onExamineCard={onExamineCard}
              onFadedOut={onFadedOut}
              onSelectForCombine={onSelectCardForCombine}
              isSelectedForCombine={selectedCardsForCombine.includes(card.id)}
              onToggleFlip={onToggleFlipCard}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveCardsArea;