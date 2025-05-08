
"use client";

import React from 'react';
import type { DiscoveredSignal } from './types';
import LogCardFace from './log-card-face';
import { cn } from '@/lib/utils';

interface LogCardProps {
  signal: DiscoveredSignal;
  onToggleFlip: (signalId: string) => void;
  onDeleteSignal: (signalId: string) => void;
}

const LogCard: React.FC<LogCardProps> = ({ signal, onToggleFlip, onDeleteSignal }) => {
  const handleCardClick = (event: React.MouseEvent | React.KeyboardEvent) => {
    // Prevent flipping if the click target is the delete button or inside it
    if ((event.target as HTMLElement).closest('[aria-label="Delete signal"]')) {
      return;
    }
    onToggleFlip(signal.id);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card flip when delete button is clicked
    onDeleteSignal(signal.id);
  };

  const cardContainerClasses = cn(
    'card-container group/logcard w-64 h-80 cursor-pointer relative', // Added group/logcard and relative
    { 'is-flipped': signal.isFlipped },
    'shadow-md hover:shadow-xl transition-shadow'
  );

  return (
    <div
      className={cardContainerClasses}
      onClick={handleCardClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick(e)}
      role="button"
      tabIndex={0}
      aria-label={`Signal card ${signal.id}, type ${signal.type}. ${signal.isFlipped ? "Showing back." : "Showing front."} Click to flip, or use delete button on hover.`}
    >
      <div className="card-inner">
        <LogCardFace signal={signal} isBack={false} onDelete={handleDeleteClick} />
        <LogCardFace signal={signal} isBack={true} />
      </div>
    </div>
  );
};

export default LogCard;
