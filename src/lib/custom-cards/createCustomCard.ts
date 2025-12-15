// src/lib/custom-cards/createCustomCard.ts
/**
 * Core logic for creating custom cards.
 * This is a pure function that can be used from any context (frontend, API routes, etc.).
 */

import type { CustomCardData } from "@/components/game/cards/custom-card/custom-card.types";
import type { DisplayableCardState } from "@/components/game/types";
import type {
  CreateCustomCardInput,
  CreateCustomCardOptions,
} from "./types";

/**
 * Default ID generator for custom cards.
 */
const defaultGenerateId = (): string => {
  return `custom-${Date.now()}`;
};

/**
 * Default description generator.
 */
const defaultDescription = (companyName?: string | null): string => {
  return `A custom card for ${companyName ?? "a company"}.`;
};

/**
 * Creates a custom card from selected data items.
 *
 * This is a pure function that takes input parameters and returns a custom card
 * object. It can be used from any context (React components, API routes, etc.).
 *
 * @param input - Input parameters for creating the custom card
 * @param options - Optional configuration for card creation
 * @returns A custom card object ready to be added to the workspace, or null if invalid input
 *
 * @example
 * ```typescript
 * const customCard = createCustomCard({
 *   narrative: "Key Metrics",
 *   description: "Important financial metrics",
 *   selectedItems: [...],
 *   sourceCard: profileCard
 * });
 * ```
 */
export function createCustomCard(
  input: CreateCustomCardInput,
  options?: CreateCustomCardOptions
): (CustomCardData & DisplayableCardState) | null {
  // Validate input
  if (input.selectedItems.length === 0) {
    return null;
  }

  const generateId = options?.generateId ?? defaultGenerateId;
  const getDefaultDescription =
    options?.defaultDescription ?? defaultDescription;

  // Get source card metadata from first selected item
  const sourceCard = input.sourceCard;

  // Create the custom card object
  const newCustomCard: CustomCardData & DisplayableCardState = {
    id: generateId(),
    type: "custom",
    symbol: sourceCard?.symbol ?? "CUSTOM",
    companyName: sourceCard?.companyName ?? input.narrative,
    displayCompanyName:
      sourceCard?.displayCompanyName ??
      sourceCard?.companyName ??
      input.narrative,
    logoUrl: sourceCard?.logoUrl ?? null,
    createdAt: Date.now(),
    isFlipped: false,
    websiteUrl: null,
    backData: {
      description:
        input.description ?? getDefaultDescription(sourceCard?.companyName),
    },
    narrative: input.narrative,
    items: input.selectedItems,
  };

  return newCustomCard;
}

