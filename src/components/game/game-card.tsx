"use client";

import React, { useState, useEffect } from 'react';
import type { ActiveGameCard, PriceGameCard } from './types';
import CardFace from './card-face';
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
          setRemainingTimeFormatted("00:00"); // Show 00:00 just before fading
        }

        if (newOpacity === 0) {
          onFadedOut(card.id);
        }
      };

      updateFadeAndTime(); // Initial call
      const intervalId = setInterval(updateFadeAndTime, FADE_UPDATE_INTERVAL_MS);
      return () => clearInterval(intervalId);
    } else {
      setCurrentOpacity(1); // Secured cards or non-price cards are fully opaque
      setRemainingTimeFormatted(null); // No timer for secured or non-price cards
    }
  }, [priceCardData, onFadedOut, card.id]);


  const handleCardClick = () => {
    if (isPriceCard && priceCardData) {
      if (!priceCardData.isSecured) {
        // Unsecured Price Card: Secure it.
        // The onSecureCard in page.tsx handles flipping and potential auto-selection.
        onSecureCard(card.id);
      } else {
        // Secured Price Card:
        // 1. Toggle selection state (handled by onSelectForCombine in page.tsx)
        onSelectForCombine(card.id);
        // 2. Toggle flip state if it's already selected, or if it's being deselected.
        // If it's not selected and becomes selected, it's typically already flipped by onSecureCard.
        // If it *is* selected (or becomes selected), clicking it should flip it.
        onToggleFlip(card.id);
      }
    } else if (card.type === 'trend') {
      // Trend Card: Toggle flip state via parent
      onToggleFlip(card.id);
    }
  };
  
  const cardContainerClasses = cn(
    'card-container w-64 h-80 cursor-pointer transition-opacity duration-200 ease-linear',
    { 'is-flipped': card.isFlipped }, 
    isSelectedForCombine && priceCardData?.isSecured ? 'ring-4 ring-primary ring-offset-2 shadow-2xl' : 'shadow-md hover:shadow-xl',
  );

  return (
    <div
      className={cardContainerClasses}
      style={{ opacity: currentOpacity }}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      aria-label={`Card ${card.id}, type ${card.type}. ${isSelectedForCombine ? "Selected for combine." : ""} ${card.isFlipped ? "Showing back." : "Showing front."}`}
    >
      <div className="card-inner">
        <CardFace card={card} isBack={false} onExamine={card.type === 'price' ? onExamineCard : undefined} remainingTime={remainingTimeFormatted} />
        <CardFace card={card} isBack={true} onExamine={card.type === 'price' ? onExamineCard : undefined} />
      </div>
    </div>
  );
};

export default GameCard;
