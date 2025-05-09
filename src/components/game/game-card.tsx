"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { ActiveGameCard, PriceGameCard, PriceCardFaceData } from './types';
import CardFace from './card-face';
import BaseDisplayCard from './base-display-card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

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
  onGeneratePriceRangeContextSignal?: (faceData: PriceCardFaceData, levelType: 'High' | 'Low', levelValue: number) => void;
  onGenerateIntradayTrendSignal?: (faceData: PriceCardFaceData) => void;
  onTakeSnapshot?: (card: PriceGameCard) => void;
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
  onGeneratePriceRangeContextSignal,
  onGenerateIntradayTrendSignal,
  onTakeSnapshot,
}) => {
  const [currentOpacity, setCurrentOpacity] = useState(1);
  const [remainingTimeFormatted, setRemainingTimeFormatted] = useState<string | null>(null);
  const gameCardWrapperRef = useRef<HTMLDivElement>(null);
  const frontFaceInteractiveOverlayRef = useRef<HTMLDivElement>(null);
  const snapshotButtonRef = useRef<HTMLButtonElement>(null);

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

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as Node;

    if (frontFaceInteractiveOverlayRef.current && frontFaceInteractiveOverlayRef.current.contains(target)) {
      console.log("GameCard: Click on front-face interactive overlay. Its handler should stop propagation.");
      return; 
    }
    if (snapshotButtonRef.current && snapshotButtonRef.current.contains(target)) {
      console.log("GameCard: Click on snapshot button. Its handler should stop propagation.");
      return; 
    }
    
    console.log("GameCard: General click on card wrapper. Attempting flip/action. Target:", target);
    if (isPriceCard && priceCard) {
      if (!priceCard.isSecured) {
        console.log("GameCard: Unsecured price card, securing...");
        onSecureCard(card.id);
      } else {
        console.log("GameCard: Secured price card, toggling flip...");
        onToggleFlip(card.id);
      }
    } else if (card.type === 'trend') {
      console.log("GameCard: Trend card, toggling flip...");
      onToggleFlip(card.id);
    } else {
      console.log("GameCard: Clicked on card of unknown type. Type:", card.type);
    }
  };
  
  const handleSmaClickForCardFace = (smaPeriod: 50 | 200, smaValue: number, receivedFaceData: PriceCardFaceData) => {
    console.log("GameCard: SMA click received from CardFace for period", smaPeriod);
    if (onGeneratePriceVsSmaSignal) {
      onGeneratePriceVsSmaSignal(receivedFaceData, smaPeriod, smaValue);
    }
  };

  const handleRangeContextClickForCardFace = (levelType: 'High' | 'Low', levelValue: number, receivedFaceData: PriceCardFaceData) => {
    console.log(`GameCard: Range context click received from CardFace for ${levelType}`);
    if (onGeneratePriceRangeContextSignal) {
      onGeneratePriceRangeContextSignal(receivedFaceData, levelType, levelValue);
    }
  };

  const handleOpenPriceClickForCardFace = (receivedFaceData: PriceCardFaceData) => {
    console.log(`GameCard: Open price click received from CardFace`);
    if (onGenerateIntradayTrendSignal) {
      onGenerateIntradayTrendSignal(receivedFaceData);
    }
  };

  const handleSnapshotButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); 
    if (priceCard && onTakeSnapshot) {
      console.log("GameCard: Snapshot button clicked.");
      onTakeSnapshot(priceCard);
    }
  };

  const frontFace = <CardFace card={card} isBack={false} onRangeContextClick={handleRangeContextClickForCardFace} />;
  const backFace = <CardFace 
                      card={card} 
                      isBack={true} 
                      onSmaClick={handleSmaClickForCardFace} 
                      onOpenPriceClick={handleOpenPriceClickForCardFace} 
                    />;
  
  console.log(`GameCard ${card.id} rendering. isFlipped prop: ${card.isFlipped}`); // LOG 5

  return (
    <div
      ref={gameCardWrapperRef} 
      onClick={handleCardClick} 
      style={{ opacity: currentOpacity }}
      className={cn(
        'game-card-wrapper w-64 h-80 relative rounded-lg cursor-pointer',
        isSelectedForCombine && priceCard?.isSecured ? 'ring-4 ring-primary ring-offset-2 shadow-2xl' : 'shadow-md hover:shadow-xl',
      )}
      role="button" 
      tabIndex={0}  
      onKeyDown={(e) => { 
          if (e.key === 'Enter' || e.key === ' ') {
            const activeElement = document.activeElement;
            if (frontFaceInteractiveOverlayRef.current?.contains(activeElement) || 
                snapshotButtonRef.current?.contains(activeElement) ||
                (gameCardWrapperRef.current?.contains(activeElement) && (activeElement as HTMLElement).dataset.interactiveChild === 'true') // Check for data-attribute from CardFace interactive elements
            ) {
                return; 
            }
            handleCardClick(e as any);
          }
      }}
      aria-label={`Card ${card.id}, type ${card.type}. Click to interact or flip.`}
    >
      <BaseDisplayCard
        isFlipped={card.isFlipped}
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
              ref={frontFaceInteractiveOverlayRef}
              className="absolute top-[30%] left-[5%] w-[90%] h-[30%] z-30 cursor-pointer group/interactive rounded-md pointer-events-auto"
              onClick={(e) => {
                console.log("GameCard: Front-face interactive overlay onClick triggered.");
                e.stopPropagation(); 
                if (priceCardFaceData) {
                  onGenerateDailyPerformanceSignal(priceCardFaceData);
                }
              }}
              role="button" tabIndex={0}
              data-interactive-child="true" // Add data attribute
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
          {isPriceCard && onTakeSnapshot && (
            <Button
              ref={snapshotButtonRef}
              variant="ghost"
              size="icon"
              className="absolute top-1 left-1 h-7 w-7 text-muted-foreground hover:bg-muted/30 hover:text-primary rounded-sm p-0.5 z-40 pointer-events-auto"
              onClick={handleSnapshotButtonClick}
              title="Take Snapshot"
              aria-label="Take Snapshot of this card"
              data-interactive-child="true" // Add data attribute
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}
        </>
      </BaseDisplayCard>
    </div>
  );
};

export default GameCard;
