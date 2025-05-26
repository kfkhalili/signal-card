// src/components/ui/ClickableDataItem.tsx
import React from "react";
import { cn } from "@/lib/utils";
import type {
  CardType,
  OnGenericInteraction,
  InteractionPayload,
} from "@/components/game/cards/base-card/base-card.types";

interface ClickableDataItemProps extends React.HTMLAttributes<HTMLDivElement> {
  isInteractive: boolean;
  onClickHandler?: (
    event:
      | React.MouseEvent<HTMLDivElement>
      | React.KeyboardEvent<HTMLDivElement>
  ) => void;
  children: React.ReactNode;
  baseClassName?: string;
  interactiveClassName?: string;
  "data-testid"?: string;
  "aria-label"?: string;

  // Props for the refactored interaction system
  interactionTarget?: "card";
  targetType?: CardType;
  sourceCardId?: string;
  sourceCardSymbol?: string;
  sourceCardType?: CardType;
  onGenericInteraction?: OnGenericInteraction;
}

const DEFAULT_INTERACTIVE_CLASSES =
  "cursor-pointer hover:text-primary transition-colors";

export const ClickableDataItem: React.FC<ClickableDataItemProps> = ({
  isInteractive,
  onClickHandler,
  children,
  baseClassName,
  interactiveClassName,
  "data-testid": dataTestId,
  "aria-label": ariaLabel,
  interactionTarget,
  targetType,
  sourceCardId,
  sourceCardSymbol,
  sourceCardType,
  onGenericInteraction,
  ...rest
}) => {
  const handleInteraction = (
    event:
      | React.MouseEvent<HTMLDivElement>
      | React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (
      isInteractive &&
      onGenericInteraction &&
      interactionTarget &&
      targetType &&
      sourceCardId &&
      sourceCardSymbol &&
      sourceCardType
    ) {
      event.stopPropagation();

      const payload: InteractionPayload = {
        sourceCardId,
        sourceCardSymbol,
        sourceCardType,
        interactionTarget,
        targetType,
      };
      onGenericInteraction(payload);
    } else if (isInteractive && onClickHandler) {
      onClickHandler(event);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    handleInteraction(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.preventDefault(); // Prevent default spacebar scroll for button-like divs
    handleInteraction(event);
  };

  const finalInteractiveClasses =
    interactiveClassName ?? DEFAULT_INTERACTIVE_CLASSES;

  return (
    <div
      {...rest} // Now 'rest' only contains valid HTML attributes for a div
      className={cn(baseClassName, isInteractive && finalInteractiveClasses)}
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      data-testid={dataTestId} // data-* attributes are fine
      aria-label={isInteractive ? ariaLabel : undefined} // aria-* attributes are fine
      aria-disabled={isInteractive ? undefined : true}>
      {children}
    </div>
  );
};
