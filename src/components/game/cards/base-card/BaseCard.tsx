// src/components/game/cards/base-card/BaseCard.tsx
import React from "react";
import { Card as ShadCard, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import Image from "next/image";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
  // CardType, // CardType is not directly used in this file's props/logic after recent changes
} from "./base-card.types";
import { SocialBar } from "@/components/ui/social-bar";

interface BaseCardProps {
  isFlipped: boolean;
  faceContent: React.ReactNode;
  backContent: React.ReactNode;
  cardContext: CardActionContext; // Contains symbol, companyName, logoUrl etc.
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;
  onFlip: () => void;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // For overlays, rendered outside the flipping mechanism
}

const BaseCard: React.FC<BaseCardProps> = ({
  isFlipped,
  faceContent,
  backContent,
  cardContext,
  socialInteractions,
  onDeleteRequest,
  onFlip,
  className,
  innerCardClassName,
  children,
}) => {
  const { symbol, companyName, logoUrl } = cardContext;

  const outerStyle: React.CSSProperties = {
    perspective: "1000px",
    position: "relative", // Needed for children (overlays) to be positioned relative to this
  };

  const innerCardStyles: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    transition: "transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)",
    transformStyle: "preserve-3d",
    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
  };

  const cardSurfaceStyles: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden", // For Safari
    display: "flex", // Use flex to manage layout of header, content, social bar
    flexDirection: "column", // Stack them vertically
    cursor: "pointer", // Make the whole surface flippable
  };

  const backFaceTransformStyle: React.CSSProperties = {
    transform: "rotateY(180deg)",
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip when clicking delete
    onDeleteRequest?.(cardContext);
  };

  const deleteButtonElement = onDeleteRequest ? (
    <button
      onClick={handleDeleteClick}
      title="Delete Card"
      aria-label={`Delete ${symbol} card`}
      className={cn(
        "absolute top-0.5 right-0.5 z-30 p-0.5 flex items-center justify-center transition-colors",
        "text-muted-foreground/70 hover:text-primary rounded-sm",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out"
      )}>
      <XIcon size={14} strokeWidth={2.5} />
    </button>
  ) : null;

  const universalHeaderElement = (
    <div className="flex justify-between items-center px-3 sm:px-4 pb-2 pt-6 sm:pt-7 shrink-0 min-h-[56px] sm:min-h-[64px] md:min-h-[72px]">
      {/* Logo Section */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 mr-2 sm:mr-3">
        {logoUrl && (
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 relative">
            <Image
              src={logoUrl}
              alt={`${companyName || symbol} logo`}
              fill
              sizes="(max-width: 640px) 28px, (max-width: 768px) 32px, 40px"
              className={cn("object-contain rounded", "drop-shadow-sm")}
              unoptimized={!logoUrl.startsWith("/")}
            />
          </div>
        )}
      </div>

      {/* Text Section (Name + Symbol) */}
      <div className="text-right min-w-0 max-w-[50%] sm:max-w-[55%]">
        <CardTitle
          className="text-sm sm:text-base md:text-lg font-semibold leading-tight whitespace-normal break-words"
          title={companyName || symbol}>
          {companyName || symbol}
        </CardTitle>
        {companyName && (
          <p
            className="text-xs sm:text-sm text-muted-foreground truncate"
            title={symbol}>
            ({symbol})
          </p>
        )}
        {!companyName && (
          <p className="text-xs sm:text-sm text-muted-foreground">Quote</p>
        )}
      </div>
    </div>
  );

  const socialBarElement = socialInteractions ? (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out z-10 mt-auto shrink-0", // mt-auto pushes to bottom if space, shrink-0 prevents it from shrinking
        "opacity-0 group-hover:opacity-100",
        "translate-y-full group-hover:translate-y-0" // Initial hide then slide up
      )}
      onClick={(e) => e.stopPropagation()} // Prevent clicks on the bar itself from flipping the card
    >
      <SocialBar interactions={socialInteractions} cardContext={cardContext} />
    </div>
  ) : null;

  return (
    <div style={outerStyle} className={cn("group", className)}>
      {/* Outer container for perspective and overlays */}
      <div
        style={innerCardStyles}
        className={cn(innerCardClassName)} // Applied to the div that actually rotates
        data-testid="base-card-inner">
        {/* Card Face */}
        <ShadCard
          style={cardSurfaceStyles} // Base styles for a card surface
          className={cn(
            "card-face-wrapper", // For specific face styling if needed
            "overflow-hidden", // Clip content like social bar animation
            "rounded-2xl", // Consistent rounding
            "shadow-lg" // Consistent shadow
          )}
          onClick={onFlip}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            e.key === "Enter" || e.key === " " ? onFlip() : undefined
          }
          aria-label={
            isFlipped ? `Show ${symbol} front` : `Show ${symbol} back details`
          }>
          {deleteButtonElement}
          {universalHeaderElement}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:p-5 pt-0">
            {/* Main content area */}
            {faceContent}
          </div>
          {socialBarElement}
        </ShadCard>

        {/* Card Back */}
        <ShadCard
          style={{ ...cardSurfaceStyles, ...backFaceTransformStyle }} // Base styles + backface transform
          className={cn(
            "card-back-wrapper", // For specific back styling if needed
            "overflow-hidden",
            "rounded-2xl",
            "shadow-lg"
          )}
          onClick={onFlip}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            e.key === "Enter" || e.key === " " ? onFlip() : undefined
          }
          aria-label={
            isFlipped ? `Show ${symbol} front` : `Show ${symbol} back details`
          }>
          {deleteButtonElement}
          {/* Assuming delete button is also on the back */}
          {universalHeaderElement} {/* Header is also on the back */}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:p-5 pt-0">
            {/* Main content area */}
            {backContent}
          </div>
          {socialBarElement} {/* Assuming social bar is also on the back */}
        </ShadCard>
      </div>
      {children}
    </div>
  );
};

export default BaseCard;
