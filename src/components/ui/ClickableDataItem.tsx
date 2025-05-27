// src/components/ui/ClickableDataItem.tsx
import React from "react";
import { cn } from "@/lib/utils";
// No longer needs to know about InteractionPayload or OnGenericInteraction directly
// import type {
//   CardType,
//   OnGenericInteraction,
//   InteractionPayload,
// } from "@/components/game/cards/base-card/base-card.types";

interface ClickableDataItemProps extends React.HTMLAttributes<HTMLDivElement> {
  isInteractive: boolean;
  onClickHandler?: (
    // This is the callback the parent will provide
    event:
      | React.MouseEvent<HTMLDivElement>
      | React.KeyboardEvent<HTMLDivElement>
  ) => void;
  children: React.ReactNode;
  baseClassName?: string;
  interactiveClassName?: string;
  "data-testid"?: string;
  "aria-label"?: string;
  // Removed props related to constructing InteractionPayload:
  // interactionTarget?: "card";
  // targetType?: CardType;
  // sourceCardId?: string;
  // sourceCardSymbol?: string;
  // sourceCardType?: CardType;
  // onGenericInteraction?: OnGenericInteraction;
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
  // Removed destructured props for generic interaction
  ...rest
}) => {
  // The handleInteraction logic is removed. ClickableDataItem now only calls onClickHandler.
  // The parent component (e.g., PriceCardContent) is responsible for calling onGenericInteraction.

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractive && onClickHandler) {
      event.stopPropagation(); // Still good to prevent unintended parent triggers
      onClickHandler(event);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isInteractive && onClickHandler) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault(); // Prevent default spacebar scroll
        event.stopPropagation(); // Prevent unintended parent triggers
        onClickHandler(event);
      }
    }
  };

  const finalInteractiveClasses =
    interactiveClassName ?? DEFAULT_INTERACTIVE_CLASSES;

  return (
    <div
      {...rest}
      className={cn(baseClassName, isInteractive && finalInteractiveClasses)}
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      data-testid={dataTestId}
      aria-label={isInteractive ? ariaLabel : undefined}
      // Ensure aria-disabled is correctly set based on isInteractive
      aria-disabled={!isInteractive ? true : undefined}
      data-interactive-child={isInteractive ? "true" : undefined} // Mark as interactive child if it is
    >
      {children}
    </div>
  );
};
