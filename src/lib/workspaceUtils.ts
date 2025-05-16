// src/lib/workspaceUtils.ts
import type {
  DisplayableCard,
  ConcreteCardData,
} from "@/components/game/types";
import { calculateDynamicCardRarity } from "@/components/game/rarityCalculator";

export interface UpdateOrAddCardResult {
  updatedCards: DisplayableCard[];
  cardChangedOrAdded: boolean;
  finalCard?: DisplayableCard;
}

/**
 * Updates an existing card in a list or adds it if it doesn't exist.
 * It also recalculates the card's rarity.
 *
 * @param prevCards The current array of displayable cards.
 * @param symbolToUpdate The symbol of the card to update or add.
 * @param cardType The type of the card.
 * @param newExternalData The new external data to process for the card.
 * @param updateConcreteLogic A function that takes existing card data (if any) and new external data,
 * and returns the updated/new concrete card data.
 * @param newDisplayableCardCreator An optional function to create a new displayable card structure
 * if the card doesn't exist in prevCards.
 * @returns An object containing the new array of cards, a flag indicating if a change occurred,
 * and the final card instance (either updated or newly added).
 */
export function updateOrAddCard<
  SpecificConcreteCardData extends ConcreteCardData,
  NewExternalDataType
>(
  prevCards: DisplayableCard[],
  symbolToUpdate: string,
  cardType: SpecificConcreteCardData["type"],
  newExternalData: NewExternalDataType,
  updateConcreteLogic: (
    existingConcreteData: SpecificConcreteCardData | undefined,
    externalData: NewExternalDataType,
    existingDisplayableCard?: DisplayableCard
  ) => SpecificConcreteCardData,
  newDisplayableCardCreator?: (
    concreteData: SpecificConcreteCardData
  ) => DisplayableCard
): UpdateOrAddCardResult {
  let cardChangedOrAdded = false;
  const newCardsArray = [...prevCards]; // Work on a new array
  const existingCardIndex = newCardsArray.findIndex(
    (c) => c.symbol === symbolToUpdate && c.type === cardType
  );
  const existingDisplayableCard =
    existingCardIndex !== -1 ? newCardsArray[existingCardIndex] : undefined;

  const existingConcreteCardData = existingDisplayableCard as
    | SpecificConcreteCardData
    | undefined;

  const updatedConcreteCardData = updateConcreteLogic(
    existingConcreteCardData,
    newExternalData,
    existingDisplayableCard
  );

  // Prepare a card-like structure for rarity calculation
  // This assumes updatedConcreteCardData contains type, symbol, etc.
  const tempCardForRarityCalc = {
    ...(updatedConcreteCardData as any), // Spread concrete data
    isFlipped: existingDisplayableCard?.isFlipped || false, // Preserve flip state or default
    // Ensure all fields expected by calculateDynamicCardRarity are present or defaulted
    // The 'as any' is used because ConcreteCardData doesn't enforce isFlipped,
    // but calculateDynamicCardRarity expects a DisplayableCard structure.
  } as DisplayableCard;

  const { rarity: newRarity, reason: newRarityReason } =
    calculateDynamicCardRarity(tempCardForRarityCalc);

  let finalCardForReturn: DisplayableCard | undefined;

  if (existingDisplayableCard) {
    const oldDataStringForCompare = JSON.stringify(existingConcreteCardData);
    const newDataStringForCompare = JSON.stringify(updatedConcreteCardData);

    if (
      oldDataStringForCompare !== newDataStringForCompare ||
      existingDisplayableCard.currentRarity !== newRarity ||
      existingDisplayableCard.rarityReason !== newRarityReason
    ) {
      cardChangedOrAdded = true;
      const updatedCard: DisplayableCard = {
        ...existingDisplayableCard, // Preserve existing state like id, createdAt, isFlipped
        ...updatedConcreteCardData, // Apply new data
        currentRarity: newRarity,
        rarityReason: newRarityReason,
      };
      newCardsArray[existingCardIndex] = updatedCard;
      finalCardForReturn = updatedCard;
    } else {
      finalCardForReturn = existingDisplayableCard; // No change
    }
  } else if (newDisplayableCardCreator) {
    const newBaseDisplayable = newDisplayableCardCreator(
      updatedConcreteCardData
    );
    const newCardWithRarity: DisplayableCard = {
      ...newBaseDisplayable,
      currentRarity: newRarity,
      rarityReason: newRarityReason,
    };
    newCardsArray.push(newCardWithRarity);
    cardChangedOrAdded = true;
    finalCardForReturn = newCardWithRarity;
  } else {
    // This path means no existing card and no way to create a new one.
    // Return original cards and no change.
    return {
      updatedCards: prevCards,
      cardChangedOrAdded: false,
      finalCard: undefined,
    };
  }

  return {
    updatedCards: newCardsArray,
    cardChangedOrAdded,
    finalCard: finalCardForReturn,
  };
}
