/**
 * src/app/components/game/cards/base-card/BaseCardContainer.tsx
 */
import React from "react";
import BaseCard from "./BaseCard"; // Assumes BaseCard now expects social props
import type {
  BaseCardData,
  OnCardInteraction,
  BaseCardContainerDataPointDetails,
  CardActionContext, // Import for constructing cardContext
  BaseCardSocialInteractions, // Import for the new prop
} from "./base-card.types";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";

interface BaseCardContainerProps {
  cardData: BaseCardData; // Provides id, symbol, type for cardContext
  isFlipped: boolean;
  onFlip: () => void;
  onCardInteraction?: OnCardInteraction<
    BaseCardData,
    BaseCardContainerDataPointDetails
  >;

  // New prop to pass social interactions down to BaseCard
  socialInteractions?: BaseCardSocialInteractions;

  className?: string;
  innerCardClassName?: string;
  // BaseCardContainer itself doesn't usually take 'children' if it's just defining
  // the face/back content for BaseCard. The 'children' on BaseCard are for overlays.
}

/**
 * BaseCardContainer is a conceptual base container.
 * It demonstrates wrapping BaseCard. It now also passes through social interaction props
 * and constructs the cardContext for BaseCard.
 */
export const BaseCardContainer = React.memo<BaseCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    onCardInteraction,
    socialInteractions, // New prop received here
    className,
    innerCardClassName,
  }) => {
    const handleLocalInteraction = (
      event:
        | React.MouseEvent<HTMLDivElement>
        | React.KeyboardEvent<HTMLDivElement>,
      elementType: string,
      value: any, // Keep 'any' if value can truly be anything for this generic interaction
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

    // This faceContent is the *main content area* for the face,
    // BaseCard will add the social bar below it.
    const faceContentNode = (
      <>
        {" "}
        {/* Use fragment if no single root needed, or a div if styling needed here */}
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
          data-testid="base-card-symbol"
        >
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
          data-testid="base-card-type"
        >
          Type: {cardData.type}
        </ClickableDataItem>
      </>
    );

    // This backContent is the *main content area* for the back,
    // BaseCard will add the social bar below it.
    const backContentNode = (
      <>
        {" "}
        {/* Use fragment or a div */}
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
          data-testid="base-card-symbol-back"
        >
          {cardData.symbol} - Back
        </ClickableDataItem>
        <ClickableDataItem
          isInteractive={!!onCardInteraction}
          onClickHandler={(e) =>
            handleLocalInteraction(
              e,
              "explanation",
              cardData.backData.explanation,
              { kind: "explanation" }
            )
          }
          interactiveClassName="hover:text-primary underline"
          aria-label={
            onCardInteraction ? `Interact with explanation` : undefined
          }
          data-testid="base-card-explanation"
        >
          {cardData.backData.explanation}
        </ClickableDataItem>
      </>
    );

    // Construct the cardContext from cardData
    const cardContextForBaseCard: CardActionContext = {
      id: cardData.id,
      symbol: cardData.symbol,
      type: cardData.type,
    };

    return (
      // The outer div of BaseCardContainer itself is not directly clickable for flip.
      // The flip is handled by the clickable wrappers around faceContent/backContent.
      // This component's primary role is to provide specific content to BaseCard.
      // If BaseCardContainer itself needs to be clickable, it would wrap BaseCard.
      // For now, assuming this container defines content for a BaseCard.
      <div
        className="h-full w-full cursor-pointer" // This div makes the whole area flippable
        onClick={onFlip}
        role="button"
        aria-label={`Flip ${cardData.symbol} card`}
        tabIndex={0}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && !e.defaultPrevented
            ? onFlip()
            : null
        }
      >
        <BaseCard
          isFlipped={isFlipped}
          faceContent={faceContentNode}
          backContent={backContentNode}
          cardContext={cardContextForBaseCard} // Pass the constructed context
          socialInteractions={socialInteractions} // Pass through social interactions
          className={className} // Pass className to BaseCard's outer div
          innerCardClassName={innerCardClassName} // Pass to BaseCard's inner flipping div
          // Children (overlays) for BaseCard would typically be passed by a component
          // that *uses* this BaseCardContainer, like GameCard.
          // If BaseCardContainer is the final card representation, it might define its own children for BaseCard.
        />
      </div>
    );
  }
);

BaseCardContainer.displayName = "BaseCardContainer";
