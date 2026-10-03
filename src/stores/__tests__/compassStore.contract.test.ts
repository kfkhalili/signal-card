import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { useLeaderboardStore } from "../compassStore";
import { compassLeaderboardFixture } from "../../test-fixtures/compassLeaderboard";

const weights = {
  value: 0.2,
  growth: 0.2,
  profitability: 0.2,
  income: 0.1,
  health: 0.1,
  revenue: 0.1,
  sentiment: 0.05,
  buyback: 0.05,
};

describe("Compass leaderboard client contract", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLeaderboardStore.setState({
      weights,
      industryFilters: [],
      exchangeFilters: [],
      leaderboardData: [],
      isLoading: false,
      error: null,
    });
  });

  it("uses the stable RPC and preserves returned ordering and null values", async () => {
    const rpc = jest.fn(async () => ({
      data: compassLeaderboardFixture,
      error: null,
    }));

    useLeaderboardStore.setState({
      industryFilters: ["Software"],
      exchangeFilters: ["NASDAQ"],
    });

    await useLeaderboardStore
      .getState()
      .actions.fetchLeaderboard({ rpc } as never);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("get_weighted_leaderboard", {
      weights,
      p_industries: ["Software"],
      p_exchanges: ["NASDAQ"],
    });
    expect(useLeaderboardStore.getState().leaderboardData).toEqual(
      compassLeaderboardFixture
    );
    expect(
      useLeaderboardStore.getState().leaderboardData.map(({ symbol }) => symbol)
    ).toEqual(["ALPHA", "BETA"]);
    expect(useLeaderboardStore.getState().leaderboardData[1].peg_rank).toBeNull();
  });

  it("sends empty filters as null without changing the weights", async () => {
    const rpc = jest.fn(async () => ({ data: [], error: null }));

    await useLeaderboardStore
      .getState()
      .actions.fetchLeaderboard({ rpc } as never);

    expect(rpc).toHaveBeenCalledWith("get_weighted_leaderboard", {
      weights,
      p_industries: null,
      p_exchanges: null,
    });
    expect(useLeaderboardStore.getState()).toMatchObject({
      leaderboardData: [],
      isLoading: false,
      error: null,
    });
  });
});
