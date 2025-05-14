// src/components/game/GameCard.tsx
import React from "react";
import type {
  DisplayableCard,
  DisplayableCardState,
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
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type DisplayableLivePriceCardWithState = PriceCardData & DisplayableCardState;
type DisplayableUserProfileCardWithState = ProfileCardData &
  DisplayableCardState;

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
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onToggleFlip,
  onDeleteCardRequest,
  socialInteractions,
  priceSpecificInteractions,
  profileSpecificInteractions,
  onHeaderIdentityClick,
}) => {
  // Log the received card prop, specifically its liked state
  console.log(
    `[GameCard] RENDER for ${card.symbol} (ID: ${card.id}): isLikedByCurrentUser = ${card.isLikedByCurrentUser}`
  );

  const handleFlip = () => onToggleFlip(card.id);

  const handleDeleteAction = (context: CardActionContext) => {
    onDeleteCardRequest(context.id);
  };

  const {
    id: cardId,
    symbol: cardSymbol,
    type: cardTypeActual,
    companyName: cardCompanyName,
    logoUrl: cardLogoUrl,
    currentRarity: cardCurrentRarity,
    rarityReason: cardRarityReason,
    isLikedByCurrentUser,
  } = card;

  let websiteUrlForContext: string | null | undefined = null;
  if (card.type === "profile") {
    const profileCardData = card as ProfileCardData;
    websiteUrlForContext = profileCardData.staticData?.website;
  }

  const cardContextForBaseCard: CardActionContext = {
    id: cardId,
    symbol: cardSymbol,
    type: cardTypeActual as CardType,
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
      return (
        <div className={cn(cardWrapperClassName, "p-4 border border-dashed")}>
          Unsupported Card Type: {cardTypeActual}
        </div>
      );
  }
};

// If GameCard is memoized, ensure the comparison function handles 'card' prop changes correctly.
// For now, let's assume it's not memoized or React.memo is used without custom compare,
// relying on the parent passing a new 'card' object reference.
export default React.memo(GameCard); // Example of memoization
// If using React.memo, ensure that when a card's 'isLikedByCurrentUser' state changes,
// the 'card' object reference itself is new. Our .map in ActiveCardsSection should do this.
