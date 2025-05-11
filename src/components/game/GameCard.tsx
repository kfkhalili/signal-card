// src/components/game/GameCard.tsx
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
  ProfileCardData as ProfileCardDataType, // Alias for clarity
  ProfileCardInteractionCallbacks,
} from "./cards/profile-card/profile-card.types"; // Import ProfileCard types
import type {
  BaseCardData,
  CardActionContext,
  BaseCardSocialInteractions,
  CardType,
} from "./cards/base-card/base-card.types";

import { PriceCardContainer } from "./cards/price-card/PriceCardContainer";
import { ProfileCardContainer } from "@/components/game/cards/profile-card/ProfileCardContainer"; // Import ProfileCardContainer
import { cn } from "../../lib/utils";
import { XIcon } from "lucide-react";

// For PriceCard
type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

// For ProfileCard (ensure this matches what ProfileCardContainer expects)
type ProfileSpecificInteractionsForContainer = ProfileCardInteractionCallbacks;

interface GameCardProps {
  readonly card: DisplayableCard;
  readonly onToggleFlip: (id: string) => void;
  readonly onDeleteCardRequest: (id: string) => void;
  readonly socialInteractions?: BaseCardSocialInteractions;

  // Callbacks for PriceCard
  readonly priceSpecificInteractions?: PriceSpecificInteractionsForContainer;
  // Callbacks for ProfileCard
  readonly profileSpecificInteractions?: ProfileSpecificInteractionsForContainer;
  // Callback for PriceCard header click -> show ProfileCard
  readonly onHeaderIdentityClick?: (context: CardActionContext) => void;
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onToggleFlip,
  onDeleteCardRequest,
  socialInteractions,
  priceSpecificInteractions,
  profileSpecificInteractions, // New prop
  onHeaderIdentityClick, // New prop
}) => {
  const handleFlip = () => onToggleFlip(card.id);

  const handleDeleteAction = (context: CardActionContext) => {
    onDeleteCardRequest(context.id);
  };

  const cardContextForBaseCard: CardActionContext = {
    id: card.id,
    symbol: card.symbol,
    type: card.type as CardType,
    companyName: card.companyName ?? null,
    logoUrl: card.logoUrl ?? null,
  };

  const cardWrapperClassName = "w-full aspect-[63/88] relative";

  if (card.type === "price") {
    const priceCardData = card as PriceCardData & { isFlipped: boolean };
    return (
      <PriceCardContainer
        cardData={priceCardData}
        isFlipped={priceCardData.isFlipped}
        onFlip={handleFlip}
        cardContext={cardContextForBaseCard}
        socialInteractions={socialInteractions}
        onDeleteRequest={handleDeleteAction}
        priceSpecificInteractions={priceSpecificInteractions}
        onHeaderIdentityClick={onHeaderIdentityClick} // Pass this down
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
      yearHigh: snapshotCard.yearHighAtCapture,
      yearLow: snapshotCard.yearLowAtCapture,
    };
    const adaptedBackData: PriceCardSpecificBackData = {
      description: snapshotCard.backData.description,
      marketCap: null,
      sma50d: null,
      sma200d: null,
    };
    const adaptedDataForSnapshotDisplay: PriceCardData = {
      id: snapshotCard.id,
      type: "price",
      symbol: snapshotCard.symbol,
      createdAt: snapshotCard.createdAt,
      companyName: snapshotCard.companyName,
      logoUrl: snapshotCard.logoUrl,
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
        onDeleteRequest={handleDeleteAction}
        // Snapshots likely don't have the header click to show profile, or live interactions
        priceSpecificInteractions={undefined}
        onHeaderIdentityClick={undefined}
        className={cn(cardWrapperClassName, "opacity-90")}
      />
    );
  }

  if (card.type === "profile") {
    const profileCardData = card as ProfileCardDataType & {
      isFlipped: boolean;
    };
    return (
      <ProfileCardContainer
        cardData={profileCardData}
        isFlipped={profileCardData.isFlipped}
        onFlip={handleFlip}
        cardContext={cardContextForBaseCard}
        socialInteractions={socialInteractions}
        onDeleteRequest={handleDeleteAction}
        specificInteractions={profileSpecificInteractions}
        // ProfileCard's own header won't trigger another profile card.
        // onHeaderIdentityClick={undefined}
        className={cardWrapperClassName}
      />
    );
  }

  // Fallback for any other card types
  const baseInfo = card as BaseCardData & { isFlipped: boolean };
  return (
    <div
      className={cn(
        cardWrapperClassName,
        "p-4 border rounded-2xl bg-muted/30 text-muted-foreground",
        "flex flex-col items-center justify-center shadow-lg relative"
      )}>
      {baseInfo.type !== "price" &&
        baseInfo.type !== "profile" && ( // Adjust condition if needed
          <button
            onClick={() => handleDeleteAction(cardContextForBaseCard)}
            title="Delete Card"
            aria-label={`Delete ${baseInfo.symbol} card`}
            className={cn(
              "absolute top-1.5 right-1.5 z-20 p-1.5 flex items-center justify-center transition-colors",
              "text-muted-foreground/70 hover:text-primary rounded-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            )}>
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
