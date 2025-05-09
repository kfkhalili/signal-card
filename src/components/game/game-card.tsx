"use client";

import React, { useState, useEffect, useRef } from "react";
import type {
  PriceGameCard,
  PriceCardFaceData,
  DisplayableCard,
} from "./types";
import CardFace from "./card-face";
import BaseDisplayCard from "./base-display-card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Camera, X as XIcon } from "lucide-react";

const FADE_UPDATE_INTERVAL_MS = 100;

interface GameCardProps {
  card: DisplayableCard;
  onToggleFlip: (cardId: string) => void;
  onFadedOut?: (cardId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  onGenerateDailyPerformanceSignal?: (priceCardData: PriceCardFaceData) => void;
  onGeneratePriceVsSmaSignal?: (
    faceData: PriceCardFaceData,
    smaPeriod: 50 | 200,
    smaValue: number
  ) => void;
  onGeneratePriceRangeContextSignal?: (
    faceData: PriceCardFaceData,
    levelType: "High" | "Low",
    levelValue: number
  ) => void;
  onGenerateIntradayTrendSignal?: (faceData: PriceCardFaceData) => void;
  onTakeSnapshot?: (card: PriceGameCard) => void;
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onToggleFlip,
  onFadedOut,
  onDeleteCard,
  onGenerateDailyPerformanceSignal,
  onGeneratePriceVsSmaSignal,
  onGeneratePriceRangeContextSignal,
  onGenerateIntradayTrendSignal,
  onTakeSnapshot,
}) => {
  const [currentOpacity, setCurrentOpacity] = useState(1);
  const [remainingTimeFormatted, setRemainingTimeFormatted] = useState<
    string | null
  >(null);
  const gameCardWrapperRef = useRef<HTMLDivElement>(null);
  const snapshotButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  const isPriceGameCard = card.type === "price";
  const priceGameCard = isPriceGameCard ? (card as PriceGameCard) : null;

  const cardTestId = `game-card-${card.id}`;
  const canDelete = card.type !== "price";

  useEffect(() => {
    if (
      priceGameCard &&
      !priceGameCard.isSecured &&
      priceGameCard.initialFadeDurationMs &&
      onFadedOut
    ) {
      const startTime = priceGameCard.appearedAt;
      const duration = priceGameCard.initialFadeDurationMs;
      const updateFadeAndTime = () => {
        const elapsed = Date.now() - startTime;
        const remainingMs = Math.max(0, duration - elapsed);
        const newOpacity = Math.max(0, 1 - elapsed / duration);
        setCurrentOpacity(newOpacity);
        if (remainingMs > 0) {
          const totalSeconds = Math.floor(remainingMs / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          setRemainingTimeFormatted(
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
              2,
              "0"
            )}`
          );
        } else {
          setRemainingTimeFormatted("00:00");
        }
        if (newOpacity === 0) onFadedOut(card.id);
      };
      updateFadeAndTime();
      const intervalId = setInterval(
        updateFadeAndTime,
        FADE_UPDATE_INTERVAL_MS
      );
      return () => clearInterval(intervalId);
    } else {
      setCurrentOpacity(1);
      setRemainingTimeFormatted(null);
    }
  }, [priceGameCard, onFadedOut, card.id]);

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as Node;
    if (
      (snapshotButtonRef.current &&
        snapshotButtonRef.current.contains(target)) ||
      (deleteButtonRef.current && deleteButtonRef.current.contains(target))
    ) {
      return;
    }
    console.log(
      `GameCard (${card.id} - ${card.type}): General click. Calling onToggleFlip.`
    );
    onToggleFlip(card.id);
  };

  const handleSmaClickForCardFace = (
    smaPeriod: 50 | 200,
    smaValue: number,
    receivedFaceData: PriceCardFaceData
  ) => {
    if (isPriceGameCard && onGeneratePriceVsSmaSignal)
      onGeneratePriceVsSmaSignal(receivedFaceData, smaPeriod, smaValue);
  };
  const handleRangeContextClickForCardFace = (
    levelType: "High" | "Low",
    levelValue: number,
    receivedFaceData: PriceCardFaceData
  ) => {
    if (isPriceGameCard && onGeneratePriceRangeContextSignal)
      onGeneratePriceRangeContextSignal(
        receivedFaceData,
        levelType,
        levelValue
      );
  };
  const handleOpenPriceClickForCardFace = (
    receivedFaceData: PriceCardFaceData
  ) => {
    if (isPriceGameCard && onGenerateIntradayTrendSignal)
      onGenerateIntradayTrendSignal(receivedFaceData);
  };
  const handleDailyPerformanceClickForCardFace = (
    receivedFaceData: PriceCardFaceData
  ) => {
    if (isPriceGameCard && onGenerateDailyPerformanceSignal)
      onGenerateDailyPerformanceSignal(receivedFaceData);
  };
  const handleSnapshotButtonClick = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    if (priceGameCard && onTakeSnapshot) onTakeSnapshot(priceGameCard);
  };
  const handleDeleteButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onDeleteCard && canDelete) {
      console.log(`GameCard: Delete button clicked for card ${card.id}`);
      onDeleteCard(card.id);
    }
  };

  const frontFace = (
    <CardFace
      card={card}
      isBack={false}
      onRangeContextClick={
        isPriceGameCard ? handleRangeContextClickForCardFace : undefined
      }
      onGenerateDailyPerformanceSignal={
        isPriceGameCard ? handleDailyPerformanceClickForCardFace : undefined
      }
    />
  );
  const backFace = (
    <CardFace
      card={card}
      isBack={true}
      onSmaClick={isPriceGameCard ? handleSmaClickForCardFace : undefined}
      onOpenPriceClick={
        isPriceGameCard ? handleOpenPriceClickForCardFace : undefined
      }
    />
  );

  console.log(
    `GameCard ${card.id} (type: ${card.type}) rendering. isFlipped prop: ${card.isFlipped}`
  );

  return (
    <div
      ref={gameCardWrapperRef}
      onClick={handleCardClick}
      style={{ opacity: currentOpacity }}
      className={cn(
        "game-card-wrapper w-64 h-80 relative rounded-lg cursor-pointer",
        "shadow-md hover:shadow-xl"
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          const activeElement = document.activeElement;
          if (
            snapshotButtonRef.current?.contains(activeElement) ||
            deleteButtonRef.current?.contains(activeElement) ||
            (gameCardWrapperRef.current?.contains(activeElement) &&
              (activeElement as HTMLElement).dataset.interactiveChild ===
                "true")
          ) {
            return;
          }
          handleCardClick(e as any);
        }
      }}
      aria-label={`Card ${card.id}, type ${card.type}. Click to interact or flip.`}
      data-testid={cardTestId}
    >
      <BaseDisplayCard
        isFlipped={card.isFlipped}
        faceContent={frontFace}
        backContent={backFace}
        className="w-full h-full"
      >
        <>
          {priceGameCard &&
            !priceGameCard.isSecured &&
            priceGameCard.initialFadeDurationMs &&
            remainingTimeFormatted && (
              <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-1 px-2 rounded text-xs font-semibold text-accent animate-pulse z-20 pointer-events-none">
                {remainingTimeFormatted}
              </div>
            )}
          {isPriceGameCard && onTakeSnapshot && (
            <Button
              ref={snapshotButtonRef}
              variant="ghost"
              size="icon"
              className="absolute top-1 left-1 h-7 w-7 text-muted-foreground hover:bg-muted/30 hover:text-primary rounded-sm p-0.5 z-40 pointer-events-auto"
              onClick={handleSnapshotButtonClick}
              data-interactive-child="true"
              title="Take Snapshot"
              aria-label="Take Snapshot of this card"
              data-testid="snapshot-button"
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}

          {/* Delete Button - Conditionally rendered ONLY if deletable */}
          {onDeleteCard && canDelete && (
            <Button
              ref={deleteButtonRef}
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:bg-destructive/20 hover:text-destructive rounded-sm p-0.5 z-40 pointer-events-auto"
              onClick={handleDeleteButtonClick}
              // disabled prop removed as it won't render if not canDelete
              data-interactive-child="true"
              title="Delete this signal card"
              aria-label="Delete signal card"
              data-testid={`delete-card-button-${card.id}`}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </>
      </BaseDisplayCard>
    </div>
  );
};

export default GameCard;
