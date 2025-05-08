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

  const isPriceCard = card.type === 'price';
  const priceCardData = isPriceCard ? (card as PriceGameCard) : null;
  
  useEffect(() => {
    if (priceCardData && !priceCardData.isSecured) {
      const startTime = priceCardData.appearedAt;
      const duration = priceCardData.initialFadeDurationMs;

      const updateFade = () => {
        const elapsed = Date.now() - startTime;
        const newOpacity = Math.max(0, 1 - elapsed / duration);
        setCurrentOpacity(newOpacity);

        if (newOpacity === 0) {
          onFadedOut(card.id);
        }
      };

      updateFade(); // Initial call
      const intervalId = setInterval(updateFade, FADE_UPDATE_INTERVAL_MS);
      return () => clearInterval(intervalId);
    } else {
      setCurrentOpacity(1); // Secured cards or non-price cards are fully opaque
    }
  }, [priceCardData, onFadedOut, card.id]);


  const handleCardClick = () => {
    if (isPriceCard && priceCardData && !priceCardData.isSecured) {
      // Unsecured Price Card: Secure it (this also flips it to back via onSecureCard in page.tsx)
      onSecureCard(card.id);
    } else if (isPriceCard && priceCardData && priceCardData.isSecured) {
      // Secured Price Card:
      // 1. Handle selection for combination
      onSelectForCombine(card.id);
      // 2. Toggle flip state via parent
      onToggleFlip(card.id);
    } else if (card.type === 'trend') {
      // Trend Card: Toggle flip state via parent
      onToggleFlip(card.id);
    }
  };
  
  const cardContainerClasses = cn(
    'card-container w-64 h-80 cursor-pointer transition-opacity duration-200 ease-linear',
    { 'is-flipped': card.isFlipped }, // Use card.isFlipped from props
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
        <CardFace card={card} isBack={false} onExamine={card.type === 'price' ? onExamineCard : undefined} />
        <CardFace card={card} isBack={true} onExamine={card.type === 'price' ? onExamineCard : undefined} />
      </div>
    </div>
  );
};

export default GameCard;