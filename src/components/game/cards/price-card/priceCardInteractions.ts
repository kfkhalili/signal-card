// src/components/game/cards/price-card/priceCardInteractions.ts
import type { ToastFunctionType } from "@/hooks/use-toast";
import type { PriceCardData, PriceCardInteractions } from "./price-card.types";

type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractions,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

export function getPriceCardInteractionHandlers(
  toast: ToastFunctionType
): PriceSpecificInteractionsForContainer {
  return {
    onPriceCardSmaClick: (
      card: PriceCardData,
      smaPeriod: 50 | 200,
      smaValue: number
    ): void => {
      toast({
        title: "SMA Click",
        description: `${smaPeriod}D SMA of ${smaValue.toFixed(2)} on ${
          card.symbol
        }.`,
      });
    },
    onPriceCardRangeContextClick: (
      card: PriceCardData,
      levelType: "High" | "Low" | "YearHigh" | "YearLow",
      levelValue: number
    ): void => {
      toast({
        title: "Range Click",
        description: `${levelType} of ${levelValue.toFixed(2)} on ${
          card.symbol
        }.`,
      });
    },
    onPriceCardOpenPriceClick: (card: PriceCardData): void => {
      toast({
        title: "Open Price Click",
        description: `Open price clicked on ${card.symbol}.`,
      });
    },
    onPriceCardGenerateDailyPerformanceSignal: (card: PriceCardData): void => {
      toast({
        title: "Signal Generated",
        description: `Daily performance signal for ${card.symbol}.`,
      });
    },
  };
}
