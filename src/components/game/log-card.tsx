
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
  const handleCardClick = () => {
    onToggleFlip(signal.id);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card flip when delete button is clicked
    onDeleteSignal(signal.id);
  };

  const cardContainerClasses = cn(
    'card-container w-64 h-80 cursor-pointer', // Standard card size
    { 'is-flipped': signal.isFlipped },
    'shadow-md hover:shadow-xl transition-shadow' // Basic hover effect
  );

  return (
    <div
      className={cardContainerClasses}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      aria-label={`Signal card ${signal.id}, type ${signal.type}. ${signal.isFlipped ? "Showing back." : "Showing front."} Click to flip.`}
    >
      <div className="card-inner">
        <LogCardFace signal={signal} isBack={false} />
        <LogCardFace signal={signal} isBack={true} onDelete={handleDeleteClick} />
      </div>
    </div>
  );
};

export default LogCard;
