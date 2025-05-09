import React from 'react';
import { Card as ShadCard } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BaseDisplayCardProps {
  isFlipped: boolean;
  onCardClick?: (event?: React.MouseEvent<HTMLDivElement>) => void;
  faceContent: React.ReactNode;
  backContent: React.ReactNode;
  children?: React.ReactNode; // For overlays on top of everything
  className?: string;
  innerCardClassName?: string;
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
    <div className={cn('relative w-full h-full group perspective', className)}>
      {/* Click Target for Front Face - Rendered BEFORE visual content */}
      {!isFlipped && (
        <div
          className="absolute inset-0 w-full h-full cursor-pointer" // Removed z-index
          onClick={onCardClick}
          aria-hidden="true"
        />
      )}

      {/* Click Target for Back Face - Rendered BEFORE visual content */}
      {isFlipped && (
        <div
          className="absolute inset-0 w-full h-full cursor-pointer" // Removed z-index
          onClick={onCardClick}
          aria-hidden="true"
        />
      )}

      {/* Front Face Content (Visual) - Rendered AFTER click targets */}
      <ShadCard
        className={cn(
          'absolute w-full h-full transition-transform duration-700 ease-in-out origin-center transform-style-preserve-3d backface-hidden',
          !isFlipped ? 'rotate-y-0' : 'rotate-y-minus-180',
          innerCardClassName,
          'pointer-events-none' // Make ShadCards themselves non-interactive for clicks
        )}
      >
        {faceContent} {/* Content within (like CardFace) can have pointer-events-auto */}
      </ShadCard>

      {/* Back Face Content (Visual) - Rendered AFTER click targets */}
      <ShadCard
        className={cn(
          'absolute w-full h-full transition-transform duration-700 ease-in-out origin-center transform-style-preserve-3d backface-hidden',
          isFlipped ? 'rotate-y-0' : 'rotate-y-180',
          innerCardClassName,
          'pointer-events-none' // Make ShadCards themselves non-interactive for clicks
        )}
      >
        {backContent} {/* Content within (like CardFace) can have pointer-events-auto */}
      </ShadCard>
      
      {/* Children (overlays like front-face interactive area or timer) */}
      {/* This container already has pointer-events-none from a previous step, specific children have pointer-events-auto */}
      {children && <div className="absolute inset-0 z-10 pointer-events-none">{children}</div>}
    </div>
  );
};

export default BaseDisplayCard;
