// src/components/game/GameCard.tsx
import React from "react";
import type { DisplayableCard } from "@/components/game/types";
import type { PriceCardInteractionCallbacks } from "./cards/price-card/price-card.types";
import type {
  ProfileCardData,
  ProfileCardInteractionCallbacks as ProfileCardSpecificInteractions,
} from "./cards/profile-card/profile-card.types";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
  CardType,
} from "./cards/base-card/base-card.types";
import { cn } from "@/lib/utils";
import { getCardRenderer } from "@/components/game/cardRenderers";
import "@/components/game/cards/rendererRegistryInitializer";

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
  readonly profileSpecificInteractions?: ProfileCardSpecificInteractions;
  readonly onHeaderIdentityClick?: (context: CardActionContext) => void;
  readonly likeCount?: number;
  readonly commentCount?: number;
  readonly collectionCount?: number;
  readonly isSavedByCurrentUser?: boolean;
  readonly isSaveDisabled?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onToggleFlip,
  onDeleteCardRequest,
  socialInteractions,
  priceSpecificInteractions,
  profileSpecificInteractions,
  onHeaderIdentityClick,
  likeCount,
  commentCount,
  collectionCount,
  isSavedByCurrentUser,
  isSaveDisabled,
}) => {
  const handleFlip = React.useCallback(() => {
    onToggleFlip(card.id);
  }, [onToggleFlip, card.id]);

  const cardActionContextValue: CardActionContext = React.useMemo(() => {
    let websiteUrlForContext: string | null | undefined = undefined;
    if (card.type === "profile") {
      const profileCardData = card as ProfileCardData; // Safe cast after type check
      websiteUrlForContext = profileCardData.staticData?.website;
    }
    return {
      id: card.id,
      symbol: card.symbol,
      type: card.type,
      companyName: card.companyName ?? null,
      logoUrl: card.logoUrl ?? null,
      websiteUrl: websiteUrlForContext ?? null,
    };
  }, [card]);

  const handleDeleteRequestWithContext = React.useCallback(
    (context: CardActionContext) => {
      onDeleteCardRequest(context.id);
    },
    [onDeleteCardRequest]
  );

  const cardWrapperClassName = "w-full aspect-[63/88] relative";

  const commonContainerProps = {
    isFlipped: card.isFlipped,
    onFlip: handleFlip,
    cardContext: cardActionContextValue,
    currentRarity: card.currentRarity,
    rarityReason: card.rarityReason,
    socialInteractions:
      isSaveDisabled && socialInteractions
        ? { ...socialInteractions, onSave: undefined }
        : socialInteractions,
    onDeleteRequest: handleDeleteRequestWithContext,
    onHeaderIdentityClick: onHeaderIdentityClick,
    className: cardWrapperClassName,
    isLikedByCurrentUser: card.isLikedByCurrentUser,
    isSavedByCurrentUser: isSavedByCurrentUser,
    likeCount: likeCount,
    commentCount: commentCount,
    collectionCount: collectionCount,
    isSaveDisabled: isSaveDisabled,
  };

  const CardRenderer = getCardRenderer(card.type);

  if (!CardRenderer) {
    const unknownType = card.type; // Removed 'as any'
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[GameCard] No renderer registered for card type: ${unknownType}. Card ID: ${card.id}`
      );
    }
    return (
      <div
        className={cn(
          cardWrapperClassName,
          "p-4 border border-dashed rounded-lg flex items-center justify-center text-destructive bg-destructive/10"
        )}>
        <p className="text-center text-xs">
          <strong>Unsupported Card Type</strong>
          <br />
          Type: {unknownType || "Unknown"}
          <br />
          ID: {card.id}
        </p>
      </div>
    );
  }

  return (
    <CardRenderer
      {...commonContainerProps}
      cardData={card}
      priceSpecificInteractions={
        card.type === "price" ? priceSpecificInteractions : undefined
      }
      specificInteractions={
        card.type === "profile" ? profileSpecificInteractions : undefined
      }
    />
  );
};

export default React.memo(GameCard);
