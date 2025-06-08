// src/components/ui/DataRow.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";
import { CheckboxCheckedIcon, CheckboxUncheckedIcon } from "./CheckboxIcons";

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
  // NEW PROPS FOR SELECTION
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
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
  // NEW PROPS
  isSelectionMode = false,
  isSelected = false,
  onSelect,
}) => {
  const displayCurrencySymbol =
    currency === "USD" ? "$" : currency || (isMonetary ? "$" : "");

  let valueContent: React.ReactNode;
  let titleDisplayValue: string;

  if (value === null || value === undefined) {
    valueContent = "N/A";
    titleDisplayValue = "N/A";
  } else if (typeof value === "string") {
    valueContent = `${value}${unit}`;
    titleDisplayValue = value;
  } else if (typeof value === "number" && !Number.isNaN(value)) {
    titleDisplayValue = value.toFixed(precision);
    if (isMonetary) {
      valueContent = `${displayCurrencySymbol}${formatNumberWithAbbreviations(
        value,
        precision
      )}`;
    } else if (isValueAsPercentage) {
      valueContent = `${value.toFixed(precision)}%`;
      titleDisplayValue = `${value.toFixed(precision)}%`;
    } else {
      valueContent = `${value.toFixed(precision)}${unit}`;
      titleDisplayValue = `${value.toFixed(precision)}${unit}`;
    }
  } else if (typeof value === "bigint") {
    valueContent = `${value.toString()}${unit}`;
    titleDisplayValue = value.toString();
  } else if (typeof value === "boolean") {
    valueContent = value.toString();
    titleDisplayValue = value.toString();
  } else {
    valueContent = value;
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
    finalTitle = tooltip;
  } else if (
    typeof value === "object" &&
    value !== null &&
    !titleOverride &&
    !tooltip
  ) {
    finalTitle = label;
  }

  const augmentedTitle =
    tooltip && titleOverride
      ? `${titleOverride} (${tooltip})`
      : tooltip && finalTitle !== tooltip
      ? `${finalTitle} (${tooltip})`
      : finalTitle;

  // In selection mode, the primary action is selecting. Otherwise, it's the default onClick.
  const effectiveOnClick = isSelectionMode ? onSelect : onClick;
  const isClickable = isSelectionMode || isInteractiveProp || !!onClick;

  const testId =
    dataTestId ||
    (originatingElement
      ? `${originatingElement}-datarow`
      : `${label.toLowerCase().replace(/\s+/g, "-")}-datarow`);

  return (
    <ClickableDataItem
      isInteractive={isClickable}
      onClickHandler={effectiveOnClick}
      title={augmentedTitle}
      baseClassName={cn(
        "flex justify-between items-center py-0.5 px-1 rounded-md transition-colors",
        className,
        isSelected && "bg-primary/20",
        isSelectionMode &&
          "hover:bg-primary/10 data-[interactive-child=true]:hover:bg-primary/10"
      )}
      data-testid={testId}
      aria-label={augmentedTitle}>
      <div className="flex items-center min-w-0">
        {isSelectionMode && (
          <div className="mr-2 shrink-0">
            {isSelected ? (
              <CheckboxCheckedIcon className="text-primary" />
            ) : (
              <CheckboxUncheckedIcon className="text-muted-foreground" />
            )}
          </div>
        )}
        <span
          className={cn("text-muted-foreground mr-2 truncate", labelClassName)}>
          {label}
        </span>
      </div>
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
