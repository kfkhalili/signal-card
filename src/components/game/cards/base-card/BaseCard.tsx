// src/app/components/game/cards/base-card/BaseCard.tsx
import React from "react";
import { Card as ShadCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react"; // Using XIcon for delete
import type {
  CardActionContext,
  BaseCardSocialInteractions,
} from "./base-card.types";
import { SocialBar } from "@/components/ui/social-bar";

interface BaseCardProps {
  isFlipped: boolean;
  faceContent: React.ReactNode;
  backContent: React.ReactNode;
  cardContext: CardActionContext;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode;
}

const BaseCard: React.FC<BaseCardProps> = ({
  isFlipped,
  faceContent,
  backContent,
  cardContext,
  socialInteractions,
  onDeleteRequest,
  className,
  innerCardClassName,
  children,
}) => {
  const outerStyle: React.CSSProperties = {
    perspective: "1000px",
    position: "relative",
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
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  const backFaceSpecificStyles: React.CSSProperties = {
    ...faceAndBackSharedStyles,
    transform: "rotateY(180deg)",
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteRequest?.(cardContext);
  };

  const deleteButton = onDeleteRequest ? (
    <button
      onClick={handleDeleteClick}
      title="Delete Card"
      aria-label={`Delete ${cardContext.symbol} card`}
      className={cn(
        "absolute top-1.5 right-1.5 z-20 p-1.5 flex items-center justify-center transition-colors",
        "text-muted-foreground/70 hover:text-primary rounded-sm", // Removed hover:bg-muted/50
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      )}
    >
      <XIcon size={16} strokeWidth={2.5} />
    </button>
  ) : null;

  const socialBarElement = socialInteractions ? (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out",
        "opacity-0 group-hover:opacity-100",
        "translate-y-4 group-hover:translate-y-0"
      )}
    >
      <SocialBar interactions={socialInteractions} cardContext={cardContext} />
    </div>
  ) : null;

  return (
    <div style={outerStyle} className={cn("group", className)}>
      <div
        style={innerCardStyles}
        className={cn(innerCardClassName)}
        data-testid="base-card-inner"
      >
        <ShadCard
          style={faceAndBackSharedStyles}
          className={cn(
            "card-face-wrapper",
            "overflow-hidden",
            "rounded-2xl",
            "shadow-lg",
            "relative"
          )}
        >
          {deleteButton}
          <div className="flex-grow overflow-y-auto p-4 pt-7">
            {faceContent}
          </div>
          {socialBarElement}
        </ShadCard>

        <ShadCard
          style={backFaceSpecificStyles}
          className={cn(
            "card-back-wrapper",
            "overflow-hidden",
            "rounded-2xl",
            "shadow-lg",
            "relative"
          )}
        >
          {deleteButton}
          <div className="flex-grow overflow-y-auto p-4 pt-7">
            {backContent}
          </div>
          {socialBarElement}
        </ShadCard>
      </div>
      {children}
    </div>
  );
};

export default BaseCard;
