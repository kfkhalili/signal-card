
import React, { useState, useEffect } from 'react';
import type { ActiveGameCard, PriceGameCard } from './types';
import GameCard from './game-card';
import { Button } from '@/components/ui/button';

interface ActiveCardsProps {
  cards: ActiveGameCard[];
  onSecureCard: (cardId: string) => void;
  onExamineCard: (card: PriceGameCard) => void;
  onFadedOut: (cardId: string) => void;
  selectedCardsForCombine: string[];
  onSelectCardForCombine: (cardId: string) => void;
  onCombineCards: () => void;
  onToggleFlipCard: (cardId: string) => void;
  newCardCountdownSeconds: number | null;
}

const ActiveCards: React.FC<ActiveCardsProps> = ({
  cards,
  onSecureCard,
  onExamineCard,
  onFadedOut,
  selectedCardsForCombine,
  onSelectCardForCombine,
  onCombineCards,
  onToggleFlipCard,
  newCardCountdownSeconds,
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
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold text-foreground">Active Cards</h2>
             {/* Placeholder for countdown during initial server render if needed, or hide */}
          </div>
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
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-foreground">Active Cards</h2>
          {newCardCountdownSeconds !== null && newCardCountdownSeconds >= 0 && (
            <span className="text-sm text-muted-foreground tabular-nums">
              New Card in {newCardCountdownSeconds}s
            </span>
          )}
        </div>
        <Button onClick={onCombineCards} disabled={!canCombine}>
          Combine Selected ({selectedCardsForCombine.length}/2)
        </Button>
      </div>
      
      {cards.length === 0 ? (
         <div className="flex items-center justify-center h-[300px]"> {/* Adjust height as needed */}
          <p className="text-muted-foreground text-center py-10">No active cards. New cards will appear automatically.</p>
        </div>
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

export default ActiveCards;
