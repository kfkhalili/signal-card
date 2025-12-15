// src/lib/custom-cards/utils.ts
/**
 * Utility functions for custom card operations.
 */

import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";
import type { DisplayableCard } from "@/components/game/types";

/**
 * Finds the source card for a selected data item.
 *
 * @param item - The selected data item
 * @param activeCards - Array of active cards in the workspace
 * @returns The source card if found, null otherwise
 */
export function findSourceCardForItem(
  item: SelectedDataItem,
  activeCards: DisplayableCard[]
): DisplayableCard | null {
  return activeCards.find((card) => card.id === item.sourceCardId) ?? null;
}

/**
 * Validates that selected items are valid for custom card creation.
 *
 * @param items - Array of selected items
 * @param maxItems - Maximum number of items allowed (default: 20)
 * @returns True if valid, false otherwise
 */
export function validateSelectedItems(
  items: readonly SelectedDataItem[],
  maxItems = 20
): boolean {
  if (items.length === 0) {
    return false;
  }
  if (items.length > maxItems) {
    return false;
  }
  return true;
}

