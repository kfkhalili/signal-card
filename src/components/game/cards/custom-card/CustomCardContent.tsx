// src/components/game/cards/custom-card/CustomCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import { DataRow } from "@/components/ui/DataRow";
import { cn } from "@/lib/utils";
import type { CustomCardData } from "./custom-card.types";
import type { SpecificCardContentComponentProps } from "../../cardRenderers";
import { MoreHorizontal } from "lucide-react";

type CustomCardContentProps = SpecificCardContentComponentProps<CustomCardData>;

// The number of items to show on the front face before spilling to the back.
const FRONT_FACE_ITEM_LIMIT = 6;

export const CustomCardContent: React.FC<CustomCardContentProps> = React.memo(
  ({ cardData, isBackFace }) => {
    const itemsForFront = cardData.items.slice(0, FRONT_FACE_ITEM_LIMIT);
    const itemsForBack = cardData.items.slice(FRONT_FACE_ITEM_LIMIT);

    if (isBackFace) {
      return (
        <div
          data-testid={`custom-card-back-${cardData.id}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent
            className={cn("p-0 flex-grow flex flex-col overflow-y-auto")}>
            {itemsForBack.length > 0 ? (
              <div className="space-y-1.5 p-1">
                {itemsForBack.map((item) => (
                  <DataRow
                    key={item.id}
                    label={item.label}
                    value={item.value}
                    unit={item.unit}
                    isMonetary={item.isMonetary}
                    currency={item.currency}
                    isValueAsPercentage={item.isValueAsPercentage}
                    isInteractive={false}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <p className="text-sm text-muted-foreground p-4">
                  All items are displayed on the front of the card.
                </p>
              </div>
            )}
          </ShadCardContent>
        </div>
      );
    }

    // Front Face implementation
    return (
      <div
        data-testid={`custom-card-front-${cardData.id}`}
        className="pointer-events-auto flex flex-col h-full">
        {cardData.narrative && (
          <p className="text-sm text-muted-foreground leading-snug line-clamp-3 mb-2 px-1">
            {cardData.narrative}
          </p>
        )}
        <ShadCardContent className={cn("p-0 flex-grow flex flex-col")}>
          <div className="space-y-1.5 px-1 pb-1">
            {itemsForFront.map((item) => (
              <DataRow
                key={item.id}
                label={item.label}
                value={item.value}
                unit={item.unit}
                isMonetary={item.isMonetary}
                currency={item.currency}
                isValueAsPercentage={item.isValueAsPercentage}
                isInteractive={false}
              />
            ))}
          </div>
        </ShadCardContent>

        {/* Add a visual indicator that there are more items on the back */}
        {itemsForBack.length > 0 && (
          <div className="flex-shrink-0 mt-auto text-center p-2 border-t">
            <p className="text-xs text-muted-foreground flex items-center justify-center">
              <MoreHorizontal className="w-4 h-4 mr-1.5" />
              {itemsForBack.length} more item(s) on back
            </p>
          </div>
        )}
      </div>
    );
  }
);

CustomCardContent.displayName = "CustomCardContent";
