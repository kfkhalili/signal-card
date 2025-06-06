// src/components/workspace/SectorIconDisplay.tsx (new file)
"use client";

import React from "react";
import {
  Building2,
  HeartPulse,
  Shapes,
  ShoppingCart,
  Flame,
  Cog,
  Lightbulb,
  Landmark,
  Shield,
  Cpu,
  Wifi,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SectorName =
  | "Real Estate"
  | "Healthcare"
  | "Basic Materials"
  | "Consumer Cyclical"
  | "Energy"
  | "Industrials"
  | "Utilities"
  | "Financial Services"
  | "Consumer Defensive"
  | "Technology"
  | "Communication Services"
  | string; // Allow any string, but map known ones

const SECTOR_ICON_MAP: Partial<Record<SectorName, LucideIcon>> = {
  "Real Estate": Building2,
  Healthcare: HeartPulse,
  "Basic Materials": Shapes, // General, consider 'Factory' or 'Hammer'
  "Consumer Cyclical": ShoppingCart,
  Energy: Flame,
  Industrials: Cog,
  Utilities: Lightbulb,
  "Financial Services": Landmark,
  "Consumer Defensive": Shield,
  Technology: Cpu,
  "Communication Services": Wifi,
};

const DEFAULT_SECTOR_ICON = Briefcase; // Or Info, HelpCircle

interface SectorIconDisplayProps {
  sector: SectorName | null | undefined;
  className?: string;
  iconSize?: number;
}

export const SectorIconDisplay: React.FC<SectorIconDisplayProps> = ({
  sector,
  className,
  iconSize = 14,
}) => {
  if (!sector) {
    // Optionally render a placeholder for null/undefined sector
    // return <HelpCircle size={iconSize} className={cn("text-muted-foreground", className)} title="Sector: N/A" />;
    return null; // Or render nothing
  }

  const IconComponent = SECTOR_ICON_MAP[sector] || DEFAULT_SECTOR_ICON;
  const displaySectorName = sector || "N/A";

  return (
    <div
      className={cn("flex items-center", className)}
      aria-label={`Sector: ${displaySectorName}`}>
      <IconComponent size={iconSize} className="shrink-0" />
    </div>
  );
};
