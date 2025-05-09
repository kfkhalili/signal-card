// src/components/game/base-display-card.tsx
import React from "react";
import { Card as ShadCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BaseDisplayCardProps {
  isFlipped: boolean;
  faceContent: React.ReactNode;
  backContent: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  innerCardClassName?: string;
}

const BaseDisplayCard: React.FC<BaseDisplayCardProps> = ({
  isFlipped,
  faceContent,
  backContent,
  children,
  className,
  innerCardClassName,
}) => {
  return (
    <div className={cn("relative w-full h-full group perspective", className)}>
      <ShadCard
        className={cn(
          "absolute w-full h-full transition-transform duration-700 ease-in-out origin-center transform-style-preserve-3d backface-hidden pointer-events-none",
          !isFlipped ? "rotate-y-0" : "rotate-y-minus-180",
          innerCardClassName
        )}
      >
        {faceContent}
      </ShadCard>
      <ShadCard
        className={cn(
          "absolute w-full h-full transition-transform duration-700 ease-in-out origin-center transform-style-preserve-3d backface-hidden pointer-events-none",
          isFlipped ? "rotate-y-0" : "rotate-y-180",
          innerCardClassName
        )}
      >
        {backContent}
      </ShadCard>
      {children && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {children}
        </div>
      )}
    </div>
  );
};

export default BaseDisplayCard;
