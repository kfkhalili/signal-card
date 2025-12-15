// src/lib/custom-cards/types.ts
/**
 * Type definitions for custom card creation utilities.
 * These types are isolated from the workspace manager to enable reuse.
 */

import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";
import type { DisplayableCard } from "@/components/game/types";

/**
 * Input parameters for creating a custom card.
 */
export interface CreateCustomCardInput {
  /** User-defined narrative/title for the card */
  narrative: string;
  /** User-defined description for the back of the card */
  description?: string;
  /** Selected data items to include in the card */
  selectedItems: readonly SelectedDataItem[];
  /** Source card to derive metadata from (company name, symbol, logo, etc.) */
  sourceCard?: DisplayableCard | null;
}

/**
 * Options for custom card creation.
 */
export interface CreateCustomCardOptions {
  /** Custom ID generator. Defaults to `custom-${Date.now()}` */
  generateId?: () => string;
  /** Default description if none provided */
  defaultDescription?: (companyName?: string | null) => string;
}

