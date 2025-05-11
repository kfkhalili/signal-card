// src/components/game/cards/base-card/BaseCard.tsx
import React from "react";
import { Card as ShadCard, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import Image from "next/image";
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
  onFlip: () => void;
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
  onFlip,
  className,
  innerCardClassName,
  children,
}) => {
  const { symbol, companyName, logoUrl } = cardContext;

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

  const cardSurfaceStyles: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden", // For Safari
    display: "flex",
    flexDirection: "column",
    cursor: "pointer",
  };

  const backFaceTransformStyle: React.CSSProperties = {
    transform: "rotateY(180deg)",
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Define the header properties for consistent spacing
  const headerClassNames =
    "px-3 sm:px-4 pb-2 pt-6 sm:pt-7 shrink-0 min-h-[56px] sm:min-h-[64px] md:min-h-[72px]";

  const identityHeaderElement = // This is the actual visual header
    (
      <div
        className={cn("flex justify-between items-center", headerClassNames)}>
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
        <div className="text-right min-w-0 max-w-[60%] sm:max-w-[65%]">
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

  const headerPlaceholderElement = // Invisible placeholder for the back card
    <div className={cn("invisible", headerClassNames)} aria-hidden="true" />;

  const socialBarElement = socialInteractions ? (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out z-10 mt-auto shrink-0",
        "opacity-0 group-hover:opacity-100",
        "translate-y-full group-hover:translate-y-0"
      )}
      onClick={(e) => e.stopPropagation()}>
      <SocialBar interactions={socialInteractions} cardContext={cardContext} />
    </div>
  ) : null;

  return (
    <div style={outerStyle} className={cn("group", className)}>
      <div
        style={innerCardStyles}
        className={cn(innerCardClassName)}
        data-testid="base-card-inner">
        {/* Card Face */}
        <ShadCard
          style={cardSurfaceStyles}
          className={cn(
            "card-face-wrapper",
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
          {identityHeaderElement} {/* Actual header on the front */}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:p-5 pt-0">
            {faceContent}
          </div>
          {socialBarElement}
        </ShadCard>

        {/* Card Back */}
        <ShadCard
          style={{ ...cardSurfaceStyles, ...backFaceTransformStyle }}
          className={cn(
            "card-back-wrapper",
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
          {headerPlaceholderElement}
          <div className="flex-grow overflow-y-auto relative p-3 sm:p-4 md:p-5 pt-0">
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
