"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { ActiveGameCard, PriceGameCard, PriceCardFaceData, PriceCardBackData } from './types'; 
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
  const gameCardWrapperRef = useRef<HTMLDivElement>(null); // Added this ref back
  const frontFaceInteractiveOverlayRef = useRef<HTMLDivElement>(null); // This was removed in previous step, should be handled by CardFace now
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

    // Check if click was on the snapshot button, which is a direct child overlay
    if (snapshotButtonRef.current && snapshotButtonRef.current.contains(target)) {
      console.log("GameCard: Click on snapshot button. Handled by button.");
      return; // Button's onClick (with stopPropagation) handles this
    }
    
    // Other specific interactive elements are now within CardFace (e.g. SMAs, Open, High/Low, Daily Perf area)
    // and should have their own onClick handlers that call e.stopPropagation().
    // If this handleCardClick is reached, it means the click was not on an element
    // that stopped propagation, so it's a general flip click.
    
    console.log("GameCard: General click on card wrapper. Proceeding with flip/action.");
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
  
  // Wrapper handlers passed to CardFace
  const handleSmaClickForCardFace = (smaPeriod: 50 | 200, smaValue: number, receivedFaceData: PriceCardFaceData) => {
    if (onGeneratePriceVsSmaSignal) {
      onGeneratePriceVsSmaSignal(receivedFaceData, smaPeriod, smaValue);
    }
  };

  const handleRangeContextClickForCardFace = (levelType: 'High' | 'Low', levelValue: number, receivedFaceData: PriceCardFaceData) => {
    if (onGeneratePriceRangeContextSignal) {
      onGeneratePriceRangeContextSignal(receivedFaceData, levelType, levelValue);
    }
  };

  const handleOpenPriceClickForCardFace = (receivedFaceData: PriceCardFaceData) => {
    if (onGenerateIntradayTrendSignal) {
      onGenerateIntradayTrendSignal(receivedFaceData);
    }
  };

  const handleDailyPerformanceClickForCardFace = (receivedFaceData: PriceCardFaceData) => {
    if (onGenerateDailyPerformanceSignal) {
        onGenerateDailyPerformanceSignal(receivedFaceData);
    }
  };

  // Snapshot button's direct handler
  const handleSnapshotButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); 
    if (priceCard && onTakeSnapshot) {
      console.log("GameCard: Snapshot button clicked.");
      onTakeSnapshot(priceCard);
    }
  };

  const frontFace = <CardFace 
                        card={card} 
                        isBack={false} 
                        onRangeContextClick={handleRangeContextClickForCardFace} 
                        onGenerateDailyPerformanceSignal={handleDailyPerformanceClickForCardFace} // Pass down the new handler
                    />;
  const backFace = <CardFace 
                      card={card} 
                      isBack={true} 
                      onSmaClick={handleSmaClickForCardFace} 
                      onOpenPriceClick={handleOpenPriceClickForCardFace} 
                    />;

  return (
    <div
      ref={gameCardWrapperRef} // Assign ref to the main wrapper
      onClick={handleCardClick} // Main click handler on the wrapper
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
            // Check if focus is on the snapshot button or an element within CardFace marked as interactive
            if (snapshotButtonRef.current?.contains(activeElement) || 
                (gameCardWrapperRef.current?.contains(activeElement) && 
                 (activeElement as HTMLElement).dataset.interactiveChild === 'true')
            ) {
                // Allow focused interactive element to handle Enter/Space via its own onKeyDown
                return; 
            }
            // If not an internal interactive element, proceed with flip
            handleCardClick(e as any); // Cast event type for now
          }
      }}
      aria-label={`Card ${card.id}, type ${card.type}. Click to interact or flip.`}
    >
      <BaseDisplayCard
        isFlipped={card.isFlipped}
        // onCardClick removed from BaseDisplayCard props
        faceContent={frontFace}
        backContent={backFace}
        className="w-full h-full"
      >
        {/* Children overlays (Timer, Snapshot Button) */}
        <>
          {priceCard && !priceCard.isSecured && priceCard.initialFadeDurationMs && remainingTimeFormatted && (
            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-1 px-2 rounded text-xs font-semibold text-accent animate-pulse z-20 pointer-events-none">
              {remainingTimeFormatted}
            </div>
          )}
          {/* Front-face interactive overlay for Daily Performance signal is now handled by CardFace */}
          
          {isPriceCard && onTakeSnapshot && (
            <Button
              ref={snapshotButtonRef} // Assign ref to snapshot button
              variant="ghost"
              size="icon"
              className="absolute top-1 left-1 h-7 w-7 text-muted-foreground hover:bg-muted/30 hover:text-primary rounded-sm p-0.5 z-40 pointer-events-auto"
              onClick={handleSnapshotButtonClick} 
              data-interactive-child="true" // Mark as interactive for keydown handling
              title="Take Snapshot"
              aria-label="Take Snapshot of this card"
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
