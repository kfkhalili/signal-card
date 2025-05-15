import crypto from "crypto";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type {
  ProfileCardData,
  ProfileCardStaticData,
  ProfileCardLiveData,
} from "@/components/game/cards/profile-card/profile-card.types";

// Define the union type for card data snapshots more clearly for the hash function
// This type should ideally be globally available if it's used in multiple places.
// For now, defining it here is fine, or you can move it to a more central types file
// like src/components/game/types.ts if it makes sense.
export type CardDataForHashing = PriceCardData | ProfileCardData;
// If you have other card types that will be part of the hash, add them to this union:
// | OtherCardTypeData;

export function generateStateHash(
  cardType: CardType,
  symbol: string,
  snapshotData: CardDataForHashing, // This is the ConcreteCardData part
  rarityLevel?: string | null,
  rarityReason?: string | null
): string {
  let keyDataString = `${cardType}:${symbol.toUpperCase()}`;

  if (rarityLevel) keyDataString += `:rarityL-${rarityLevel}`;
  if (rarityReason) keyDataString += `:rarityR-${rarityReason}`;

  if (snapshotData.type === "price") {
    const priceCard = snapshotData as PriceCardData;
    keyDataString += `:P-p${priceCard.faceData.price?.toFixed(4)}`;
    keyDataString += `:P-cp${priceCard.faceData.changePercentage?.toFixed(4)}`;
    keyDataString += `:P-v${priceCard.faceData.volume}`;
    keyDataString += `:P-dh${priceCard.faceData.dayHigh?.toFixed(4)}`;
    keyDataString += `:P-dl${priceCard.faceData.dayLow?.toFixed(4)}`;
    keyDataString += `:P-s50${priceCard.backData.sma50d?.toFixed(4)}`;
    keyDataString += `:P-s200${priceCard.backData.sma200d?.toFixed(4)}`;
    keyDataString += `:P-yh${priceCard.faceData.yearHigh?.toFixed(4)}`;
    keyDataString += `:P-yl${priceCard.faceData.yearLow?.toFixed(4)}`;
    keyDataString += `:P-mc${priceCard.backData.marketCap}`;
  } else if (snapshotData.type === "profile") {
    const profileCard = snapshotData as ProfileCardData;
    const staticD = profileCard.staticData as ProfileCardStaticData; // Assuming staticData is not optional for ProfileCardForHashing
    keyDataString += `:Pr-ind${staticD.industry}`;
    keyDataString += `:Pr-sec${staticD.sector}`;
    keyDataString += `:Pr-cou${staticD.country}`;
    keyDataString += `:Pr-ceo${staticD.ceo}`;
    keyDataString += `:Pr-ipo${staticD.formatted_ipo_date}`;
    keyDataString += `:Pr-emp${staticD.formatted_full_time_employees}`;

    if (profileCard.liveData) {
      const liveD = profileCard.liveData as ProfileCardLiveData; // Assuming liveData is not optional if present
      keyDataString += `:PrL-p${liveD.price?.toFixed(4)}`;
      keyDataString += `:PrL-v${liveD.volume}`;
    }
  }
  // Add other card type specific fields here for hashing as you add new card types
  // else if (snapshotData.type === "newCardType") {
  //   const newCardTypeData = snapshotData as NewCardTypeData;
  //   // ... add its relevant fields to keyDataString
  // }

  return crypto.createHash("md5").update(keyDataString).digest("hex");
}
