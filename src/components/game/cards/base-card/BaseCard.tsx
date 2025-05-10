/**
 * src/app/components/game/cards/base-card/BaseCard.tsx
 */
import React from "react";
import { Card as ShadCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BaseCardProps {
  isFlipped: boolean;
  faceContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode;
}

const BaseCard: React.FC<BaseCardProps> = ({
  isFlipped,
  faceContent,
  backContent,
  className,
  innerCardClassName,
  children,
}) => {
  const outerStyle: React.CSSProperties = {
    perspective: "1000px",
    position: "relative", // For absolute positioning of children (overlays)
  };

  const innerCardStyles: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    transition: "transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)",
    transformStyle: "preserve-3d",
    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
  };

  const faceAndBackSharedStyles: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden", // CRITICAL FOR FLIP
    WebkitBackfaceVisibility: "hidden", // For Safari CRITICAL FOR FLIP
  };

  const backFaceSpecificStyles: React.CSSProperties = {
    ...faceAndBackSharedStyles,
    transform: "rotateY(180deg)", // Pre-rotate the back CRITICAL FOR FLIP
  };

  return (
    <div style={outerStyle} className={cn("group", className)}>
      <div
        style={innerCardStyles}
        className={cn(innerCardClassName)}
        data-testid="base-card-inner"
      >
        {/* ShadCard now receives the styles that include backfaceVisibility */}
        <ShadCard
          style={faceAndBackSharedStyles}
          className={cn("card-face-wrapper", "overflow-hidden")}
        >
          {faceContent}
        </ShadCard>
        <ShadCard
          style={backFaceSpecificStyles}
          className={cn("card-back-wrapper", "overflow-hidden")}
        >
          {backContent}
        </ShadCard>
      </div>
      {children}
    </div>
  );
};

export default BaseCard;
