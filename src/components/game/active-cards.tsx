
import React, { useState, useEffect } from 'react';
import type { ActiveGameCard, PriceGameCard, PriceCardFaceData } from './types';
import GameCard from './game-card';
import { Button } from '@/components/ui/button';

interface ActiveCardsProps {
  cards: ActiveGameCard[];
  onSecureCard: (cardId: string) => void;
  onFadedOut: (cardId: string) => void;
  selectedCardsForCombine: string[];
  onSelectCardForCombine: (cardId: string) => void;
  onCombineCards: () => void;
  onToggleFlipCard: (cardId: string) => void;
  onGenerateDailyPerformanceSignal: (priceCardData: PriceCardFaceData) => void;
  onGeneratePriceVsSmaSignal: (faceData: PriceCardFaceData, smaPeriod: 50 | 200, smaValue: number) => void; // NEW PROP
}

const ActiveCards: React.FC<ActiveCardsProps> = ({
  cards,
  onSecureCard,
  onFadedOut,
  selectedCardsForCombine,
  onSelectCardForCombine,
  onCombineCards,
  onToggleFlipCard,
  onGenerateDailyPerformanceSignal,
  onGeneratePriceVsSmaSignal, // Destructure new prop
}) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const canCombine = selectedCardsForCombine.length === 2; // This logic can be removed if combining is fully deprecated

  if (!hasMounted) {
    return (
      <div className="flex-grow p-4 bg-secondary/30 rounded-lg shadow-inner min-h-[400px]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold text-foreground">Active Cards</h2>
          </div>
          {/* Combine button can be removed if not used with the new live card concept */}
          <Button onClick={onCombineCards} disabled={!canCombine}>
            Combine
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
        </div>
        {/* Combine button can be removed */}
        <Button onClick={onCombineCards} disabled={!canCombine}>
          Combine
        </Button>
      </div>
      
      {cards.length === 0 ? (
         <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-center py-10">No active cards. Waiting for live data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <GameCard
              key={card.id}
              card={card}
              onSecureCard={onSecureCard}
              onFadedOut={onFadedOut}
              onSelectForCombine={onSelectCardForCombine} // This system is likely deprecated now
              isSelectedForCombine={selectedCardsForCombine.includes(card.id)} // Deprecated
              onToggleFlip={onToggleFlipCard}
              onGenerateDailyPerformanceSignal={onGenerateDailyPerformanceSignal}
              onGeneratePriceVsSmaSignal={onGeneratePriceVsSmaSignal} // Pass down new prop
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveCards;
