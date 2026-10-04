import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { compassLeaderboardFixture } from "../../../test-fixtures/compassLeaderboard";

const mockUseAuth = jest.fn();
const mockUseCompassFreshness = jest.fn();
const mockUseLeaderboardStore = jest.fn();
const mockPush = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/hooks/useCompassFreshness", () => ({
  useCompassFreshness: () => mockUseCompassFreshness(),
}));

jest.mock("@/stores/compassStore", () => ({
  useLeaderboardStore: () => mockUseLeaderboardStore(),
}));

jest.mock("@/hooks/useAddCardToWorkspace", () => ({
  useAddCardToWorkspace: () => ({
    addCard: jest.fn(),
    addCards: jest.fn(),
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("use-debounce", () => ({
  useDebounce: <T,>(value: T) => [value],
}));

jest.mock("lucide-react", () => ({
  PlusCircle: () => null,
  Sparkles: () => null,
  TrendingUp: () => null,
  Loader2: () => null,
  Filter: () => null,
  Check: () => null,
  ChevronsUpDown: () => null,
  X: () => null,
  Search: () => null,
  Clock: () => null,
}));

// Import after module isolation so Jest never evaluates lucide-react's ESM build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CompassPage = require("../page").default as typeof import("../page").default;

const actions = {
  setWeights: jest.fn(),
  setIndustryFilters: jest.fn(),
  setExchangeFilters: jest.fn(),
  fetchLeaderboard: jest.fn(),
};

const baseState = {
  weights: {
    value: 0.12,
    growth: 0.12,
    profitability: 0.12,
    income: 0.12,
    health: 0.13,
    revenue: 0.13,
    sentiment: 0.13,
    buyback: 0.13,
  },
  industryFilters: [],
  exchangeFilters: [],
  leaderboardData: compassLeaderboardFixture,
  isLoading: false,
  error: null,
  actions,
};

describe("Compass page presentation contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      supabase: null,
      user: { id: "fixture-user" },
      isLoading: false,
    });
    mockUseCompassFreshness.mockReturnValue({
      data: "2026-10-03T06:00:00Z",
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    mockUseLeaderboardStore.mockReturnValue(baseState);
  });

  it("renders returned companies in order without exposing composite scores", () => {
    render(<CompassPage />);

    const companyLinks = screen.getAllByTitle(/View detailed analysis for/);
    expect(companyLinks.map((link) => link.textContent)).toEqual([
      "ALPHA",
      "BETA",
    ]);
    expect(screen.queryByText("84.44")).toBeNull();
    expect(screen.getAllByText(/—/).length).toBeGreaterThan(0);
  });

  it("presents the legacy peg_rank field as Growth", () => {
    render(<CompassPage />);

    expect(screen.getByText("Growth: 7")).toBeTruthy();
    expect(screen.queryByText(/PEG:/)).toBeNull();
    expect(screen.queryByText(/Growth v2/)).toBeNull();
  });

  it("explains pillar ranks above populated results", () => {
    render(<CompassPage />);

    expect(
      screen.getByText(
        "Pillar ranks show how each company compares with other eligible companies. Lower is better."
      )
    ).toBeTruthy();
  });

  it.each([
    [
      "loading",
      { ...baseState, leaderboardData: [], isLoading: true },
      "Loading rankings...",
    ],
    [
      "empty",
      { ...baseState, leaderboardData: [] },
      "No rankings available.",
    ],
    [
      "RPC error",
      { ...baseState, leaderboardData: [], error: "Fixture failure" },
      "Error: Fixture failure",
    ],
  ])("preserves the %s state copy", (_name, state, expectedCopy) => {
    mockUseLeaderboardStore.mockReturnValue(state);

    render(<CompassPage />);

    expect(screen.getByText(expectedCopy)).toBeTruthy();
    expect(screen.queryByText(/Pillar ranks show how/)).toBeNull();
  });

  it.each([
    [
      "loading",
      { data: null, isLoading: true, isFetching: false, isError: false },
      "Checking for updates...",
    ],
    [
      "error",
      { data: null, isLoading: false, isFetching: false, isError: true },
      "Last updated status unavailable",
    ],
    [
      "unknown",
      { data: null, isLoading: false, isFetching: false, isError: false },
      "Update time unknown",
    ],
  ])("preserves the freshness %s copy", (_name, freshness, expectedCopy) => {
    mockUseCompassFreshness.mockReturnValue(freshness);

    render(<CompassPage />);

    expect(screen.getByText(expectedCopy)).toBeTruthy();
  });
});
