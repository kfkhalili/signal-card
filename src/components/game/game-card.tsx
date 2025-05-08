"use client";

import React, { useState, useEffect } from 'react';
import type { ActiveGameCard, PriceGameCard } from './types';
import CardFace from './card-face';
import BaseDisplayCard from './base-display-card'; // Updated import
import { Button } from '@/components/ui/button'; // Added for Examine button
import { cn } from '@/lib/utils';

const FADE_UPDATE_INTERVAL_MS = 100; // Smoothness of fade animation

interface GameCardProps {
  card: ActiveGameCard;
  onSecureCard: (cardId: string) => void;
  onExamineCard: (card: PriceGameCard) => void;
  onFadedOut: (cardId: string) => void;
  onSelectForCombine: (cardId: string) => void;
  isSelectedForCombine: boolean;
  onToggleFlip: (cardId: string) => void;
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onSecureCard,
  onExamineCard,
  onFadedOut,
  onSelectForCombine,
  isSelectedForCombine,
  onToggleFlip,
}) => {
  const [currentOpacity, setCurrentOpacity] = useState(1);
  const [remainingTimeFormatted, setRemainingTimeFormatted] = useState<string | null>(null);

  const isPriceCard = card.type === 'price';
  const priceCardData = isPriceCard ? (card as PriceGameCard) : null;
  
  useEffect(() => {
    if (priceCardData && !priceCardData.isSecured) {
      const startTime = priceCardData.appearedAt;
      const duration = priceCardData.initialFadeDurationMs;

      const updateFadeAndTime = () => {
        const elapsed = Date.now() - startTime;
        const remainingMs = Math.max(0, duration - elapsed);
        const newOpacity = Math.max(0, 1 - elapsed / duration);
        
        setCurrentOpacity(newOpacity);

        if (remainingMs > 0) {
          const totalSeconds = Math.floor(remainingMs / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          setRemainingTimeFormatted(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        } else {
          setRemainingTimeFormatted("00:00");
        }

        if (newOpacity === 0) {
          onFadedOut(card.id);
        }
      };

      updateFadeAndTime();
      const intervalId = setInterval(updateFadeAndTime, FADE_UPDATE_INTERVAL_MS);
      return () => clearInterval(intervalId);
    } else {
      setCurrentOpacity(1);
      setRemainingTimeFormatted(null);
    }
  }, [priceCardData, onFadedOut, card.id]);

  const handleCardClick = () => {
    // This click is now on BaseDisplayCard, which covers the whole card area.
    // Specific button clicks (like a potential Examine button child) will need their own onClick handlers.
    if (isPriceCard && priceCardData) {
      if (!priceCardData.isSecured) {
        onSecureCard(card.id);
      } else {
        // For secured price cards, the primary click action might be to select/deselect or flip.
        // If an "Examine" button is present and clicked, its own onClick will handle that.
        // Otherwise, the click on the card itself can toggle selection or flip.
        onSelectForCombine(card.id);
        onToggleFlip(card.id); 
      }
    } else if (card.type === 'trend') {
      onToggleFlip(card.id);
    }
  };
  
  const frontFace = <CardFace card={card} isBack={false} />;
  const backFace = <CardFace card={card} isBack={true} />;

  // Handler for the examine button, stop propagation to prevent BaseDisplayCard's onCardClick.
  const handleExamineClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent flipping or selecting when clicking the button
    if (priceCardData) {
      onExamineCard(priceCardData);
    }
  };

  return (
    <div
      style={{ opacity: currentOpacity }}
      className={cn(
        'game-card-wrapper w-64 h-80 relative rounded-lg',
        isSelectedForCombine && priceCardData?.isSecured ? 'ring-4 ring-primary ring-offset-2 shadow-2xl' : 'shadow-md hover:shadow-xl',
      )}
      role="button"
      tabIndex={0}
      // onKeyDown for the wrapper might be redundant if BaseDisplayCard handles keyboard interaction for flipping.
      // However, keeping it if other wrapper-level actions are intended.
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { 
            // If the main card area is focused, treat Enter/Space as a click on the card itself.
            handleCardClick();
        }
      }}
      aria-label={`Card ${card.id}, type ${card.type}. ${isSelectedForCombine ? "Selected for combine." : ""} ${card.isFlipped ? "Showing back." : "Showing front."}`}
    >
      <BaseDisplayCard
        isFlipped={card.isFlipped}
        onCardClick={handleCardClick} 
        faceContent={frontFace}
        backContent={backFace}
        className="w-full h-full"
      >
        {/* Children for overlays: Timer and "Examine" button */}
        <> {/* Use a fragment to group children if needed */}
          {priceCardData && !priceCardData.isSecured && remainingTimeFormatted && (
            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-1 px-2 rounded text-xs font-semibold text-accent animate-pulse z-20 pointer-events-none">
              {remainingTimeFormatted}
            </div>
          )}
          {priceCardData && priceCardData.isSecured && card.isFlipped && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] z-20 pointer-events-auto">
                 <Button onClick={handleExamineClick} className="w-full text-xs h-8">
                    Examine Trend
                 </Button>
            </div>
          )}
        </>
      </BaseDisplayCard>
    </div>
  );
};

export default GameCard;
