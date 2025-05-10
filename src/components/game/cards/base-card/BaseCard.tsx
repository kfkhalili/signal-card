// src/app/components/game/cards/base-card/BaseCard.tsx
import React from "react";
import { Card as ShadCard, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import Image from "next/image";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
  CardType,
} from "./base-card.types";
import { SocialBar } from "@/components/ui/social-bar";

interface BaseCardProps {
  isFlipped: boolean;
  faceContent: React.ReactNode; // Content for the face (e.g., PriceCardContent)
  backContent: React.ReactNode; // Content for the back (e.g., PriceCardContent)
  cardContext: CardActionContext;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;
  onFlip: () => void; // BaseCard now receives onFlip directly

  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // For top-level overlays, if any, independent of flip
}

const BaseCard: React.FC<BaseCardProps> = ({
  isFlipped,
  faceContent,
  backContent,
  cardContext,
  socialInteractions,
  onDeleteRequest,
  onFlip, // New: BaseCard handles its own flip click
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
    WebkitBackfaceVisibility: "hidden",
    display: "flex",
    flexDirection: "column",
    cursor: "pointer", // Indicate the whole surface is clickable for flip
  };

  const backFaceTransformStyle: React.CSSProperties = {
    transform: "rotateY(180deg)",
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip when delete is clicked
    onDeleteRequest?.(cardContext);
  };

  const deleteButtonElement = onDeleteRequest ? (
    <button
      onClick={handleDeleteClick}
      title="Delete Card"
      aria-label={`Delete ${symbol} card`}
      className={cn(
        "absolute top-1 right-1 z-30 p-1 flex items-center justify-center",
        "text-muted-foreground/70 hover:text-primary rounded-sm",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out"
      )}
    >
      <XIcon size={14} strokeWidth={2.5} />
    </button>
  ) : null;

  const universalHeaderElement = (
    // Clicks on the header will bubble up to ShadCard and trigger onFlip,
    // unless a specific interactive element within the header stops propagation.
    <div className="flex justify-between items-center px-3 pb-3 pt-7 shrink-0 min-h-[60px]">
      <div className="flex items-center space-x-2 flex-shrink-0 mr-2">
        {logoUrl && (
          <Image
            src={logoUrl}
            alt={`${companyName || symbol} logo`}
            width={32}
            height={32}
            className={cn("object-contain rounded", "drop-shadow-sm")}
            unoptimized={!logoUrl.startsWith("/")}
          />
        )}
      </div>
      <div className="text-right overflow-hidden">
        <CardTitle
          className="text-sm font-semibold leading-tight truncate"
          title={companyName || symbol}
        >
          {companyName || symbol}
        </CardTitle>
        {companyName && (
          <p className="text-xs text-muted-foreground truncate" title={symbol}>
            ({symbol})
          </p>
        )}
        {!companyName && (
          <p className="text-xs text-muted-foreground">Stock Quote</p>
        )}
      </div>
    </div>
  );

  const socialBarElement = socialInteractions ? (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out z-10",
        "opacity-0 group-hover:opacity-100",
        "translate-y-full group-hover:translate-y-0"
      )}
      // onClick for the wrapper of SocialBar should also stop propagation if it's not meant to flip
      onClick={(e) => e.stopPropagation()}
    >
      <SocialBar interactions={socialInteractions} cardContext={cardContext} />
    </div>
  ) : null;

  // Helper to render the content of each face
  const renderCardFaceInternal = (
    contentNode: React.ReactNode,
    isFront: boolean
  ) => (
    <>
      {deleteButtonElement}{" "}
      {/* Absolutely positioned, click handled by itself */}
      {isFront && universalHeaderElement}
      <div
        className={cn(
          "flex-grow overflow-y-auto relative",
          isFront ? "px-3 pb-3 pt-0" : "px-3 pb-3 pt-7"
        )}
      >
        {/* The contentNode (e.g., PriceCardContent) will have its own interactive elements
            that should use e.stopPropagation() if they don't intend to flip the card. */}
        {contentNode}
      </div>
      {socialBarElement}
    </>
  );

  return (
    <div style={outerStyle} className={cn("group", className)}>
      <div
        style={innerCardStyles}
        className={cn(innerCardClassName)}
        data-testid="base-card-inner"
      >
        {/* Front Face - Now directly handles onFlip */}
        <ShadCard
          style={cardSurfaceStyles}
          className={cn(
            "card-face-wrapper",
            "overflow-hidden",
            "rounded-2xl",
            "shadow-lg"
          )}
          onClick={onFlip} // Apply onFlip to the entire card surface
          role="button" // Make it announce as a button for accessibility
          tabIndex={0} // Make it focusable
          onKeyDown={(e) =>
            e.key === "Enter" || e.key === " " ? onFlip() : undefined
          }
          aria-label={
            isFlipped ? `Show ${symbol} front` : `Show ${symbol} back details`
          }
        >
          {renderCardFaceInternal(faceContent, true)}
        </ShadCard>

        {/* Back Face - Now directly handles onFlip */}
        <ShadCard
          style={{ ...cardSurfaceStyles, ...backFaceTransformStyle }}
          className={cn(
            "card-back-wrapper",
            "overflow-hidden",
            "rounded-2xl",
            "shadow-lg"
          )}
          onClick={onFlip} // Apply onFlip to the entire card surface
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            e.key === "Enter" || e.key === " " ? onFlip() : undefined
          }
          aria-label={
            isFlipped ? `Show ${symbol} front` : `Show ${symbol} back details`
          }
        >
          {renderCardFaceInternal(backContent, false)}
        </ShadCard>
      </div>
      {children}
    </div>
  );
};

export default BaseCard;
