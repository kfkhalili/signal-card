import React from 'react';
import { Card as ShadCard } from '@/components/ui/card'; // Using ShadCard as the base
import { cn } from '@/lib/utils'; // For className utilities

interface BaseDisplayCardProps {
  isFlipped: boolean;
  onCardClick?: () => void;
  faceContent: React.ReactNode;
  backContent: React.ReactNode;
  children?: React.ReactNode; // For additional UI elements like buttons, timers
  className?: string;
  innerCardClassName?: string; // To style the inner content area if needed
}

const BaseDisplayCard: React.FC<BaseDisplayCardProps> = ({
  isFlipped,
  onCardClick,
  faceContent,
  backContent,
  children,
  className,
  innerCardClassName,
}) => {
  return (
    <div
      className={cn('relative w-full h-full cursor-pointer group perspective', className)}
      onClick={onCardClick}
    >
      <ShadCard // Front Face
        className={cn(
          'absolute w-full h-full transition-transform duration-700 ease-in-out origin-center transform-style-preserve-3d backface-hidden',
          !isFlipped ? 'rotate-y-0' : 'rotate-y-minus-180', // Changed to -180deg for flipped state
          innerCardClassName
        )}
      >
        {faceContent}
      </ShadCard>
      <ShadCard // Back Face
        className={cn(
          'absolute w-full h-full transition-transform duration-700 ease-in-out origin-center transform-style-preserve-3d backface-hidden',
          isFlipped ? 'rotate-y-0' : 'rotate-y-180',  // Stays as is: 180deg to 0deg when isFlipped is true
          innerCardClassName
        )}
      >
        {backContent}
      </ShadCard>
      {/* Children are rendered outside the flipping mechanism, can be overlays or controls */}
      {children && <div className="absolute inset-0 z-10 pointer-events-none">{children}</div>} 
    </div>
  );
};

export default BaseDisplayCard;
