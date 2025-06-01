// src/components/game/cards/base-card/base-card.types.ts

export type CardType =
  | "profile"
  | "price"
  | "revenue"
  | "solvency"
  | "cashuse"
  | "keyratios"
  | "dividendshistory"
  | "revenuebreakdown"
  | "analystgrades"; // Add new card types here

export interface BaseCardBackData {
  readonly description?: string;
}

export interface BaseCardData {
  readonly id: string;
  readonly type: CardType;
  readonly symbol: string;
  readonly createdAt: number; // Unix timestamp
  readonly companyName?: string | null;
  readonly logoUrl?: string | null;
  readonly backData: BaseCardBackData;
  readonly websiteUrl?: string | null;
}

export interface CardActionContext {
  readonly id: string;
  readonly symbol: string;
  readonly type: CardType;
  readonly companyName?: string | null;
  readonly logoUrl?: string | null;
  readonly websiteUrl?: string | null;
  readonly backData: BaseCardBackData;
}

// --- Generic Interaction System ---

/**
 * Defines the primary nature of the interaction.
 */
export type InteractionIntent =
  | "REQUEST_NEW_CARD"
  | "NAVIGATE_EXTERNAL"
  | "FILTER_WORKSPACE_DATA" // More specific for potential future use
  | "TRIGGER_CARD_ACTION"; // For actions specific to a card's functionality

/**
 * Base structure for any interaction payload, providing context about the source.
 */
interface BaseInteraction {
  sourceCardId: string;
  sourceCardSymbol: string;
  sourceCardType: CardType;
  // Optional: Context from where the request originated within the source card
  // e.g., "header", "sma50Metric", "revenueFigure"
  originatingElement?: string;
}

/**
 * Payload for interactions that intend to request or create a new card.
 */
export interface RequestNewCardInteraction extends BaseInteraction {
  intent: "REQUEST_NEW_CARD";
  targetCardType: CardType; // The type of card to be created/requested
  // Optional: Additional data relevant to creating the new card
  contextData?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Payload for interactions that lead to external navigation.
 */
export interface NavigateExternalInteraction extends BaseInteraction {
  intent: "NAVIGATE_EXTERNAL";
  url: string;
  navigationTargetName?: string; // Descriptive name, e.g., "companyWebsite", "secFilingLink"
}

/**
 * Payload for interactions related to filtering data within the workspace.
 */
export interface FilterWorkspaceDataInteraction extends BaseInteraction {
  intent: "FILTER_WORKSPACE_DATA";
  filterField: string; // e.g., "sector", "industry", "country", "exchange"
  filterValue: string;
}

/**
 * Payload for card-specific custom actions that don't fit other categories.
 * The `actionName` and `actionData` would be interpreted by the handler based on `sourceCardType`.
 */
export interface TriggerCardActionInteraction extends BaseInteraction {
  intent: "TRIGGER_CARD_ACTION";
  actionName: string; // e.g., "generateDailyPerformanceSignal", "toggleChartOverlay", "smaClick", "rangeContextClick"
  actionData?: Record<string, string | number | boolean | null | undefined>;
}

// Union of all specific interaction payloads
export type InteractionPayload =
  | RequestNewCardInteraction
  | NavigateExternalInteraction
  | FilterWorkspaceDataInteraction
  | TriggerCardActionInteraction;

/**
 * The callback function type for handling any generic interaction.
 */
export type OnGenericInteraction = (payload: InteractionPayload) => void;
