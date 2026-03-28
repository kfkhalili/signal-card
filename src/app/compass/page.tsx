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
import { PlusCircle, Sparkles, TrendingUp, Loader2, Filter, Check, ChevronsUpDown, X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, createSecureImageUrl } from "@/lib/utils";
import { fromPromise } from "neverthrow";

type Pillar = "value" | "growth" | "profitability" | "income" | "health"| "revenue" | "sentiment" | "buyback";
type Weights = Record<Pillar, number>;

const investorProfiles: { name: string; weights: Weights }[] = [
  {
    name: "Value Investor",
    weights: { value: 0.4, growth: 0.1, profitability: 0.2, income: 0.0, health: 0.1, revenue: 0.1, sentiment: 0.1, buyback: 0.0 },
  },
  {
    name: "Growth Investor",
    weights: { value: 0.05, growth: 0.45, profitability: 0.35, income: 0.0, health: 0.15, revenue: 0.0, sentiment: 0.0, buyback: 0.0 },
  },
  {
    name: "Smart Growth", // Formerly "GARP"
    weights: { value: 0.05, growth: 0.4, profitability: 0.25, income: 0.0, health: 0.1, revenue: 0.0, sentiment: 0.1, buyback: 0.1 },
  },
  {
    name: "Income Investor",
    weights: { value: 0.0, growth: 0.0, profitability: 0.3, income: 0.5, health: 0.2, revenue: 0.0, sentiment: 0.0, buyback: 0.0 },
  },
  {
    name: "Quality Investing",
    weights: { value: 0.1, growth: 0.0, profitability: 0.4, income: 0.1, health: 0.3, revenue: 0.0, sentiment: 0.05, buyback: 0.05 },
  },
  {
    name: "Defensive",
    weights: { value: 0.2, growth: 0.0, profitability: 0.2, income: 0.0, health: 0.3, revenue: 0.0, sentiment: 0.2, buyback: 0.1 },
  },
  {
    name: "Balanced",
    weights: { value: 0.12, growth: 0.12, profitability: 0.12, income: 0.12, health: 0.13, revenue: 0.13, sentiment: 0.13, buyback: 0.13 },
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
    value: "Value",
    growth: "Growth",
    profitability: "Profitability",
    income: "Income",
    health: "Health",
    revenue: "Revenue",
    sentiment: "Sentiment",
    buyback: "Buybacks",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-4 border rounded-lg">
      {Object.entries(weights).map(([pillar, value]) => (
        <div key={pillar} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-medium text-sm">{pillarLabels[pillar as Pillar]}</label>
            <span className="text-sm font-medium tabular-nums w-10 text-right text-muted-foreground">
              {(value * 100).toFixed(0)}%
            </span>
          </div>
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
            className="w-full cursor-pointer"
          />
        </div>
      ))}
    </div>
  );
};

interface ProfileData {
  company_name: string | null;
  image: string | null;
  industry: string | null;
}

