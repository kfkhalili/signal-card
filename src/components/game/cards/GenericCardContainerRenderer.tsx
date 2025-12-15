// src/components/game/cards/GenericCardContainerRenderer.tsx
import BaseCard from "./base-card/BaseCard";
import type { ConcreteCardData } from "../types";
import { cn } from "@/lib/utils";
import {
  type RegisteredCardRendererProps,
  type SpecificCardContentComponent,
} from "@/components/game/cardRenderers";

// Define the component's own props by extending the registered props
interface GenericCardContainerRendererProps<
  TCardDataType extends ConcreteCardData
> extends RegisteredCardRendererProps {
  ContentComponent: SpecificCardContentComponent<TCardDataType>;
  expectedCardType: TCardDataType["type"];
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
  children,
  isSelectionMode,
  selectedDataItems,
  onToggleItemSelection,
}: GenericCardContainerRendererProps<TCardDataType>) => {
  if (cardData.type !== expectedCardType) {
    console.error(
      `[GenericCardContainerRenderer] Mismatched card type for card ID ${cardData.id}. Expected ${expectedCardType}, got ${cardData.type}.`
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

  // Ensure all props, including selection props, are passed down.
  const contentProps = {
    cardData: specificCardData,
    onGenericInteraction,
    isSelectionMode,
    selectedDataItems,
    onToggleItemSelection,
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
      {children}
    </BaseCard>
  );
};
