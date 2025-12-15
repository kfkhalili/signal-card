// src/app/compass/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLeaderboardStore } from "@/stores/compassStore";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "use-debounce";
import type { LeaderboardEntry } from "@/stores/compassStore";
import { Button } from "@/components/ui/button";
import { useAddCardToWorkspace } from "@/hooks/useAddCardToWorkspace";
import { PlusCircle, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { cn, createSecureImageUrl } from "@/lib/utils";
import { fromPromise } from "neverthrow";

type Pillar = "valuation" | "quality" | "safety";
type Weights = Record<Pillar, number>;

const investorProfiles: { name: string; weights: Weights }[] = [
  {
    name: "Value Investor",
    weights: { valuation: 0.6, quality: 0.2, safety: 0.2 },
  },
  {
    name: "Quality Investor",
    weights: { valuation: 0.2, quality: 0.6, safety: 0.2 },
  },
  {
    name: "Defensive Investor",
    weights: { valuation: 0.2, quality: 0.2, safety: 0.6 },
  },
  {
    name: "Balanced",
    weights: { valuation: 0.33, quality: 0.33, safety: 0.34 },
  },
  {
    name: "Growth at Value",
    weights: { valuation: 0.4, quality: 0.4, safety: 0.2 },
  },
  {
    name: "Quality & Safety",
    weights: { valuation: 0.1, quality: 0.45, safety: 0.45 },
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

  const pillarLabels: Record<Pillar, string> = {
    valuation: "Valuation",
    quality: "Quality",
    safety: "Safety",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
      {Object.entries(weights).map(([pillar, value]) => (
        <div key={pillar}>
          <label className="font-medium">{pillarLabels[pillar as Pillar]}</label>
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

interface ProfileData {
  company_name: string | null;
  image: string | null;
}

export default function CompassPage() {
  const { supabase, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const {
    weights,
    leaderboardData,
    isLoading,
    error,
    actions,
  } = useLeaderboardStore();
  const [debouncedWeights] = useDebounce(weights, 500);
  const { addCard, addCards } = useAddCardToWorkspace();
  const [addingSymbols, setAddingSymbols] = useState<Set<string>>(new Set());
  const [profileData, setProfileData] = useState<Record<string, ProfileData>>({});
  const [hasMounted, setHasMounted] = useState<boolean>(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted && !isAuthLoading && !user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router, hasMounted]);

  useEffect(() => {
    if (supabase) {
      actions.fetchLeaderboard(supabase);
    }
  }, [debouncedWeights, supabase, actions]);

  // Fetch profile data for all symbols in leaderboard
  useEffect(() => {
    if (!supabase || leaderboardData.length === 0) return;

    const fetchProfiles = async () => {
      const symbols = leaderboardData.map((item) => item.symbol);

      const profileResult = await fromPromise(
        supabase
          .from("profiles")
          .select("symbol, company_name, image")
          .in("symbol", symbols),
        (e) => new Error(`Failed to fetch profiles: ${(e as Error).message}`)
      );

      profileResult.match(
        (response) => {
          const { data, error } = response;
          if (error) {
            console.error("Error fetching profiles:", error);
            return;
          }

          const profileMap: Record<string, ProfileData> = {};
          if (data) {
            data.forEach((profile) => {
              profileMap[profile.symbol] = {
                company_name: profile.company_name,
                image: profile.image,
              };
            });
          }
          setProfileData(profileMap);
        },
        (err) => {
          console.error("Error fetching profiles:", err);
        }
      );
    };

    fetchProfiles();
  }, [supabase, leaderboardData]);

  const handleAddToWorkspace = async (symbol: string) => {
    setAddingSymbols((prev) => new Set(prev).add(symbol));
    try {
      await addCard(symbol, ["profile"]);
    } finally {
      setAddingSymbols((prev) => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
    }
  };

  const handleExploreTop3 = async () => {
    if (leaderboardData.length < 3) return;
    const top3 = leaderboardData.slice(0, 3);
    setAddingSymbols(new Set(top3.map((item) => item.symbol)));
    try {
      // Add all top 3 to workspace at once
      await addCards(
        top3.map((item) => ({ symbol: item.symbol, cardTypes: ["profile"] }))
      );
    } finally {
      setAddingSymbols(new Set());
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Market Compass</h1>
        <p className="text-muted-foreground">
          Discover stocks ranked by your investment style. Rankings are aligned with the Symbol Analysis Page metrics:
          Valuation (DCF discount, P/E, PEG), Quality (ROIC, Gross Margin, FCF Yield), and Safety (Net Debt/EBITDA, Altman Z-Score, Interest Coverage).
        </p>
      </div>

      <InvestorProfileButtons />
      <WeightSliders />

      {leaderboardData.length >= 3 && (
        <div className="mt-6 mb-4">
          <Button
            onClick={handleExploreTop3}
            size="lg"
            className="w-full sm:w-auto"
            disabled={addingSymbols.size > 0}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Explore Top 3 Stocks
          </Button>
        </div>
      )}

      <div className="mt-6">
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading rankings...</p>
          </div>
        )}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive">Error: {error}</p>
          </div>
        )}
        {!isLoading && !error && leaderboardData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No rankings available.</p>
          </div>
        )}
        {!isLoading && !error && leaderboardData.length > 0 && (
          <div className="bg-card border rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[50px_1fr_120px_140px] gap-4 px-4 py-3 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div>#</div>
              <div>Name</div>
              <div className="text-right">Score</div>
              <div className="text-right">Action</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-border">
              {leaderboardData.map((item: LeaderboardEntry, index: number) => {
                const isTop3 = index < 3;
                const isTop10 = index < 10;
                const isAdding = addingSymbols.has(item.symbol);
                const profile = profileData[item.symbol];
                const companyName = profile?.company_name || null;
                const logoUrl = profile?.image || null;

                return (
                  <div
                    key={item.symbol}
                    className={cn(
                      "grid grid-cols-[50px_1fr_120px_140px] gap-4 px-4 py-3 hover:bg-muted/30 transition-colors",
                      isTop3 && "bg-primary/5"
                    )}
                  >
                    {/* Rank Number */}
                    <div className="flex items-center">
                      <span className={cn(
                        "text-sm font-semibold",
                        isTop3 && "text-primary",
                        !isTop3 && isTop10 && "text-primary/70",
                        !isTop10 && "text-muted-foreground"
                      )}>
                        {item.rank}
                      </span>
                    </div>

                    {/* Name with Logo */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Logo Circle */}
                      <div className="relative w-10 h-10 rounded-full bg-muted shrink-0 overflow-hidden border border-border/50">
                        {logoUrl ? (
                          // Use API route for images (works with Next.js Image optimization)
                          <Image
                            src={createSecureImageUrl(logoUrl)}
                            alt={companyName || item.symbol}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              // Hide image on error, show fallback
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                            {item.symbol.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Company Name and Symbol */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/symbol/${item.symbol}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-base truncate hover:text-primary transition-colors"
                            title={`View detailed analysis for ${item.symbol}`}
                          >
                            {companyName ? (
                              <>
                                {companyName} <span className="text-muted-foreground font-normal">({item.symbol})</span>
                              </>
                            ) : (
                              item.symbol
                            )}
                          </Link>
                          {isTop3 && (
                            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex items-center justify-end">
                      <span className="font-semibold text-sm">
                        {item.composite_score !== null && item.composite_score !== undefined
                          ? item.composite_score.toFixed(2)
                          : "—"}
                      </span>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center justify-end">
                      <Button
                        onClick={() => handleAddToWorkspace(item.symbol)}
                        disabled={isAdding || !user}
                        size="sm"
                        variant={isTop3 ? "default" : "outline"}
                        className="whitespace-nowrap"
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}