function IndustryMultiSelect({
  availableIndustries,
  selectedIndustries,
  onChange,
}: {
  availableIndustries: string[];
  selectedIndustries: string[];
  onChange: (industries: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredIndustries = availableIndustries.filter((i) =>
    i.toLowerCase().includes(search.toLowerCase())
  );

  const toggleIndustry = (industry: string) => {
    if (selectedIndustries.includes(industry)) {
      onChange(selectedIndustries.filter((i) => i !== industry));
    } else {
      onChange([...selectedIndustries, industry]);
    }
  };

  const clearAll = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const isAllSelected = 
    selectedIndustries.length > 0 && 
    selectedIndustries.length === availableIndustries.length;

  const toggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([...availableIndustries]);
    }
  };

  return (
    <div className="relative inline-block w-full md:w-auto">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className="w-full md:w-[320px] justify-between h-auto min-h-10 py-2 border-dashed z-50 relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center flex-wrap gap-1">
          <Filter className="mr-2 h-4 w-4 shrink-0" />
          {selectedIndustries.length === 0 ? (
            <span className="font-medium">All Industries</span>
          ) : (
            <>
              <span className="font-medium mr-1">Industries</span>
              <div className="hidden space-x-1 lg:flex flex-wrap gap-y-1">
                {selectedIndustries.length > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedIndustries.length} selected
                  </Badge>
                ) : (
                  selectedIndustries.map((option) => (
                    <Badge variant="secondary" key={option} className="rounded-sm px-1 font-normal">
                      {option}
                    </Badge>
                  ))
                )}
              </div>
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selectedIndustries.length}
              </Badge>
            </>
          )}
        </div>
        <div className="flex items-center shrink-0 ml-2">
          {selectedIndustries.length > 0 && (
            <div
              role="button"
              tabIndex={0}
              className="mr-1 hover:bg-muted p-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={clearAll}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  clearAll(e);
                }
              }}
            >
              <X className="h-4 w-4 shrink-0" />
            </div>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </Button>

      {isOpen && (
        <>
          {/* INVISIBLE BACKDROP CATCHES CLICKS OUTSIDE THE DROPDOWN */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div 
            className="fixed inset-0 z-[90]" 
            onClick={() => setIsOpen(false)} 
          />
          
          <div className="absolute top-full mt-2 w-full md:w-[360px] md:right-0 z-[100] rounded-md border bg-popover text-popover-foreground shadow-lg outline-none animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Search industries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto p-1 relative z-[100]">
            {availableIndustries.length > 0 && (
              <button
                type="button"
                className={cn(
                  "w-full relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground mb-1 border-b pb-2 text-left",
                  isAllSelected && "bg-accent/50 text-accent-foreground font-medium"
                )}
                onClick={toggleAll}
              >
                <div className={cn(
                  "mr-3 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-colors",
                  isAllSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                )}>
                  {isAllSelected && <Check className="h-3 w-3" />}
                </div>
                {isAllSelected ? "Unselect All" : "Select All"}
              </button>
            )}

              {filteredIndustries.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No industries found.</p>
              ) : (
                filteredIndustries.map((industry) => {
                  const isSelected = selectedIndustries.includes(industry);
                  return (
                    <button
                      type="button"
                      key={industry}
                      className={cn(
                        "w-full relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground text-left",
                        isSelected && "bg-accent/50 text-accent-foreground font-medium"
                      )}
                      onClick={() => toggleIndustry(industry)}
                    >
                      <div className={cn(
                        "mr-3 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-colors",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      {industry}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CompassPage() {
  const { supabase, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const {
    weights,
    industryFilters,
    leaderboardData,
    isLoading,
    error,
    actions,
  } = useLeaderboardStore();
  const [debouncedWeights] = useDebounce(weights, 500);
  const { addCard, addCards } = useAddCardToWorkspace();
  const [addingSymbols, setAddingSymbols] = useState<Set<string>>(new Set());
  const [profileData, setProfileData] = useState<Record<string, ProfileData>>({});
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
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
    if (!supabase) return;
    const fetchIndustries = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("industry")
        .not("industry", "is", null);
        
      if (data && !error) {
        const uniqueIndustries = Array.from(
          new Set(
            data
              .map((item) => item.industry?.trim())
              .filter(Boolean) // Drops empty strings, undefined, and null
          )
        ).sort();
        setAvailableIndustries(uniqueIndustries as string[]);
      }
    };
    fetchIndustries();
  }, [supabase]);

  useEffect(() => {
    if (supabase) {
      actions.fetchLeaderboard(supabase);
    }
  }, [debouncedWeights, industryFilters, supabase, actions]);

  // Fetch profile data for all symbols in leaderboard
  useEffect(() => {
    if (!supabase || leaderboardData.length === 0) return;

    const fetchProfiles = async () => {
      const symbols = leaderboardData.map((item) => item.symbol);

      const profileResult = await fromPromise(
        supabase
          .from("profiles")
          .select("symbol, company_name, image, industry")
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
                industry: profile.industry,
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
      <div className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Market Compass</h1>
          <p className="text-muted-foreground">
            Discover stocks ranked by your investment style. Adjust the weights for Value, Growth, Profitability, Income, and Health to find stocks that match your preferences.
          </p>
        </div>
        
        <div className="w-full md:w-auto z-[90]">
          <IndustryMultiSelect
            availableIndustries={availableIndustries}
            selectedIndustries={industryFilters}
            onChange={(selected) => actions.setIndustryFilters(selected)}
          />
        </div>
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
                      "grid grid-cols-[50px_1fr_120px_140px] gap-4 px-4 py-3 hover:bg-muted/30 transition-colors items-center",
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
                            {companyName || item.symbol}
                          </Link>
                          {isTop3 && (
                            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                          )}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground mt-0.5 truncate">
                            <span className="font-medium tracking-wider">{item.symbol}</span>
                            {profile?.industry && (
                              <>
                                <span className="mx-1.5 opacity-40">•</span>
                                <span className="truncate" title={profile.industry}>
                                  {profile.industry}
                                </span>
                              </>
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