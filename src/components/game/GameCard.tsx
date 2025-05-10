// src/app/components/game/GameCard.tsx
import React from "react";
import type { DisplayableCard } from "@/components/game/types";
import type {
  PriceCardData,
  PriceCardSnapshotData,
  PriceCardInteractionCallbacks,
  PriceCardSpecificBackData,
  PriceCardFaceData,
} from "./cards/price-card/price-card.types";
import type {
  BaseCardData,
  CardActionContext,
  BaseCardSocialInteractions,
  CardType,
} from "./cards/base-card/base-card.types";
import { PriceCardContainer } from "./cards/price-card/PriceCardContainer";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react"; // Ensure XIcon is imported

// Define which specific interaction callbacks PriceCardContainer needs for PriceCardContent
type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

interface GameCardProps {
  readonly card: DisplayableCard;
  readonly onToggleFlip: (id: string) => void;
  readonly onDeleteCardRequest: (id: string) => void;
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

  const handleDeleteAction = (context: CardActionContext) => {
    console.log("Delete requested for card:", context.id, context.symbol);
    onDeleteCardRequest(context.id);
  };

  const cardContextForBaseCard: CardActionContext = {
    id: card.id,
    symbol: card.symbol,
    type: card.type as CardType, // Cast to ensure compatibility
  };

  const cardWrapperClassName = "w-[280px] aspect-[63/88] relative";

  if (card.type === "price") {
    const priceCardData = card as PriceCardData & { isFlipped: boolean };
    return (
      <PriceCardContainer
        cardData={priceCardData}
        isFlipped={priceCardData.isFlipped}
        onFlip={handleFlip}
        cardContext={cardContextForBaseCard}
        socialInteractions={socialInteractions}
        // MODIFIED HERE: Pass handleDeleteAction to enable delete for live price cards
        onDeleteRequest={handleDeleteAction}
        priceSpecificInteractions={priceSpecificInteractions}
        className={cardWrapperClassName}
      />
    );
  }

  if (card.type === "price_snapshot") {
    const snapshotCard = card as PriceCardSnapshotData & { isFlipped: boolean };
    const adaptedFaceData: PriceCardFaceData = {
      timestamp: snapshotCard.snapshotTime,
      price: snapshotCard.capturedPrice,
      dayChange: null,
      changePercentage: null,
      dayHigh: null,
      dayLow: null,
      dayOpen: null,
      previousClose: null,
      volume: null,
    };
    const adaptedBackData: PriceCardSpecificBackData = {
      explanation: snapshotCard.backData.explanation,
      marketCap: null,
      sma50d: null,
      sma200d: null,
    };
    const adaptedDataForSnapshotDisplay: PriceCardData = {
      id: snapshotCard.id,
      type: "price",
      symbol: snapshotCard.symbol,
      createdAt: snapshotCard.createdAt,
      faceData: adaptedFaceData,
      backData: adaptedBackData,
    };

    return (
      <PriceCardContainer
        cardData={adaptedDataForSnapshotDisplay}
        isFlipped={snapshotCard.isFlipped}
        onFlip={handleFlip}
        cardContext={cardContextForBaseCard}
        socialInteractions={socialInteractions}
        onDeleteRequest={handleDeleteAction} // Snapshots ARE deletable
        priceSpecificInteractions={undefined}
        className={cn(cardWrapperClassName, "opacity-90")}
      />
    );
  }

  // Fallback for other/unsupported card types
  const baseInfo = card as BaseCardData & { isFlipped: boolean };

  return (
    <div
      className={cn(
        cardWrapperClassName,
        "p-4 border rounded-2xl bg-muted/30 text-muted-foreground",
        "flex flex-col items-center justify-center shadow-lg relative"
      )}
    >
      {/* For non-price and non-snapshot cards, we pass handleDeleteAction to BaseCard if we were using it directly.
          Since we are rendering a simple div here, we add the button manually if needed.
          The original logic was to disable delete for "price" type in BaseCard.
          If this fallback is for types OTHER than "price", the delete button should appear.
      */}
      {/* This button will only render if this fallback is reached AND baseInfo.type is NOT "price" */}
      {/* If you want ALL fallback cards to be deletable, remove the baseInfo.type check or adjust. */}
      {baseInfo.type !== "price" && ( // Or simply always show if it's a fallback card
        <button
          onClick={() => handleDeleteAction(cardContextForBaseCard)}
          title="Delete Card"
          aria-label={`Delete ${baseInfo.symbol} card`}
          className="absolute top-2 right-2 z-20 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md transition-colors"
        >
          <XIcon size={14} strokeWidth={2.5} />
        </button>
      )}
      <p className="font-semibold">Unsupported Card Type</p>
      <p className="text-sm ">ID: {baseInfo.id}</p>
      <p className="text-sm ">Type: {baseInfo.type}</p>
      <p className="text-sm ">Symbol: {baseInfo.symbol}</p>
    </div>
  );
};

export default GameCard;
