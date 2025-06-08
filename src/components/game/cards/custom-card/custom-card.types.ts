// src/components/game/cards/custom-card/custom-card.types.ts
import type { BaseCardData } from "../base-card/base-card.types";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";

export interface CustomCardData extends BaseCardData {
  readonly type: "custom";
  readonly narrative: string; // The user-defined narrative from the dialog title input
  readonly items: readonly SelectedDataItem[];
}
