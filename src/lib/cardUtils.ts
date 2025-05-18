// src/lib/cardUtils.ts
import crypto from "crypto";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { ConcreteCardData } from "@/components/game/types";

/**
 * Recursively sorts object keys for consistent JSON stringification.
 * Handles nested objects and arrays.
 */
function stableStringifyReplacer(_key: string, value: unknown): unknown {
  // If the value is an object (but not an array or null), sort its keys
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const sortedKeys = Object.keys(value).sort();
    const sortedObject: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      sortedObject[k] = (value as Record<string, unknown>)[k];
    }
    return sortedObject;
  }
  return value;
}

export function generateStateHash(
  cardType: CardType,
  symbol: string,
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

  const snapshotDataString = JSON.stringify(
    snapshotData,
    stableStringifyReplacer
  );

  const keyDataString = `${commonPartsString}|data:${snapshotDataString}`;

  return crypto.createHash("md5").update(keyDataString).digest("hex");
}
