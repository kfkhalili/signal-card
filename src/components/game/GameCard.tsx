// src/components/game/GameCard.tsx
"use client";

import React from "react";
import type { DisplayableCard } from "@/components/game/types";
import type { ProfileCardData } from "./cards/profile-card/profile-card.types";
import type {
  CardActionContext,
  OnGenericInteraction,
} from "./cards/base-card/base-card.types";
import { cn } from "@/lib/utils";
import {
  getCardRenderer,
  type RegisteredCardRendererProps,
} from "@/components/game/cardRenderers";
import "@/components/game/cards/rendererRegistryInitializer";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager"; // NEW IMPORT

interface GameCardProps {
  readonly card: DisplayableCard;
  readonly onToggleFlip: (id: string) => void;
  readonly onDeleteCardRequest: (id: string) => void;
  readonly onGenericInteraction: OnGenericInteraction;
  readonly className?: string;
  readonly innerCardClassName?: string;
  // NEW PROPS
  readonly isSelectionMode: boolean;
  readonly selectedDataItems: SelectedDataItem[];
  readonly onToggleItemSelection: (item: SelectedDataItem) => void;
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onToggleFlip,
  onDeleteCardRequest,
  onGenericInteraction,
  className,
  innerCardClassName,
  // NEW PROPS
  isSelectionMode,
  selectedDataItems,
  onToggleItemSelection,
}) => {
  const handleFlip = React.useCallback(() => {
    onToggleFlip(card.id);
  }, [onToggleFlip, card.id]);

  const cardActionContextValue: CardActionContext = React.useMemo(() => {
    let websiteUrlForContext: string | null | undefined = undefined;
    if (card.type === "profile") {
      const profileCardData = card as ProfileCardData;
      websiteUrlForContext = profileCardData.staticData?.website;
    }
    return {
      id: card.id,
      symbol: card.symbol,
      type: card.type,
      companyName: card.companyName ?? null,
      displayCompanyName: card.displayCompanyName ?? null,
      logoUrl: card.logoUrl ?? null,
      websiteUrl: websiteUrlForContext ?? card.websiteUrl ?? null,
      backData: card.backData,
    };
  }, [card]);

  const handleDeleteRequestWithContextAdapter = React.useCallback(
    (context: CardActionContext) => {
      onDeleteCardRequest(context.id);
    },
    [onDeleteCardRequest]
  );

  const cardWrapperClassName = cn("w-full aspect-[63/88] relative", className);

  // NOTE: Subscription tracking is now handled centrally by useSubscriptionManager
  // in useWorkspaceManager. This prevents the bug where deleting one card removes
  // a subscription that other cards still need (e.g., deleting revenue card removes
  // financial-statements subscription even though solvency and cashuse cards still need it).

  const CardRenderer = getCardRenderer(card.type);

  if (!CardRenderer) {
    const unknownType = card.type;
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

  const rendererProps: RegisteredCardRendererProps = {
    cardData: card,
    isFlipped: card.isFlipped,
    onFlip: handleFlip,
    cardContext: cardActionContextValue,
    onDeleteRequest: handleDeleteRequestWithContextAdapter,
    className: cardWrapperClassName,
    innerCardClassName: innerCardClassName,
    onGenericInteraction: onGenericInteraction,
    isSelectionMode,
    selectedDataItems,
    onToggleItemSelection,
  };

  return <CardRenderer {...rendererProps} />;
};

export default React.memo(GameCard);
