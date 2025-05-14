// src/components/game/ui/RarityDisplay.tsx
import React from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { RARITY_LEVELS } from "@/components/game/rarityCalculator"; // Import from central location
import { cn } from "@/lib/utils";

interface RarityDisplayProps {
  rarity?: string | null;
  reason?: string | null;
  showReason?: boolean; // Prop to control reason visibility
  className?: string; // For the container div
  badgeClassName?: string; // For the badge itself
  reasonClassName?: string; // For the reason text
}

/**
 * Determines the visual variant for the rarity badge based on the rarity level.
 * @param rarity The rarity level string (e.g., "Legendary", "Epic").
 * @returns The BadgeProps["variant"] to be used.
 */
function getRarityBadgeVariant(rarity?: string | null): BadgeProps["variant"] {
  switch (rarity) {
    case RARITY_LEVELS.LEGENDARY:
      return "destructive"; // e.g., Red
    case RARITY_LEVELS.EPIC:
      return "secondary"; // e.g., Default secondary (often grayish or a muted color)
    case RARITY_LEVELS.RARE:
      return "default"; // e.g., Primary color (often blue)
    case RARITY_LEVELS.UNCOMMON:
      return "outline"; // Simple outline
    default:
      return "outline"; // For "Common" (though it won't be rendered by this component) or null/undefined
  }
}

/**
 * A reusable component to display a card's rarity level and optionally its reason.
 * It does not render if the rarity is "Common" or not provided.
 */
export const RarityDisplay: React.FC<RarityDisplayProps> = ({
  rarity,
  reason,
  showReason = true, // Default to showing the reason if available
  className,
  badgeClassName,
  reasonClassName,
}) => {
  // Do not display anything if rarity is "Common" or not set.
  if (!rarity || rarity === RARITY_LEVELS.COMMON) {
    return null;
  }

  return (
    <div className={cn("text-center", className)}>
      {/* Default text-center, can be overridden by className */}
      <Badge
        variant={getRarityBadgeVariant(rarity)}
        className={cn("text-xs shadow-md", badgeClassName)} // Base badge styles + custom
        data-rarity={rarity} // Data attribute for potential custom CSS styling
      >
        {rarity}
      </Badge>
      {showReason &&
        reason && ( // Only show reason if showReason is true AND reason exists
          <p
            className={cn(
              "text-xs text-muted-foreground mt-0.5 px-1 leading-tight",
              reasonClassName
            )}>
            {reason}
          </p>
        )}
    </div>
  );
};
