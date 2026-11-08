/** @jest-environment node */
import { spawnSync } from "node:child_process";
import { BOARD_COLUMNS, assertColumns, boardLines, cardsToSort, readBoard, type BoardPage } from "../lib/board.mjs";

const boardScript = `${process.cwd()}/scripts/board.mjs`;

const page = (hasNextPage: boolean, endCursor: string | null, numbers: readonly number[], name = "Ready"): BoardPage => ({
  pageInfo: { hasNextPage, endCursor },
  nodes: numbers.map((number) => ({ id: `item-${String(number)}`, fieldValueByName: { name }, content: { number, title: `Card ${String(number)}` } })),
});

describe("reading the board", () => {
  it("reads every page, in the board's order, past any fixed number of cards", () => {
    const asked: (string | null)[] = [];
    const pages = new Map<string, BoardPage>([
      ["first", page(true, "a", Array.from({ length: 100 }, (_, i) => i + 1))],
      ["a", page(true, "b", Array.from({ length: 100 }, (_, i) => i + 101))],
      ["b", page(false, null, [201, 202])],
    ]);
    const cards = readBoard((after) => {
      asked.push(after);
      const read = pages.get(after ?? "first");
      if (read === undefined) throw new Error("no such page");
      return read;
    });
    expect(asked).toEqual([null, "a", "b"]);
    expect(cards).toHaveLength(202);
    expect(cards.map((card) => card.number).slice(-3)).toEqual([200, 201, 202]);
    expect(cards[201]).toEqual({ id: "item-202", number: 202, column: "Ready", title: "Card 202" });
  });

  it("stops with the error when a page fails, so nobody acts on half a board", () => {
    expect(() => readBoard((after) => {
      if (after === null) return page(true, "a", [1]);
      throw new Error("rate limit");
    })).toThrow("rate limit");
  });

  it("stops when GitHub says there is more but gives no way on", () => {
    expect(() => readBoard(() => page(true, null, [1]))).toThrow("no cursor");
  });

  it("keeps a card with no column and a note with no number, and lists them", () => {
    const cards = readBoard(() => ({
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: [
        { id: "a", fieldValueByName: null, content: { number: 7, title: "No column" } },
        { id: "b", fieldValueByName: { name: "Inbox" }, content: {} },
      ],
    }));
    expect(boardLines(cards, [])).toEqual(["a\t7\t\tNo column", "b\t-\tInbox\t"]);
  });
});

describe("listing the board", () => {
  const cards = readBoard(() => ({
    pageInfo: { hasNextPage: false, endCursor: null },
    nodes: [...page(false, null, [1], "Review").nodes, ...page(false, null, [2], "Ready").nodes, ...page(false, null, [3], "In progress").nodes, ...page(false, null, [4], "Ready").nodes],
  }));

  it("lists every card with no column named: item id, number, column, title", () => {
    expect(boardLines(cards, [])).toEqual([
      "item-1\t1\tReview\tCard 1",
      "item-2\t2\tReady\tCard 2",
      "item-3\t3\tIn progress\tCard 3",
      "item-4\t4\tReady\tCard 4",
    ]);
  });

  it("lists only the columns named, top of the board first", () => {
    expect(boardLines(cards, ["Ready"])).toEqual(["item-2\t2\tReady\tCard 2", "item-4\t4\tReady\tCard 4"]);
    expect(boardLines(cards, ["In progress", "Review"])).toEqual(["item-1\t1\tReview\tCard 1", "item-3\t3\tIn progress\tCard 3"]);
  });

  it("refuses a column the board doesn't have, rather than saying it is empty", () => {
    expect(() => { assertColumns(["Reveiw"]); }).toThrow(`"Reveiw" is not a column: ${BOARD_COLUMNS.join(", ")}`);
    expect(() => { assertColumns(["In", "progress"]); }).toThrow('"In" is not a column');
    expect(() => { assertColumns(BOARD_COLUMNS); }).not.toThrow();
  });

  it("refuses it before reading anything, so a typo says so even when the allowance has run out", () => {
    // No `gh` on this PATH: a read would fail with a different message.
    const run = spawnSync(process.execPath, [boardScript, "Reveiw"], { encoding: "utf8", env: { PATH: "", NODE_ENV: "test" } });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('"Reveiw" is not a column');
  });

  it("says why, and fails, when a page can't be read", () => {
    const run = spawnSync(process.execPath, [boardScript, "Ready"], { encoding: "utf8", env: { PATH: "", NODE_ENV: "test" } });
    expect(run.status).toBe(1);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain("board: ");
  });
});

describe("cards waiting to be sorted", () => {
  it("are those in the Inbox and those with no column, and no others", () => {
    const cards = [
      { id: "a", number: 1, column: "Inbox", title: "new" },
      { id: "b", number: 2, column: null, title: "added without a column" },
      { id: "c", number: 3, column: "Ready", title: "sorted" },
    ];
    expect(cardsToSort(cards).map((card) => card.number)).toEqual([1, 2]);
  });
});
