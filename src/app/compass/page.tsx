// src/app/leaderboard/page.tsx
"use client";

import { useEffect } from "react";
import { useLeaderboardStore } from "@/stores/compassStore";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "use-debounce";
import type { LeaderboardEntry } from "@/stores/compassStore";
import { Button } from "@/components/ui/button";

type Pillar = "value" | "growth" | "profitability" | "income" | "health";
type Weights = Record<Pillar, number>;

const investorProfiles: { name: string; weights: Weights }[] = [
  {
    name: "Value Investor",
    weights: { value: 0.5, growth: 0.1, profitability: 0.2, income: 0.1, health: 0.1 },
  },
  {
    name: "Growth Investor",
    weights: { value: 0.1, growth: 0.5, profitability: 0.3, income: 0.0, health: 0.1 },
  },
  {
    name: "Smart Growth", // Formerly "GARP"
    weights: { value: 0.3, growth: 0.4, profitability: 0.2, income: 0.0, health: 0.1 },
  },
  {
    name: "Income Investor",
    weights: { value: 0.1, growth: 0.1, profitability: 0.2, income: 0.5, health: 0.1 },
  },
    {
    name: "Quality Investing",
    weights: { value: 0.1, growth: 0.1, profitability: 0.4, income: 0.1, health: 0.3 },
  },
    {
    name: "Defensive",
    weights: { value: 0.2, growth: 0.1, profitability: 0.2, income: 0.2, health: 0.3 },
  },
  {
    name: "Balanced",
    weights: { value: 0.2, growth: 0.2, profitability: 0.2, income: 0.2, health: 0.2 },
  },
];

const InvestorProfileButtons = () => {
  const { actions } = useLeaderboardStore();

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {investorProfiles.map((profile) => (
        <Button
          key={profile.name}
          variant="outline"
          onClick={() => actions.setWeights(profile.weights)}
        >
          {profile.name}
        </Button>
      ))}
    </div>
  );
};

const WeightSliders = () => {
  const { weights, actions } = useLeaderboardStore();

  const handleSliderChange = (changedPillar: Pillar, newValue: number) => {
    const newWeights = { ...weights };
    const scaledNewValue = newValue / 100;
    const oldValue = newWeights[changedPillar];

    if (oldValue === scaledNewValue) {
      return;
    }

    const oldSumOfOthers = 1.0 - oldValue;
    const newSumOfOthers = 1.0 - scaledNewValue;

    if (oldSumOfOthers <= 0) {
      const otherPillars = (Object.keys(newWeights) as Pillar[]).filter(
        (p) => p !== changedPillar
      );
      if (otherPillars.length > 0) {
        const share = newSumOfOthers / otherPillars.length;
        otherPillars.forEach((p) => {
          newWeights[p] = share;
        });
      }
    } else {
      const factor = newSumOfOthers / oldSumOfOthers;
      (Object.keys(newWeights) as Pillar[]).forEach((p) => {
        if (p !== changedPillar) {
          newWeights[p] *= factor;
        }
      });
    }

    newWeights[changedPillar] = scaledNewValue;

    const total = Object.values(newWeights).reduce(
      (sum, val) => sum + val,
      0
    );
    if (total !== 1.0) {
      const roundingError = 1.0 - total;
      newWeights[changedPillar] += roundingError;
    }

    actions.setWeights(newWeights);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
      {Object.entries(weights).map(([pillar, value]) => (
        <div key={pillar}>
          <label className="capitalize">{pillar}</label>
          <input
            type="range"
            min="0"
            max="100"
            value={value * 100}
            onChange={(e) =>
              handleSliderChange(
                pillar as Pillar,
                parseInt(e.target.value, 10)
              )
            }
            className="w-full"
          />
          <span>{(value * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
};

export default function LeaderboardPage() {
  const { supabase } = useAuth();
  const {
    weights,
    leaderboardData,
    isLoading,
    error,
    actions,
  } = useLeaderboardStore();
  const [debouncedWeights] = useDebounce(weights, 500);

  useEffect(() => {
    if (supabase) {
      actions.fetchLeaderboard(supabase);
    }
  }, [debouncedWeights, supabase, actions]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Market Compass
      </h1>
      <InvestorProfileButtons />
      <WeightSliders />
      <div className="mt-4">
        {isLoading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!isLoading && !error && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Composite Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaderboardData.map((item: LeaderboardEntry) => (
                <tr key={item.symbol}>
                  <td className="px-6 py-4 whitespace-nowrap">{item.rank}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.composite_score.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}