"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { ActiveGameCard, PriceGameCard, PriceCardFaceData } from './types';
import CardFace from './card-face';
import BaseDisplayCard from './base-display-card';
import { cn } from '@/lib/utils';

const FADE_UPDATE_INTERVAL_MS = 100;

interface GameCardProps {
  card: ActiveGameCard;
  onSecureCard: (cardId: string) => void;
  onFadedOut: (cardId: string) => void;
  onSelectForCombine: (cardId: string) => void;
  isSelectedForCombine: boolean;
  onToggleFlip: (cardId: string) => void;
  onGenerateDailyPerformanceSignal?: (priceCardData: PriceCardFaceData) => void;
  onGeneratePriceVsSmaSignal?: (faceData: PriceCardFaceData, smaPeriod: 50 | 200, smaValue: number) => void;
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onSecureCard,
  onFadedOut,
  onSelectForCombine,
  isSelectedForCombine,
  onToggleFlip,
  onGenerateDailyPerformanceSignal,
  onGeneratePriceVsSmaSignal,
}) => {
  const [currentOpacity, setCurrentOpacity] = useState(1);
  const [remainingTimeFormatted, setRemainingTimeFormatted] = useState<string | null>(null);
  const interactiveSignalAreaRef = useRef<HTMLDivElement>(null); 

  const isPriceCard = card.type === 'price';
  const priceCard = isPriceCard ? (card as PriceGameCard) : null;
  const priceCardFaceData = priceCard ? priceCard.faceData as PriceCardFaceData : null;

  useEffect(() => {
    if (priceCard && !priceCard.isSecured && priceCard.initialFadeDurationMs) {
      const startTime = priceCard.appearedAt;
      const duration = priceCard.initialFadeDurationMs;
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
        if (newOpacity === 0) onFadedOut(card.id);
      };
      updateFadeAndTime();
      const intervalId = setInterval(updateFadeAndTime, FADE_UPDATE_INTERVAL_MS);
      return () => clearInterval(intervalId);
    } else {
      setCurrentOpacity(1);
      setRemainingTimeFormatted(null);
    }
  }, [priceCard, onFadedOut, card.id]);

  const handleCardClick = (/* event?: React.MouseEvent<HTMLDivElement> */) => {
    console.log("GameCard: BaseDisplayCard face clicked. Attempting flip/action.");
    
    if (isPriceCard && priceCard) {
      if (!priceCard.isSecured) {
        console.log("GameCard: Unsecured price card clicked, securing...");
        onSecureCard(card.id);
      } else {
        console.log("GameCard: Secured price card clicked, toggling flip...");
        onToggleFlip(card.id);
      }
    } else if (card.type === 'trend') {
      console.log("GameCard: Trend card clicked, toggling flip...");
      onToggleFlip(card.id);
    } else {
      console.log("GameCard: Clicked on card of unknown active type or non-price/non-trend. Card type:", card.type);
    }
  };
  
  const handleSmaClickForCardFace = (smaPeriod: 50 | 200, smaValue: number, receivedFaceData: PriceCardFaceData) => {
    console.log("GameCard: SMA click received from CardFace for period", smaPeriod);
    if (onGeneratePriceVsSmaSignal) {
      onGeneratePriceVsSmaSignal(receivedFaceData, smaPeriod, smaValue);
    }
  };

  const frontFace = <CardFace card={card} isBack={false} />;
  const backFace = <CardFace card={card} isBack={true} onSmaClick={handleSmaClickForCardFace} />;

  return (
    <div
      style={{ opacity: currentOpacity }}
      className={cn(
        'game-card-wrapper w-64 h-80 relative rounded-lg',
        isSelectedForCombine && priceCard?.isSecured ? 'ring-4 ring-primary ring-offset-2 shadow-2xl' : 'shadow-md hover:shadow-xl',
      )}
    >
      <BaseDisplayCard
        isFlipped={card.isFlipped}
        onCardClick={handleCardClick} 
        faceContent={frontFace}
        backContent={backFace}
        className="w-full h-full"
      >
        <>
          {priceCard && !priceCard.isSecured && priceCard.initialFadeDurationMs && remainingTimeFormatted && (
            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-1 px-2 rounded text-xs font-semibold text-accent animate-pulse z-20 pointer-events-none">
              {remainingTimeFormatted}
            </div>
          )}
          {isPriceCard && priceCardFaceData && !card.isFlipped && onGenerateDailyPerformanceSignal && (
            <div
              ref={interactiveSignalAreaRef}
              className="absolute top-[30%] left-[5%] w-[90%] h-[30%] z-30 cursor-pointer group/interactive rounded-md pointer-events-auto" // ADDED pointer-events-auto
              onClick={(e) => {
                console.log("GameCard: Front-face interactive overlay onClick triggered.");
                e.stopPropagation(); 
                if (priceCardFaceData) {
                  onGenerateDailyPerformanceSignal(priceCardFaceData);
                }
              }}
              role="button" tabIndex={0}
              onKeyDown={(e) => { 
                if ((e.key === 'Enter' || e.key === ' ') && priceCardFaceData) {
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  onGenerateDailyPerformanceSignal(priceCardFaceData);
                }
              }}
              aria-label="Generate Daily Performance Signal"
              title="Click to generate daily performance signal"
            >
              <div className="hidden group-hover/interactive:group-focus/interactive:block absolute inset-0 border-2 border-primary/70 opacity-50 rounded-md"></div>
            </div>
          )}
        </>
      </BaseDisplayCard>
    </div>
  );
};

export default GameCard;
