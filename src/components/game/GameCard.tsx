// src/app/components/game/GameCard.tsx
import React from "react";
import type { DisplayableCard } from "@/components/game/types";
import type {
  PriceCardData,
  PriceCardSnapshotData,
  PriceCardInteractionCallbacks, // For PriceSpecificInteractions type
  PriceCardSpecificBackData,
  PriceCardFaceData,
} from "./cards/price-card/price-card.types"; // PriceCardData now includes companyName, logoUrl
import type {
  BaseCardData,
  CardActionContext,
  BaseCardSocialInteractions,
  CardType,
} from "./cards/base-card/base-card.types"; // CardActionContext now includes companyName, logoUrl
import { PriceCardContainer } from "./cards/price-card/PriceCardContainer";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

interface GameCardProps {
  readonly card: DisplayableCard; // This is ConcreteCardData & DisplayableCardState
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
    onDeleteCardRequest(context.id);
  };

  // Construct cardContext, ensuring companyName and logoUrl are included
  // The 'card' prop is DisplayableCard, which means it's either PriceCardData or PriceCardSnapshotData (etc.)
  // Both PriceCardData and PriceCardSnapshotData should now have companyName and logoUrl from your types.
  const cardContextForBaseCard: CardActionContext = {
    id: card.id,
    symbol: card.symbol,
    type: card.type as CardType,
    companyName: card.companyName ?? null, // Access directly from card prop
    logoUrl: card.logoUrl ?? null, // Access directly from card prop
  };

  const cardWrapperClassName = "w-[280px] aspect-[63/88] relative";

  if (card.type === "price") {
    const priceCardData = card as PriceCardData & { isFlipped: boolean }; // card is already PriceCardData here
    return (
      <PriceCardContainer
        cardData={priceCardData}
        isFlipped={priceCardData.isFlipped}
        onFlip={handleFlip}
        cardContext={cardContextForBaseCard}
        socialInteractions={socialInteractions}
        onDeleteRequest={handleDeleteAction} // Enable delete for live price cards
        priceSpecificInteractions={priceSpecificInteractions}
        className={cardWrapperClassName}
      />
    );
  }

  if (card.type === "price_snapshot") {
    const snapshotCard = card as PriceCardSnapshotData & { isFlipped: boolean };
    // Adapt snapshot data for PriceCardContainer display
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
      companyName: snapshotCard.companyName, // Pass through from snapshot
      logoUrl: snapshotCard.logoUrl, // Pass through from snapshot
      faceData: adaptedFaceData,
      backData: adaptedBackData,
    };

    return (
      <PriceCardContainer
        cardData={adaptedDataForSnapshotDisplay} // This contains the adapted profile info
        isFlipped={snapshotCard.isFlipped}
        onFlip={handleFlip}
        cardContext={cardContextForBaseCard} // cardContext also has profile info
        socialInteractions={socialInteractions}
        onDeleteRequest={handleDeleteAction}
        priceSpecificInteractions={undefined}
        className={cn(cardWrapperClassName, "opacity-90")}
      />
    );
  }

  const baseInfo = card as BaseCardData & { isFlipped: boolean };
  return (
    <div
      className={cn(
        cardWrapperClassName,
        "p-4 border rounded-2xl bg-muted/30 text-muted-foreground",
        "flex flex-col items-center justify-center shadow-lg relative"
      )}
    >
      {baseInfo.type !== "price" && (
        <button
          onClick={() => handleDeleteAction(cardContextForBaseCard)}
          title="Delete Card"
          aria-label={`Delete ${baseInfo.symbol} card`}
          className={cn(
            "absolute top-1.5 right-1.5 z-20 p-1.5 flex items-center justify-center transition-colors",
            "text-muted-foreground/70 hover:text-primary rounded-sm",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          )}
        >
          <XIcon size={16} strokeWidth={2.5} />
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
