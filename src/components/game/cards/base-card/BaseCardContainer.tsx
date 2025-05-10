/**
 * src/app/components/game/cards/base-card/BaseCardContainer.tsx
 */

import React from "react";
import BaseCard from "./BaseCard";
import type { BaseCardData } from "./base-card.types";

interface BaseCardContainerProps {
  cardData: BaseCardData; // The fundamental data for the card
  isFlipped: boolean; // The current flip state, likely managed by a parent
  onFlip: () => void; // A generic flip handler
  // Potentially other very generic interactions applicable to ALL cards
  className?: string;
  innerCardClassName?: string;
}

/**
 * BaseCardContainer is a conceptual base container.
 * In a real application, more specific containers (like PriceCard.tsx)
 * would handle richer interactions and data transformations.
 * This base version demonstrates wrapping the BaseCard.
 */
export const BaseCardContainer: React.FC<BaseCardContainerProps> = ({
  cardData,
  isFlipped,
  onFlip,
  className,
  innerCardClassName,
}) => {
  // For a base container, face content might be very generic or derived simply.
  // Specific card types will have much richer face content.
  const faceContent = (
    <div
      className="p-4 pointer-events-auto"
      onClick={onFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? onFlip() : null)}
    >
      <h3 className="font-bold">{cardData.symbol} - Front</h3>
      <p>Type: {cardData.type}</p>
    </div>
  );

  const backContent = (
    <div
      className="p-4 pointer-events-auto"
      onClick={onFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? onFlip() : null)}
    >
      <h3 className="font-bold">{cardData.symbol} - Back</h3>
      <p>{cardData.backData.explanation}</p>
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
};
