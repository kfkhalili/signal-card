/**
 * src/app/components/ui/ClickableDataItem.tsx (Assumed Location)
 */
import React from "react";
import { cn } from "../../lib/utils";

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
}

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
      onClickHandler(event);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      isInteractive &&
      onClickHandler &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      onClickHandler(event);
    }
  };

  return (
    <div
      {...rest}
      className={cn(baseClassName, isInteractive && interactiveClassName)}
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      data-testid={dataTestId}
      aria-label={isInteractive ? ariaLabel : undefined}>
      {children}
    </div>
  );
};
