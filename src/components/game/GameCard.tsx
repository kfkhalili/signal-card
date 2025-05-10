// src/app/components/game/GameCard.tsx
import React from "react";
import type { DisplayableCard } from "./types";
import type {
  PriceCardData,
  PriceCardSnapshotData,
  PriceCardInteractionCallbacks, // For PriceSpecificInteractions type
} from "./cards/price-card/price-card.types";
import type {
  BaseCardData, // For fallback and constructing CardActionContext
  CardActionContext,
  BaseCardSocialInteractions,
} from "./cards/base-card/base-card.types";
import { PriceCardContainer } from "./cards/price-card/PriceCardContainer";

// Define which specific interaction callbacks PriceCardContainer needs
type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks, // Assuming this type now ONLY contains these specific callbacks
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

interface GameCardProps {
  readonly card: DisplayableCard;
  readonly onToggleFlip: (id: string) => void;
  readonly onDeleteCardRequest: (id: string) => void;
  // New props for interactions
  readonly socialInteractions?: BaseCardSocialInteractions;
  readonly priceSpecificInteractions?: PriceSpecificInteractionsForContainer;
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onToggleFlip,
  onDeleteCardRequest,
  socialInteractions,
  priceSpecificInteractions,
}) => {
  const handleFlip = () => onToggleFlip(card.id);
  const handleDelete = () => onDeleteCardRequest(card.id);

  // Construct cardContext from the current card
  const cardContextForBaseCard: CardActionContext = {
    id: card.id,
    symbol: card.symbol,
    type: card.type,
  };

  const cardOverlays = (
    <div className="absolute top-2 right-2 z-20 flex flex-col space-y-2">
      <button
        onClick={handleDelete}
        title="Delete Card"
        aria-label={`Delete card ${card.symbol}`}
        className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-md transition-colors"
      >
        X
      </button>
      {/* Snapshot button is removed; "Save" in social bar handles this */}
    </div>
  );

  const cardWrapperClassName = "w-[280px] aspect-[63/88] relative"; // Shadow is now on BaseCard's ShadCards

  if (card.type === "price") {
    const priceCardData = card as PriceCardData & { isFlipped: boolean };
    return (
      <PriceCardContainer
        cardData={priceCardData}
        isFlipped={priceCardData.isFlipped}
        onFlip={handleFlip}
        cardContext={cardContextForBaseCard} // Pass context
        socialInteractions={socialInteractions} // Pass social interactions
        priceSpecificInteractions={priceSpecificInteractions} // Pass price-specific interactions
        className={cardWrapperClassName}
      >
        {cardOverlays}
      </PriceCardContainer>
    );
  }

  if (card.type === "price_snapshot") {
    const snapshotCard = card as PriceCardSnapshotData & { isFlipped: boolean };
    const adaptedDataForSnapshotDisplay: PriceCardData = {
      id: snapshotCard.id,
      type: "price", // To use PriceCardContainer
      symbol: snapshotCard.symbol,
      createdAt: snapshotCard.createdAt,
      faceData: {
        timestamp: snapshotCard.snapshotTime,
        price: snapshotCard.capturedPrice,
        dayChange: null,
        changePercentage: null,
        dayHigh: null,
        dayLow: null,
        dayOpen: null,
        previousClose: null,
        volume: null,
      },
      // Ensure backData structure matches PriceCardSpecificBackData
      // This might require more careful mapping if snapshotCard.backData is different
      backData: {
        explanation: snapshotCard.backData.explanation,
        marketCap: null, // Snapshots typically don't have live market cap, SMAs
        sma50d: null,
        sma200d: null,
      },
    };
    return (
      <PriceCardContainer
        cardData={adaptedDataForSnapshotDisplay}
        isFlipped={snapshotCard.isFlipped}
        onFlip={handleFlip}
        cardContext={cardContextForBaseCard} // Snapshots can also have context
        socialInteractions={socialInteractions} // Snapshots can also have social interactions
        // priceSpecificInteractions are likely not applicable to snapshots
        className={`${cardWrapperClassName} opacity-90`}
      >
        {cardOverlays}
      </PriceCardContainer>
    );
  }

  const baseInfo = card as BaseCardData;
  return (
    <div
      className={`${cardWrapperClassName} p-4 border rounded bg-gray-200 flex flex-col items-center justify-center shadow-lg`}
    >
      <p className="font-semibold">Unsupported Card Type</p>
      <p className="text-sm text-gray-600">ID: {baseInfo.id}</p>
      <p className="text-sm text-gray-600">Type: {baseInfo.type}</p>
      <p className="text-sm text-gray-600">Symbol: {baseInfo.symbol}</p>
      {/* Consider if overlays should be here too */}
      {/* {cardOverlays} */}
      {/* Social bar won't appear here unless BaseCard is used directly */}
    </div>
  );
};

export default GameCard;
