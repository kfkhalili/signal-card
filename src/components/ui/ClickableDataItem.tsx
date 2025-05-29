// src/components/ui/ClickableDataItem.tsx
import React from "react";
import { cn } from "@/lib/utils";

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
  ...rest
}) => {
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
      data-interactive-child={isInteractive ? "true" : undefined}>
      {children}
    </div>
  );
};
