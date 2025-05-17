// src/components/game/GameCard.tsx
import React from "react";
import type { DisplayableCard } from "@/components/game/types";
import type { PriceCardInteractionCallbacks } from "./cards/price-card/price-card.types";
import type {
  ProfileCardData, // Keep for casting if needed
  ProfileCardInteractionCallbacks as ProfileCardSpecificInteractions,
} from "./cards/profile-card/profile-card.types";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
  CardType,
} from "./cards/base-card/base-card.types";
import { cn } from "@/lib/utils";

// Import the registry getter and the initializer file (to run registrations)
import { getCardRenderer } from "@/components/game/cardRenderers";
// This import ensures the registration code in rendererRegistryInitializer.ts runs once.
import "@/components/game/cards/rendererRegistryInitializer";

// Define the shape for price-specific interactions passed to PriceCardContainer
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

  // Props for SocialBar state, passed down to BaseCard via specific containers
  readonly likeCount?: number;
  readonly commentCount?: number;
  readonly collectionCount?: number;
  readonly isSavedByCurrentUser?: boolean;
  // isLikedByCurrentUser is part of card: DisplayableCard
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
}) => {
  // if (process.env.NODE_ENV === "development") {
  //   console.debug(
  //     `[GameCard ${card.symbol}] Rendering with type ${card.type}. ID: ${card.id}, isLiked=${card.isLikedByCurrentUser}, isSaved=${isSavedByCurrentUser}`
  //   );
  // }

  const handleFlip = React.useCallback(() => {
    onToggleFlip(card.id);
  }, [onToggleFlip, card.id]);

  // Construct CardActionContext once, memoize it if card identity parts are stable
  // or if card itself is memoized from parent.
  const cardActionContextValue: CardActionContext = React.useMemo(() => {
    let websiteUrlForContext: string | null | undefined = undefined;
    if (card.type === "profile") {
      // Safely cast to ProfileCardData to access staticData.website
      const profileCardData = card as ProfileCardData;
      websiteUrlForContext = profileCardData.staticData?.website;
    }
    return {
      id: card.id,
      symbol: card.symbol,
      type: card.type as CardType, // CardType from base-card.types
      companyName: card.companyName ?? null,
      logoUrl: card.logoUrl ?? null,
      websiteUrl: websiteUrlForContext ?? null,
    };
  }, [card.id, card.symbol, card.type, card.companyName, card.logoUrl, card]);
  // Note: `card` is in dependency array; if card object reference changes often, this memo will re-run.

  // This adapter is passed to the specific card containers (PriceCardContainer, ProfileCardContainer).
  // These containers will then pass it to BaseCard, which expects a function taking `CardActionContext`.
  const handleDeleteRequestWithContext = React.useCallback(
    (context: CardActionContext) => {
      onDeleteCardRequest(context.id); // Call the prop from ActiveCardsSection with just the ID
    },
    [onDeleteCardRequest]
  );

  const cardWrapperClassName = "w-full aspect-[63/88] relative";

  // Prepare common props that all registered card containers will receive
  const commonContainerProps = {
    // cardData will be added specifically below
    isFlipped: card.isFlipped,
    onFlip: handleFlip,
    cardContext: cardActionContextValue,
    currentRarity: card.currentRarity,
    rarityReason: card.rarityReason,
    socialInteractions: socialInteractions,
    onDeleteRequest: handleDeleteRequestWithContext,
    onHeaderIdentityClick: onHeaderIdentityClick,
    className: cardWrapperClassName,
    // Props for SocialBar state (managed by BaseCard, passed through containers)
    isLikedByCurrentUser: card.isLikedByCurrentUser, // This comes from the card object itself
    isSavedByCurrentUser: isSavedByCurrentUser,
    likeCount: likeCount,
    commentCount: commentCount,
    collectionCount: collectionCount,
  };

  const CardRenderer = getCardRenderer(card.type as CardType);

  if (!CardRenderer) {
    const unknownType = (card as any).type;
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

  // Prepare specific props for the renderer
  // The registered components (PriceCardContainer, ProfileCardContainer) expect a prop named `cardData`
  // which holds the specific data structure (PriceCardData or ProfileCardData).
  // They also expect their specific interaction props.
  let rendererSpecificProps: {
    cardData: DisplayableCard; // The full card object which containers can cast
    [key: string]: any; // For specific interaction props
  } = {
    cardData: card, // Pass the entire card object as cardData
  };

  if (card.type === "price") {
    rendererSpecificProps.priceSpecificInteractions = priceSpecificInteractions;
  } else if (card.type === "profile") {
    // ProfileCardContainer expects its specific interactions prop to be named 'specificInteractions'
    rendererSpecificProps.specificInteractions = profileSpecificInteractions;
  }
  // Add `else if` blocks here for other card types and their specific interaction props as needed.

  return <CardRenderer {...commonContainerProps} {...rendererSpecificProps} />;
};

export default React.memo(GameCard);
