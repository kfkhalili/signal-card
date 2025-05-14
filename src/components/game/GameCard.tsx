// src/components/game/GameCard.tsx
// "use client"; // This component is already a client component

import React from "react";
import type {
  DisplayableCard,
  // Ensure these types are correctly defined or imported if used for casting
  // DisplayableLivePriceCardWithState,
  // DisplayableUserProfileCardWithState
} from "@/components/game/types";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
} from "./cards/price-card/price-card.types";
import type {
  ProfileCardData,
  ProfileCardInteractionCallbacks as ProfileCardSpecificInteractions,
} from "./cards/profile-card/profile-card.types";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
  CardType,
} from "./cards/base-card/base-card.types";

import { PriceCardContainer } from "./cards/price-card/PriceCardContainer";
import { ProfileCardContainer } from "@/components/game/cards/profile-card/ProfileCardContainer";
import { cn } from "@/lib/utils";
// import { XIcon } from "lucide-react"; // Not used directly here
// import { Badge } from "@/components/ui/badge"; // Not used directly here

// Type aliases for specific card structures with state
type DisplayableLivePriceCardWithState = PriceCardData & {
  isFlipped: boolean /* other state fields */;
};
type DisplayableUserProfileCardWithState = ProfileCardData & {
  isFlipped: boolean /* other state fields */;
};

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
  // Count props
  likeCount?: number;
  commentCount?: number;
  collectionCount?: number;
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onToggleFlip,
  onDeleteCardRequest,
  socialInteractions,
  priceSpecificInteractions,
  profileSpecificInteractions,
  onHeaderIdentityClick,
  likeCount, // Destructure count props
  commentCount,
  collectionCount,
}) => {
  // ADD THIS LOG
  console.log(
    `[GameCard ${card.symbol}] Rendering. Props: likeCount=${likeCount}, commentCount=${commentCount}, collectionCount=${collectionCount}, card.isLikedByCurrentUser=${card.isLikedByCurrentUser}`
  );

  const handleFlip = () => onToggleFlip(card.id);

  const handleDeleteAction = (context: CardActionContext) => {
    onDeleteCardRequest(context.id);
  };

  const {
    id: cardId,
    symbol: cardSymbol,
    type: cardTypeActual, // This is the 'type' from ConcreteCardData
    companyName: cardCompanyName,
    logoUrl: cardLogoUrl,
    currentRarity: cardCurrentRarity,
    rarityReason: cardRarityReason,
    isLikedByCurrentUser,
  } = card;

  let websiteUrlForContext: string | null | undefined = null;
  if (card.type === "profile") {
    // Cast to ProfileCardData to access staticData safely
    const profileCardData = card as ProfileCardData;
    websiteUrlForContext = profileCardData.staticData?.website;
  }

  const cardContextForBaseCard: CardActionContext = {
    id: cardId,
    symbol: cardSymbol,
    type: cardTypeActual as CardType, // Cast if CardType from base-card.types is more restrictive
    companyName: cardCompanyName ?? null,
    logoUrl: cardLogoUrl ?? null,
    websiteUrl: websiteUrlForContext ?? null,
  };

  const cardWrapperClassName = "w-full aspect-[63/88] relative";

  const commonContainerProps = {
    isFlipped: card.isFlipped,
    onFlip: handleFlip,
    cardContext: cardContextForBaseCard,
    currentRarity: cardCurrentRarity,
    rarityReason: cardRarityReason,
    socialInteractions: socialInteractions,
    onDeleteRequest: handleDeleteAction,
    onHeaderIdentityClick: onHeaderIdentityClick,
    className: cardWrapperClassName,
    isLikedByCurrentUser: isLikedByCurrentUser,
    // Pass counts down
    likeCount: likeCount,
    commentCount: commentCount,
    collectionCount: collectionCount,
  };

  switch (card.type) {
    case "price":
      const priceCard = card as DisplayableLivePriceCardWithState;
      return (
        <PriceCardContainer
          {...commonContainerProps}
          cardData={priceCard}
          priceSpecificInteractions={priceSpecificInteractions}
        />
      );
    case "profile":
      const profileCard = card as DisplayableUserProfileCardWithState;
      return (
        <ProfileCardContainer
          {...commonContainerProps}
          cardData={profileCard}
          specificInteractions={profileSpecificInteractions}
        />
      );
    default:
      // Fallback for unknown card types
      const unknownType = (card as any).type;
      return (
        <div className={cn(cardWrapperClassName, "p-4 border border-dashed")}>
          Unsupported Card Type: {unknownType || "Unknown"}
        </div>
      );
  }
};

export default React.memo(GameCard);
