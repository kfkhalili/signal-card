// src/components/ui/ClickableDataItem.tsx
import React from "react";
import { cn } from "@/lib/utils";

interface ClickableDataItemProps extends React.HTMLAttributes<HTMLDivElement> {
  isInteractive: boolean;
  onClickHandler?: (
    event:
      | React.MouseEvent<HTMLDivElement>
      | React.KeyboardEvent<HTMLDivElement>
  ) => void;
  children: React.ReactNode;
  baseClassName?: string;
  /**
   * Classes to apply when the item is interactive.
   * If not provided, default interactive classes (cursor, hover color) will be applied.
   * If provided, these will be used INSTEAD of the defaults for interaction.
   */
  interactiveClassName?: string;
  /**
   * Additional classes to apply specifically for the hover effect when interactive.
   * These will be ADDED to the default or provided interactiveClassName.
   * If you want to completely override default hover, use interactiveClassName.
   * If you just want to ADD to default hover, use this.
   * For most cases, relying on the default or setting interactiveClassName is enough.
   * Adding a specific prop for ONLY hover could be too granular, let's keep it simple first.
   *
   * Let's simplify: interactiveClassName will define ALL interactive state classes.
   * We'll provide a sensible default for interactiveClassName if it's not given.
   */
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
  interactiveClassName, // This prop will now override the default if provided
  "data-testid": dataTestId,
  "aria-label": ariaLabel,
  ...rest
}) => {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractive && onClickHandler) {
      onClickHandler(event);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      isInteractive &&
      onClickHandler &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault(); // Prevent default spacebar scroll, etc.
      onClickHandler(event);
    }
  };

  const finalInteractiveClasses =
    interactiveClassName ?? DEFAULT_INTERACTIVE_CLASSES;

  return (
    <div
      {...rest}
      className={cn(
        baseClassName,
        isInteractive && finalInteractiveClasses // Apply default or custom interactive classes
      )}
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined} // Make it focusable if interactive
      data-testid={dataTestId}
      aria-label={isInteractive ? ariaLabel : undefined} // Only apply aria-label if interactive and label is provided
      aria-disabled={isInteractive ? undefined : true} // Mark as disabled for ARIA if not interactive
    >
      {children}
    </div>
  );
};
