// src/components/game/storybook/CardStoryWrapper.tsx
import React, { useState, useCallback, useEffect } from "react";
import { action } from "storybook/actions";
import type {
  CardActionContext,
  OnGenericInteraction,
} from "@/components/game/cards/base-card/base-card.types";
import type {
  DisplayableCard,
  ConcreteCardData,
} from "@/components/game/types";
import { GenericCardContainerRenderer } from "@/components/game/cards/GenericCardContainerRenderer";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

// Props for the specific content component (e.g., PriceCardContent)
interface SpecificCardContentComponentProps<
  TCardDataType extends ConcreteCardData
> {
  cardData: TCardDataType;
  isBackFace: boolean;
  onGenericInteraction: OnGenericInteraction;
  isSelectionMode: boolean;
  selectedDataItems: SelectedDataItem[];
  onToggleItemSelection: (item: SelectedDataItem) => void;
}

// Type for the ContentComponent itself
type SpecificCardContentComponent<TCardDataType extends ConcreteCardData> =
  React.ComponentType<SpecificCardContentComponentProps<TCardDataType>>;

export interface CardStoryWrapperProps<TCardData extends ConcreteCardData> {
  initialCardData: TCardData & { isFlipped: boolean };
  ContentComponent: SpecificCardContentComponent<TCardData>;
  expectedCardType: TCardData["type"];
  cardContext: CardActionContext;
  onGenericInteraction: OnGenericInteraction;
  onDeleteRequest: (context: CardActionContext) => void;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode;
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
    initialCardData as DisplayableCard
  );

  // NEW: State to manage selection mode within Storybook
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDataItems, setSelectedDataItems] = useState<
    SelectedDataItem[]
  >([]);

  useEffect(() => {
    setCurrentCardData(initialCardData as DisplayableCard);
  }, [initialCardData]);

  const handleFlip = useCallback(() => {
    setCurrentCardData((prevCard) => {
      action("onFlip (handled by CardStoryWrapper)")(prevCard.id);
      return { ...prevCard, isFlipped: !prevCard.isFlipped };
    });
  }, []);

  // NEW: Mock handler for item selection
  const handleToggleItemSelection = useCallback((item: SelectedDataItem) => {
    action("onToggleItemSelection")(item);
    setSelectedDataItems((prev) => {
      const isSelected = prev.some((p) => p.id === item.id);
      if (isSelected) {
        return prev.filter((p) => p.id !== item.id);
      }
      return [...prev, item];
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
    <div className="flex flex-col items-center gap-4">
      <GenericCardContainerRenderer
        cardData={currentCardData}
        isFlipped={currentCardData.isFlipped}
        onFlip={handleFlip}
        cardContext={propCardContext}
        onDeleteRequest={onDeleteRequest}
        onGenericInteraction={onGenericInteraction}
        className={className}
        innerCardClassName={innerCardClassName}
        ContentComponent={ContentComponent}
        expectedCardType={expectedCardType}
        // Pass down the new props
        isSelectionMode={isSelectionMode}
        selectedDataItems={selectedDataItems}
        onToggleItemSelection={handleToggleItemSelection}>
        {children}
      </GenericCardContainerRenderer>
      <div className="p-4 border-t w-full mt-4 text-center">
        <Button
          variant={isSelectionMode ? "destructive" : "outline"}
          onClick={() => setIsSelectionMode((prev) => !prev)}>
          <Edit className="mr-2 h-4 w-4" />
          {isSelectionMode ? "Exit Selection Mode" : "Enter Selection Mode"}
        </Button>
        <div className="text-xs text-muted-foreground mt-2">
          {selectedDataItems.length > 0
            ? `Selected: ${selectedDataItems.map((i) => i.label).join(", ")}`
            : "No items selected."}
        </div>
      </div>
    </div>
  );
};
