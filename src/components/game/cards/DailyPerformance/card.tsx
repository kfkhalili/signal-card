import React from "react";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { DailyPerformanceCard } from "./type"; // Assuming types are in ../../types
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, MinusCircle } from "lucide-react";

interface DailyPerformanceSignalDisplayProps {
  card: DailyPerformanceCard;
  isBack: boolean;
}

export const DailyPerformanceSignalDisplay: React.FC<
  DailyPerformanceSignalDisplayProps
> = ({ card, isBack }) => {
  if (isBack) {
    const explanation =
      card.backData?.explanation ?? "No explanation available.";
    const generatedAt = card.discoveredAt;
    return (
      // Ensure pointer-events are handled correctly based on BaseDisplayCard's behavior
      <div className="pointer-events-auto h-full overflow-y-auto">
        <CardHeader>
          <CardTitle>{card.symbol} - Perf. Context</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>{explanation}</p>
          <p>
            Change:{" "}
            {typeof card.dayChange === "number"
              ? card.dayChange.toFixed(2)
              : "N/A"}{" "}
            (
            {typeof card.changePercentage === "number"
              ? `${(card.changePercentage * 100).toFixed(2)}%`
              : "N/A"}
            )
          </p>
          <p>
            Generated:{" "}
            {generatedAt && !isNaN(new Date(generatedAt).getTime())
              ? format(new Date(generatedAt), "p,PP")
              : "N/A"}
          </p>
        </CardContent>
      </div>
    );
  } else {
    const p = card; // alias for clarity
    const iP = p.dayChange >= 0;
    const cC =
      p.dayChange === 0
        ? "text-muted-foreground"
        : iP
        ? "text-green-600"
        : "text-red-600";
    let PIcon = MinusCircle;
    if (iP && p.dayChange !== 0) PIcon = TrendingUp;
    if (!iP && p.dayChange !== 0) PIcon = TrendingDown;

    return (
      // Ensure pointer-events are handled correctly
      <div className="pointer-events-auto h-full overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-xl">{card.symbol}</CardTitle>
          <CardDescription>Daily Performance Signal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <p>
            Price:{" "}
            <span className="font-semibold">
              {typeof p.currentPrice === "number"
                ? `$${p.currentPrice.toFixed(2)}`
                : "N/A"}
            </span>
          </p>
          <div className={cn("flex items-center", cC)}>
            <PIcon className="h-5 w-5 mr-1.5" />
            <p className={`font-semibold`}>
              {typeof p.dayChange === "number"
                ? `${iP ? "+" : ""}${p.dayChange.toFixed(2)}`
                : "N/A"}{" "}
              (
              {typeof p.changePercentage === "number"
                ? `${(p.changePercentage * 100).toFixed(2)}%`
                : "N/A"}
              )
            </p>
          </div>
          <p className="text-xs">
            vs Prev Cl:{" "}
            {typeof p.previousClose === "number"
              ? `$${p.previousClose.toFixed(2)}`
              : "N/A"}
          </p>
          <p className="text-xs">
            Gen:{" "}
            {p.discoveredAt && !isNaN(new Date(p.discoveredAt).getTime())
              ? format(new Date(p.discoveredAt), "p")
              : "N/A"}
          </p>
        </CardContent>
      </div>
    );
  }
};
