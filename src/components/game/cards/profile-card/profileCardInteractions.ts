// src/components/game/cards/profile-card/profileCardInteractions.ts
import type { ToastFunctionType } from "@/hooks/use-toast";
import type { CardActionContext } from "../base-card/base-card.types";
import type { ProfileCardInteractionCallbacks } from "./profile-card.types";

export function getProfileCardInteractionHandlers(
  toast: ToastFunctionType
): ProfileCardInteractionCallbacks {
  return {
    onWebsiteClick: (websiteUrl: string): void => {
      // Added block body
      toast({ title: "Opening Website", description: websiteUrl });
      window.open(websiteUrl, "_blank", "noopener,noreferrer");
    },
    onFilterByField: (fieldType: string, value: string): void => {
      // Added block body
      toast({
        title: "Filter Action",
        description: `Filter by ${fieldType}: ${value} (Not implemented).`,
      });
    },
    onRequestPriceCard: (context: CardActionContext): void => {
      // Added block body
      toast({
        title: "Navigation Action",
        description: `Show full price chart for ${context.symbol} (Not implemented).`,
      });
    },
  };
}
