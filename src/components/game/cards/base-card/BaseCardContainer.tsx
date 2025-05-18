/**
 * src/app/components/game/cards/base-card/BaseCardContainer.tsx
 */
import React from "react";
import BaseCard from "./BaseCard";
import type {
  BaseCardData,
  OnCardInteraction,
  BaseCardContainerDataPointDetails,
  CardActionContext,
  BaseCardSocialInteractions,
} from "./base-card.types";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";

interface BaseCardContainerProps {
  cardData: BaseCardData;
  isFlipped: boolean;
  onFlip: () => void;
  onCardInteraction?: OnCardInteraction<
    BaseCardData,
    BaseCardContainerDataPointDetails
  >;
  socialInteractions?: BaseCardSocialInteractions;
  className?: string;
  innerCardClassName?: string;
  isSaveDisabled?: boolean;
}

export const BaseCardContainer = React.memo<BaseCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    onCardInteraction,
    socialInteractions,
    className,
    innerCardClassName,
    isSaveDisabled,
  }) => {
    const handleLocalInteraction = (
      event:
        | React.MouseEvent<HTMLDivElement>
        | React.KeyboardEvent<HTMLDivElement>,
      elementType: string,
      value: unknown, // Changed from any to unknown
      details: BaseCardContainerDataPointDetails
    ) => {
      event.stopPropagation();
      if (onCardInteraction) {
        onCardInteraction({
          cardData,
          clickedDataPoint: {
            elementType,
            value,
            details,
          },
          originalUIEvent: event,
        });
      }
    };

    const faceContentNode = (
      <>
        <ClickableDataItem
          isInteractive={!!onCardInteraction}
          onClickHandler={(e) =>
            handleLocalInteraction(e, "symbol", cardData.symbol, {
              kind: "symbol",
            })
          }
          baseClassName="font-bold mb-1"
          interactiveClassName="hover:text-primary underline"
          aria-label={
            onCardInteraction
              ? `Interact with symbol ${cardData.symbol}`
              : undefined
          }
          data-testid="base-card-symbol">
          {cardData.symbol} - Front
        </ClickableDataItem>
        <ClickableDataItem
          isInteractive={!!onCardInteraction}
          onClickHandler={(e) =>
            handleLocalInteraction(e, "type", cardData.type, { kind: "type" })
          }
          interactiveClassName="hover:text-primary underline"
          aria-label={
            onCardInteraction
              ? `Interact with card type ${cardData.type}`
              : undefined
          }
          data-testid="base-card-type">
          Type: {cardData.type}
        </ClickableDataItem>
      </>
    );

    const backContentNode = (
      <>
        <ClickableDataItem
          isInteractive={!!onCardInteraction}
          onClickHandler={(e) =>
            handleLocalInteraction(e, "symbol", cardData.symbol, {
              kind: "symbol",
            })
          }
          baseClassName="font-bold mb-1"
          interactiveClassName="hover:text-primary underline"
          aria-label={
            onCardInteraction
              ? `Interact with symbol ${cardData.symbol}`
              : undefined
          }
          data-testid="base-card-symbol-back">
          {cardData.symbol} - Back
        </ClickableDataItem>
        <ClickableDataItem
          isInteractive={!!onCardInteraction}
          onClickHandler={(e) =>
            handleLocalInteraction(
              e,
              "description",
              cardData.backData.description,
              { kind: "description" }
            )
          }
          interactiveClassName="hover:text-primary underline"
          aria-label={
            onCardInteraction ? `Interact with description` : undefined
          }
          data-testid="base-card-description">
          {cardData.backData.description}
        </ClickableDataItem>
      </>
    );

    const cardContextForBaseCard: CardActionContext = {
      id: cardData.id,
      symbol: cardData.symbol,
      type: cardData.type,
      companyName: cardData.companyName,
      logoUrl: cardData.logoUrl,
      websiteUrl: cardData.websiteUrl,
    };

    return (
      <div
        className="h-full w-full cursor-pointer"
        onClick={onFlip}
        role="button"
        aria-label={`Flip ${cardData.symbol} card`}
        tabIndex={0}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && !e.defaultPrevented
            ? onFlip()
            : null
        }>
        <BaseCard
          isFlipped={isFlipped}
          onFlip={onFlip}
          faceContent={faceContentNode}
          backContent={backContentNode}
          cardContext={cardContextForBaseCard}
          socialInteractions={socialInteractions}
          className={className}
          innerCardClassName={innerCardClassName}
          isSaveDisabled={isSaveDisabled}
        />
      </div>
    );
  }
);

BaseCardContainer.displayName = "BaseCardContainer";
