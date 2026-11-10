#!/usr/bin/env node
// Lists the work board (`.claude/board.json`): `node scripts/board.mjs [column…]`, a line per
// card, top of the board first: item id, number, column, title, tab-separated.
// Quote a column with a space: `node scripts/board.mjs "In progress" Review`.
import { execFileSync } from "node:child_process";
import { assertColumns, boardLines, boardQuery, readBoard } from "./lib/board.mjs";
import { loadBoard } from "./lib/board-config.mjs";

const readPage = (after) => {
  const args = ["api", "graphql", "-f", `query=${boardQuery(loadBoard())}`, ...(after === null ? [] : ["-f", `after=${after}`])];
  return JSON.parse(execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], timeout: 30_000 })).data.repositoryOwner.projectV2.items;
};

try {
  const columns = process.argv.slice(2);
  assertColumns(columns);
  const lines = boardLines(readBoard(readPage), columns);
  if (lines.length > 0) console.log(lines.join("\n"));
} catch (error) {
  console.error(`board: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
