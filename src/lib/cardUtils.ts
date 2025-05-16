// src/lib/cardUtils.ts
import crypto from "crypto";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { ConcreteCardData } from "@/components/game/types";

/**
 * Recursively sorts object keys for consistent JSON stringification.
 * Handles nested objects and arrays.
 */
function stableStringifyReplacer(key: string, value: any): any {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value)
      .sort()
      .reduce((sortedObj, k) => {
        sortedObj[k] = value[k];
        return sortedObj;
      }, {} as any);
  }
  return value;
}

export function generateStateHash(
  cardType: CardType,
  symbol: string,
  // snapshotData is the ConcreteCardData (e.g., PriceCardData, ProfileCardData)
  // It contains all specific fields for that card type (faceData, backData, staticData, liveData etc.)
  snapshotData: ConcreteCardData,
  rarityLevel?: string | null,
  rarityReason?: string | null
): string {
  const commonPartsString = [
    `type:${cardType}`,
    `symbol:${symbol.toUpperCase()}`,
    `rarityL:${rarityLevel ?? "NULL"}`,
    `rarityR:${rarityReason ?? "NULL"}`,
  ].join("|");

  // Stringify the entire specific card data object with sorted keys for consistency
  const snapshotDataString = JSON.stringify(
    snapshotData,
    stableStringifyReplacer
  );

  const keyDataString = `${commonPartsString}|data:${snapshotDataString}`;

  return crypto.createHash("md5").update(keyDataString).digest("hex");
}
