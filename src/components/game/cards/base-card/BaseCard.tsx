// src/app/components/game/cards/base-card/BaseCard.tsx
import React from "react";
import { Card as ShadCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // Overlays like delete button
}

const BaseCard: React.FC<BaseCardProps> = ({
  isFlipped,
  faceContent,
  backContent,
  cardContext,
  socialInteractions,
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

  // Conditionally render SocialBar if interactions are provided
  const socialBarElement = socialInteractions ? (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out",
        "opacity-0 group-hover:opacity-100", // Hidden by default, visible on group hover
        "translate-y-4 group-hover:translate-y-0" // Optional: Slide in effect
      )}
    >
      <SocialBar interactions={socialInteractions} cardContext={cardContext} />
    </div>
  ) : null;

  return (
    <div style={outerStyle} className={cn("group", className)}>
      {" "}
      {/* 'group' class is key */}
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
            "shadow-lg"
          )}
        >
          <div className="flex-grow overflow-y-auto p-4">{faceContent}</div>
          {socialBarElement}
        </ShadCard>

        <ShadCard
          style={backFaceSpecificStyles}
          className={cn(
            "card-back-wrapper",
            "overflow-hidden",
            "rounded-2xl",
            "shadow-lg"
          )}
        >
          <div className="flex-grow overflow-y-auto p-4">{backContent}</div>
          {socialBarElement}
        </ShadCard>
      </div>
      {children}
    </div>
  );
};

export default BaseCard;
