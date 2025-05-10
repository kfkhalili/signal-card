"use client";

import React, { useRef } from "react";
import type { DisplayableCard } from "./types";
import type { PriceCardFaceData, PriceCard } from "./cards/PriceCard/types";
import CardFace from "./card-face";
import BaseDisplayCard from "./base-display-card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Camera, X as XIcon } from "lucide-react";

interface GameCardProps {
  card: DisplayableCard;
  onToggleFlip: (cardId: string) => void;
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
  onTakeSnapshot?: () => void; // Changed signature
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onToggleFlip,
  onDeleteCard,
  onGenerateDailyPerformanceSignal,
  onGeneratePriceVsSmaSignal,
  onGeneratePriceRangeContextSignal,
  onGenerateIntradayTrendSignal,
  onTakeSnapshot,
}) => {
  const gameCardWrapperRef = useRef<HTMLDivElement>(null);
  const snapshotButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  const isPriceGameCard = card.type === "price";
  const priceGameCard = isPriceGameCard ? (card as PriceCard) : null;

  const cardTestId = `game-card-${card.id}`;
  const canDelete = card.type !== "price";

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
    // Snapshot action is now generic, doesn't need the card it was triggered from
    if (onTakeSnapshot) onTakeSnapshot();
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
          // Directly call onToggleFlip for keyboard interactions after checks
          onToggleFlip(card.id);
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
          {/* Snapshot button now appears on all cards if onTakeSnapshot is provided */}
          {onTakeSnapshot && (
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
