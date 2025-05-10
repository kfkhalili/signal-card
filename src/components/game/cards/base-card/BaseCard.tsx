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
  faceContent: React.ReactNode; // This will be the clickable wrapper from PriceCardContainer
  backContent: React.ReactNode; // This will be the clickable wrapper from PriceCardContainer
  cardContext: CardActionContext;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode;
}

const BaseCard: React.FC<BaseCardProps> = ({
  isFlipped,
  faceContent, // This IS the clickable div from PriceCardContainer
  backContent, // This IS the clickable div from PriceCardContainer
  cardContext,
  socialInteractions,
  onDeleteRequest,
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
    >
      <SocialBar interactions={socialInteractions} cardContext={cardContext} />
    </div>
  ) : null;

  // This function now renders the structure for each card face
  const renderCardFaceInternal = (
    contentNode: React.ReactNode,
    isFront: boolean
  ) => (
    <>
      {deleteButtonElement}
      {isFront && universalHeaderElement}{" "}
      {/* Only render header on the front face */}
      <div
        className={cn(
          "flex-grow overflow-y-auto relative", // Ensure this div can expand
          isFront ? "px-3 pb-3 pt-0" : "px-3 pb-3 pt-7" // Adjust padding based on face
        )}
      >
        {contentNode}{" "}
        {/* This is the clickable wrapper from PriceCardContainer */}
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
        <ShadCard
          style={cardSurfaceStyles}
          className={cn(
            "card-face-wrapper",
            "overflow-hidden",
            "rounded-2xl",
            "shadow-lg"
          )}
        >
          {renderCardFaceInternal(faceContent, true)}
        </ShadCard>

        <ShadCard
          style={{ ...cardSurfaceStyles, ...backFaceTransformStyle }}
          className={cn(
            "card-back-wrapper",
            "overflow-hidden",
            "rounded-2xl",
            "shadow-lg"
          )}
        >
          {renderCardFaceInternal(backContent, false)}
        </ShadCard>
      </div>
      {children}
    </div>
  );
};

export default BaseCard;
