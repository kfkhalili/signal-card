// src/components/game/storybook/CardStoryWrapper.tsx
import React, { useState, useCallback, useEffect } from "react";
import { action } from "@storybook/addon-actions";
import type {
  CardActionContext,
  OnGenericInteraction,
} from "@/components/game/cards/base-card/base-card.types";
import type {
  DisplayableCard,
  ConcreteCardData,
} from "@/components/game/types";
import { GenericCardContainerRenderer } from "@/components/game/cards/GenericCardContainerRenderer"; // Adjust path if needed

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

export interface CardStoryWrapperProps<TCardData extends ConcreteCardData> {
  initialCardData: TCardData & { isFlipped: boolean }; // Full initial card data including its specific type and flip state
  ContentComponent: SpecificCardContentComponent<TCardData>;
  expectedCardType: TCardData["type"];
  cardContext: CardActionContext;
  onGenericInteraction: OnGenericInteraction;
  onDeleteRequest: (context: CardActionContext) => void;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // For BaseCard children, if any
}

export const CardStoryWrapper = <TCardData extends ConcreteCardData>({
  initialCardData,
  ContentComponent,
  expectedCardType,
  cardContext: propCardContext,
  onGenericInteraction,
  onDeleteRequest,
  className,
  innerCardClassName,
  children,
}: CardStoryWrapperProps<TCardData>) => {
  const [currentCardData, setCurrentCardData] = useState<DisplayableCard>(
    initialCardData as DisplayableCard // Cast here as DisplayableCard is the union type
  );

  useEffect(() => {
    // Update currentCardData if initialCardData changes from Storybook controls
    setCurrentCardData(initialCardData as DisplayableCard);
  }, [initialCardData]);

  const handleFlip = useCallback(() => {
    setCurrentCardData((prevCard) => {
      action("onFlip (handled by CardStoryWrapper)")(prevCard.id);
      return { ...prevCard, isFlipped: !prevCard.isFlipped };
    });
  }, []);

  if (!propCardContext || !onGenericInteraction || !onDeleteRequest) {
    return (
      <div style={{ color: "red", border: "1px solid red", padding: "10px" }}>
        Error: Story args (context, interactions) incomplete in
        CardStoryWrapper.
      </div>
    );
  }

  return (
    <GenericCardContainerRenderer
      cardData={currentCardData} // This is DisplayableCard
      isFlipped={currentCardData.isFlipped}
      onFlip={handleFlip}
      cardContext={propCardContext}
      onDeleteRequest={onDeleteRequest}
      onGenericInteraction={onGenericInteraction}
      className={className}
      innerCardClassName={innerCardClassName}
      ContentComponent={ContentComponent}
      expectedCardType={expectedCardType}>
      {children}
    </GenericCardContainerRenderer>
  );
};
