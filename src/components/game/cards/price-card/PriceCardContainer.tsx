// src/components/game/cards/price-card/PriceCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
} from "../base-card/base-card.types";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks, // For PriceSpecificInteractions type
} from "./price-card.types";
import { PriceCardContent } from "./PriceCardContent";
// import { cn } from "@/lib/utils"; // Only if needed for specific container styling

// Define which specific interaction callbacks PriceCardContent needs
type PriceSpecificInteractions = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

interface PriceCardContainerProps {
  cardData: PriceCardData;
  isFlipped: boolean;
  onFlip: () => void;

  cardContext: CardActionContext; // Contains symbol, companyName, logoUrl
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;

  // Callback for when the header (company name/symbol) of this PriceCard is clicked
  // This is intended to trigger showing a ProfileCard.
  onHeaderIdentityClick?: (context: CardActionContext) => void; // <<<< THIS PROP WAS MISSING OR MISMATCHED

  // Specific interactions for the content of the PriceCard
  priceSpecificInteractions?: PriceSpecificInteractions;

  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // For overlays, passed to BaseCard
}

export const PriceCardContainer = React.memo<PriceCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    cardContext,
    socialInteractions,
    onDeleteRequest,
    onHeaderIdentityClick, // Now correctly received as a prop
    priceSpecificInteractions,
    className,
    innerCardClassName,
    children,
  }) => {
    const faceContentForBaseCard = (
      <PriceCardContent
        cardData={cardData}
        isBackFace={false}
        onSmaClick={priceSpecificInteractions?.onPriceCardSmaClick}
        onRangeContextClick={
          priceSpecificInteractions?.onPriceCardRangeContextClick
        }
        onOpenPriceClick={priceSpecificInteractions?.onPriceCardOpenPriceClick}
        onGenerateDailyPerformanceSignal={
          priceSpecificInteractions?.onPriceCardGenerateDailyPerformanceSignal
        }
      />
    );

    const backContentForBaseCard = (
      <PriceCardContent
        cardData={cardData}
        isBackFace={true}
        onSmaClick={priceSpecificInteractions?.onPriceCardSmaClick}
        onRangeContextClick={
          priceSpecificInteractions?.onPriceCardRangeContextClick
        }
        onOpenPriceClick={priceSpecificInteractions?.onPriceCardOpenPriceClick}
        // No onGenerateDailyPerformanceSignal for back face
      />
    );

    return (
      <BaseCard
        isFlipped={isFlipped}
        faceContent={faceContentForBaseCard}
        backContent={backContentForBaseCard}
        onFlip={onFlip}
        cardContext={cardContext}
        socialInteractions={socialInteractions}
        onDeleteRequest={onDeleteRequest}
        onHeaderClick={onHeaderIdentityClick} // Pass it to BaseCard as onHeaderClick
        className={className}
        innerCardClassName={innerCardClassName}>
        {children} {/* Overlays */}
      </BaseCard>
    );
  }
);

PriceCardContainer.displayName = "PriceCardContainer";
