// src/components/ui/DataRow.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";

interface DataRowProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  currency?: string | null;
  isMonetary?: boolean;
  isValueAsPercentage?: boolean;
  precision?: number;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  title?: string;
  tooltip?: string; // Can be used to augment the auto-generated title
  onClick?: (
    event:
      | React.MouseEvent<HTMLDivElement>
      | React.KeyboardEvent<HTMLDivElement>
  ) => void;
  isInteractive?: boolean; // If not provided, will be inferred from onClick
  "data-testid"?: string;
  originatingElement?: string; // For analytics or specific test IDs
}

export const DataRow: React.FC<DataRowProps> = ({
  label,
  value,
  unit = "",
  currency,
  isMonetary = false,
  isValueAsPercentage = false,
  precision = 2,
  className,
  labelClassName,
  valueClassName,
  title: titleOverride,
  tooltip,
  onClick,
  isInteractive: isInteractiveProp,
  "data-testid": dataTestId,
  originatingElement,
}) => {
  const displayCurrencySymbol =
    currency === "USD" ? "$" : currency || (isMonetary ? "$" : "");

  let formattedValue: string;
  if (value === null || value === undefined || Number.isNaN(value)) {
    formattedValue = "N/A";
  } else if (typeof value === "number") {
    if (isMonetary) {
      formattedValue = `${displayCurrencySymbol}${formatNumberWithAbbreviations(
        value,
        precision
      )}`;
    } else if (isValueAsPercentage) {
      formattedValue = `${value.toFixed(precision)}%`;
    } else {
      formattedValue = `${value.toFixed(precision)}${unit}`;
    }
  } else {
    formattedValue = `${value}${unit}`;
  }

  const autoTitle = `${label}: ${formattedValue}`;
  const finalTitle = titleOverride ?? autoTitle;
  const augmentedTitle = tooltip ? `${finalTitle} (${tooltip})` : finalTitle;

  const isClickable = isInteractiveProp ?? !!onClick;
  const testId =
    dataTestId ||
    (originatingElement
      ? `${originatingElement}-datarow`
      : `${label.toLowerCase().replace(/\s+/g, "-")}-datarow`);

  return (
    <ClickableDataItem
      isInteractive={isClickable}
      onClickHandler={onClick}
      title={augmentedTitle}
      baseClassName={cn(
        "flex justify-between items-baseline py-0.5",
        className
      )}
      data-testid={testId}
      aria-label={augmentedTitle}>
      <span className={cn("text-muted-foreground mr-2", labelClassName)}>
        {label}
      </span>
      <span
        className={cn(
          "font-semibold text-foreground text-right",
          valueClassName
        )}>
        {formattedValue}
      </span>
    </ClickableDataItem>
  );
};
