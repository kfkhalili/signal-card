// src/components/ui/DataRow.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";

interface DataRowProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  currency?: string | null;
  isMonetary?: boolean;
  isValueAsPercentage?: boolean;
  precision?: number;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  title?: string;
  tooltip?: string;
  onClick?: (
    event:
      | React.MouseEvent<HTMLDivElement>
      | React.KeyboardEvent<HTMLDivElement>
  ) => void;
  isInteractive?: boolean;
  "data-testid"?: string;
  originatingElement?: string;
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

  let valueContent: React.ReactNode;
  let titleDisplayValue: string; // This will be a string representation for the title

  if (value === null || value === undefined) {
    valueContent = "N/A";
    titleDisplayValue = "N/A";
  } else if (typeof value === "string") {
    valueContent = `${value}${unit}`;
    titleDisplayValue = value;
  } else if (typeof value === "number" && !Number.isNaN(value)) {
    titleDisplayValue = value.toFixed(precision); // For title, use precise number before abbreviation
    if (isMonetary) {
      valueContent = `${displayCurrencySymbol}${formatNumberWithAbbreviations(
        value,
        precision
      )}`;
      // titleDisplayValue already set, or could be prefixed with currency symbol if desired for title
    } else if (isValueAsPercentage) {
      valueContent = `${value.toFixed(precision)}%`;
      titleDisplayValue = `${value.toFixed(precision)}%`; // Add % for title too
    } else {
      valueContent = `${value.toFixed(precision)}${unit}`;
      titleDisplayValue = `${value.toFixed(precision)}${unit}`; // Add unit for title
    }
  } else if (typeof value === "bigint") {
    valueContent = `${value.toString()}${unit}`;
    titleDisplayValue = value.toString();
  } else if (typeof value === "boolean") {
    valueContent = value.toString();
    titleDisplayValue = value.toString();
  } else {
    // Value is a React element (or fragment, etc.)
    valueContent = value;
    // For complex ReactNode values, a generic placeholder for auto-title.
    // The `titleOverride` or `tooltip` prop becomes more important here.
    titleDisplayValue = "[View Content]";
  }

  const autoTitle = `${label}: ${titleDisplayValue}`;

  let finalTitle = titleOverride ?? autoTitle;
  if (
    typeof value === "object" &&
    value !== null &&
    !titleOverride &&
    tooltip
  ) {
    // If value is ReactNode and no specific title override, use tooltip if available
    finalTitle = tooltip;
  } else if (
    typeof value === "object" &&
    value !== null &&
    !titleOverride &&
    !tooltip
  ) {
    // If ReactNode and no override or tooltip, just use the label for title
    finalTitle = label;
  }

  const augmentedTitle =
    tooltip && titleOverride
      ? `${titleOverride} (${tooltip})`
      : tooltip && finalTitle !== tooltip // only add tooltip if it's different from finalTitle already
      ? `${finalTitle} (${tooltip})`
      : finalTitle;

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
      title={augmentedTitle} // augmentedTitle is now a string
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
        {valueContent}
      </span>
    </ClickableDataItem>
  );
};
