// src/components/game/cards/GenericCardContainerRenderer.tsx
import React from "react";
import BaseCard from "./base-card/BaseCard";
import type { DisplayableCard, ConcreteCardData } from "../types";
import type {
  OnGenericInteraction,
  CardActionContext,
} from "./base-card/base-card.types";
import { cn } from "@/lib/utils";

// Props for the specific content component (e.g., PriceCardContent)
interface SpecificCardContentComponentProps<
  TCardDataType extends ConcreteCardData
> {
  cardData: TCardDataType;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
}

// Type for the ContentComponent itself
type SpecificCardContentComponent<TCardDataType extends ConcreteCardData> =
  React.ComponentType<SpecificCardContentComponentProps<TCardDataType>>;

// Props for the GenericCardContainerRenderer
interface GenericCardContainerRendererProps<
  TCardDataType extends ConcreteCardData
> {
  cardData: DisplayableCard;
  isFlipped: boolean;
  onFlip: () => void;
  cardContext: CardActionContext;
  onDeleteRequest: (context: CardActionContext) => void;
  className?: string;
  innerCardClassName?: string;
  onGenericInteraction: OnGenericInteraction;
  ContentComponent: SpecificCardContentComponent<TCardDataType>;
  expectedCardType: TCardDataType["type"];
  children?: React.ReactNode; // <<< ADDED children prop here
}

export const GenericCardContainerRenderer = <
  TCardDataType extends ConcreteCardData
>({
  cardData,
  isFlipped,
  onFlip,
  cardContext,
  onDeleteRequest,
  className,
  innerCardClassName,
  onGenericInteraction,
  ContentComponent,
  expectedCardType,
  children, // <<< DESTRUCTURE children prop here
}: GenericCardContainerRendererProps<TCardDataType>) => {
  if (cardData.type !== expectedCardType) {
    console.error(
      `[GenericCardContainerRenderer] Mismatched card type for card ID ${cardData.id}. Expected ${expectedCardType}, got ${cardData.type}. This may indicate a problem in the card registry or data.`
    );
    return (
      <div
        className={cn(
          className,
          "p-4 border border-dashed rounded-lg flex items-center justify-center text-destructive bg-destructive/10"
        )}>
        <p className="text-center text-xs">
          Error: Card type mismatch. Expected {expectedCardType}, got{" "}
          {cardData.type}.
        </p>
      </div>
    );
  }

  const specificCardData = cardData as unknown as TCardDataType;

  const contentProps = {
    cardData: specificCardData,
    onGenericInteraction,
  };

  const faceContentForBaseCard = (
    <ContentComponent {...contentProps} isBackFace={false} />
  );
  const backContentForBaseCard = (
    <ContentComponent {...contentProps} isBackFace={true} />
  );

  return (
    <BaseCard
      isFlipped={isFlipped}
      faceContent={faceContentForBaseCard}
      backContent={backContentForBaseCard}
      onFlip={onFlip}
      cardContext={cardContext}
      onDeleteRequest={onDeleteRequest}
      className={className}
      innerCardClassName={innerCardClassName}
      onGenericInteraction={onGenericInteraction}>
      {children} {/* <<< PASS children to BaseCard here */}
    </BaseCard>
  );
};
