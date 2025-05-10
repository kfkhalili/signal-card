/**
 * src/app/components/game-card.tsx
 */
import React from "react";
import type { DisplayableCard } from "./types"; // Assuming src/app/components/types.ts
import type {
  PriceCardData,
  PriceCardFaceData, // Import this to construct faceData for snapshot
  PriceCardSpecificBackData, // Import this to construct backData for snapshot
  PriceCardSnapshotData,
  PriceCardInteractionCallbacks,
} from "./cards/price-card/price-card.types"; // Assuming src/app/components/cards/price-card/price-card.types.ts
import { PriceCardContainer } from "./cards/price-card/PriceCardContainer"; // Assuming src/app/components/cards/price-card/PriceCardContainer.tsx
import type { BaseCardData } from "./cards/base-card/base-card.types"; // For the default case

interface GameCardProps {
  readonly card: DisplayableCard;
  readonly onToggleFlip: (id: string) => void;
  readonly onDeleteCardRequest: (id: string) => void;
  readonly onTakeSnapshot: (cardId: string) => void; // Made cardId required as it's usually context-specific
  readonly priceCardInteractions?: PriceCardInteractionCallbacks;
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onToggleFlip,
  onDeleteCardRequest,
  onTakeSnapshot,
  priceCardInteractions,
}) => {
  const handleFlip = () => onToggleFlip(card.id);
  const handleDelete = () => onDeleteCardRequest(card.id);
  const handleSnapshot = () => {
    // Snapshot button is only rendered for "price" type cards, so this check is robust.
    if (card.type === "price") {
      onTakeSnapshot(card.id);
    }
  };

  const cardOverlays = (
    <div className="absolute top-2 right-2 z-20 flex flex-col space-y-2">
      <button
        onClick={handleDelete}
        title="Delete Card"
        aria-label={`Delete card ${card.symbol}`}
        className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-md transition-colors"
      >
        X {/* Consider using an SVG icon */}
      </button>
      {/* Only show snapshot button for live price cards */}
      {card.type === "price" && (
        <button
          onClick={handleSnapshot}
          title="Take Snapshot"
          aria-label={`Take snapshot of ${card.symbol}`}
          className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-md transition-colors"
        >
          S {/* Consider using an SVG icon */}
        </button>
      )}
    </div>
  );

  const cardWrapperClassName = "w-[280px] h-[420px] shadow-lg relative"; // Define consistent card dimensions

  // Handle live price card
  if (card.type === "price") {
    // TypeScript knows `card` is PriceCardData here due to discriminated union
    // and `DisplayableCard` combines it with `isFlipped`.
    const priceCard = card as PriceCardData & { isFlipped: boolean };
    return (
      <PriceCardContainer
        cardData={priceCard}
        isFlipped={priceCard.isFlipped}
        onFlip={handleFlip}
        className={cardWrapperClassName}
        onPriceCardSmaClick={priceCardInteractions?.onPriceCardSmaClick}
        onPriceCardRangeContextClick={
          priceCardInteractions?.onPriceCardRangeContextClick
        }
        onPriceCardOpenPriceClick={
          priceCardInteractions?.onPriceCardOpenPriceClick
        }
        onPriceCardGenerateDailyPerformanceSignal={
          priceCardInteractions?.onPriceCardGenerateDailyPerformanceSignal
        }
      >
        {cardOverlays}
      </PriceCardContainer>
    );
  }

  // Handle price snapshot card
  if (card.type === "price_snapshot") {
    const snapshotCard = card as PriceCardSnapshotData & { isFlipped: boolean };

    // Adapt PriceCardSnapshotData to the PriceCardData structure for PriceCardContainer
    const faceDataForSnapshotDisplay: PriceCardFaceData = {
      timestamp: snapshotCard.snapshotTime,
      price: snapshotCard.capturedPrice,
      // These fields are typically for live data and may not apply to a simple snapshot
      dayChange: null,
      changePercentage: null,
      dayHigh: null,
      dayLow: null,
      dayOpen: null,
      previousClose: null,
      volume: null,
    };

    // `snapshotCard.backData` is of type `PriceCardSnapshotSpecificBackData`
    // `PriceCardContainer` (via `PriceCardData`) expects `backData` of type `PriceCardSpecificBackData`
    const backDataForSnapshotDisplay: PriceCardSpecificBackData = {
      explanation:
        snapshotCard.backData.explanation ||
        `Snapshot for ${snapshotCard.symbol}`,
      // These technical indicators are not part of PriceCardSnapshotData as defined
      marketCap: null,
      sma50d: null,
      sma200d: null,
    };

    // If you want to include discoveredReason in the explanation for snapshots:
    // if (snapshotCard.backData.discoveredReason) {
    //   backDataForSnapshotDisplay.explanation += ` (Reason: ${snapshotCard.backData.discoveredReason})`;
    // }

    const adaptedDataForSnapshotDisplay: PriceCardData = {
      id: snapshotCard.id,
      type: "price", // Important: PriceCardContainer expects a card with type "price" in its cardData if it's strictly typed for PriceCardData
      symbol: snapshotCard.symbol,
      faceData: faceDataForSnapshotDisplay,
      backData: backDataForSnapshotDisplay,
    };

    return (
      <PriceCardContainer
        cardData={adaptedDataForSnapshotDisplay} // This is now correctly shaped PriceCardData
        isFlipped={snapshotCard.isFlipped}
        onFlip={handleFlip}
        className={`${cardWrapperClassName} opacity-90`} // Snapshots might be visually distinct
        // Interactions are typically disabled or different for snapshots
        // No priceCardInteractions are passed here, so interactive elements in PriceCardContent will be non-functional or use default behavior.
      >
        {/* Overlays are still available (delete button) */}
        {cardOverlays}
      </PriceCardContainer>
    );
  }

  // Fallback for unsupported card types
  // Asserting to BaseCardData here to satisfy TypeScript if it narrows `card` to `never`
  // due to exhaustive checks (though less likely with direct return like this).
  // Direct access to card.id, card.type, card.symbol is fine as DisplayableCard ensures these via BaseCardData.
  const baseInfo = card as BaseCardData;
  return (
    <div
      className={`${cardWrapperClassName} p-4 border rounded bg-gray-200 flex flex-col items-center justify-center`}
    >
      <p className="font-semibold">Unsupported Card Type</p>
      <p className="text-sm text-gray-600">ID: {baseInfo.id}</p>
      <p className="text-sm text-gray-600">Type: {baseInfo.type}</p>
      <p className="text-sm text-gray-600">Symbol: {baseInfo.symbol}</p>
      {cardOverlays} {/* Still show overlays for deletion if applicable */}
    </div>
  );
};

export default GameCard;
