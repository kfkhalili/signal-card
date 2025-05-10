/**
 * src/app/components/game/cards/base-card/BaseCardContainer.tsx
 */
import React from "react";
import BaseCard from "./BaseCard";
import type {
  BaseCardData,
  OnCardInteraction,
  BaseCardContainerDataPointDetails, // For this container's specific interactions
} from "./base-card.types";
import { ClickableDataItem } from "../../../ui/ClickableDataItem"; // Adjusted path
import { cn } from "@/lib/utils"; // Ensure cn is imported if ClickableDataItem uses it internally for its own classes

interface BaseCardContainerProps {
  cardData: BaseCardData;
  isFlipped: boolean;
  onFlip: () => void;
  // New prop for handling clicks on specific data points within this container's example content
  onCardInteraction?: OnCardInteraction<
    BaseCardData,
    BaseCardContainerDataPointDetails
  >;
  className?: string;
  innerCardClassName?: string;
}

/**
 * BaseCardContainer is a conceptual base container.
 * It demonstrates wrapping BaseCard and now, how its own example content
 * can be made interactive using ClickableDataItem.
 */
export const BaseCardContainer = React.memo<BaseCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    onCardInteraction, // New prop
    className,
    innerCardClassName,
  }) => {
    const handleLocalInteraction = (
      event:
        | React.MouseEvent<HTMLDivElement>
        | React.KeyboardEvent<HTMLDivElement>,
      elementType: string,
      value: any,
      details: BaseCardContainerDataPointDetails
    ) => {
      event.stopPropagation(); // Prevent card flip when a data point is clicked
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

    const faceContent = (
      <div
        className="h-full w-full p-4 cursor-pointer" // pointer-events-auto is on ClickableDataItem or this div
        onClick={onFlip} // Main click flips the card
        role="button"
        aria-label={`Flip ${cardData.symbol} card to see details`}
        tabIndex={0}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && !e.defaultPrevented
            ? onFlip()
            : null
        }
      >
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
      </div>
    );

    const backContent = (
      <div
        className="h-full w-full p-4 cursor-pointer"
        onClick={onFlip} // Main click flips the card
        role="button"
        aria-label={`Flip ${cardData.symbol} card to see front`}
        tabIndex={0}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && !e.defaultPrevented
            ? onFlip()
            : null
        }
      >
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
      </div>
    );

    return (
      <BaseCard
        isFlipped={isFlipped}
        faceContent={faceContent}
        backContent={backContent}
        className={className}
        innerCardClassName={innerCardClassName}
      />
    );
  }
);

BaseCardContainer.displayName = "BaseCardContainer";
