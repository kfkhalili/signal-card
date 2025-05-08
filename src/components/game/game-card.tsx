"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onSecureCard,
  onExamineCard,
  onFadedOut,
  onSelectForCombine,
  isSelectedForCombine,
}) => {
  const [currentOpacity, setCurrentOpacity] = useState(1);
  const [isFlipped, setIsFlipped] = useState(card.isFlipped);

  const isPriceCard = card.type === 'price';
  const priceCardData = isPriceCard ? (card as PriceGameCard) : null;

  useEffect(() => {
    setIsFlipped(card.isFlipped);
  }, [card.isFlipped]);
  
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
    if (priceCardData && !priceCardData.isSecured) {
      onSecureCard(card.id); // Secures and flips
    } else if (priceCardData && priceCardData.isSecured) {
       // If it's a secured price card, allow selection for combining
       onSelectForCombine(card.id);
       // Optionally, flip if not already flipped and not about to examine
       if (!isFlipped && !priceCardData.backData.explanation.includes("Examine")) {
         setIsFlipped(true); // Flip if clicked and secured
       }
    } else if (card.type === 'trend') {
      // Trend cards can be flipped
      setIsFlipped(!isFlipped);
    }
  };
  
  const cardContainerClasses = cn(
    'card-container w-64 h-80 cursor-pointer transition-opacity duration-200 ease-linear',
    { 'is-flipped': isFlipped },
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
      aria-label={`Card ${card.id}, type ${card.type}. ${isSelectedForCombine ? "Selected for combine." : ""} ${isFlipped ? "Showing back." : "Showing front."}`}
    >
      <div className="card-inner">
        <CardFace card={card} isBack={false} onExamine={card.type === 'price' ? onExamineCard : undefined} />
        <CardFace card={card} isBack={true} onExamine={card.type === 'price' ? onExamineCard : undefined} />
      </div>
    </div>
  );
};

export default GameCard;
