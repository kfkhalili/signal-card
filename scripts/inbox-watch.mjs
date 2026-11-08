#!/usr/bin/env node
// scripts/inbox-watch.mjs
//
// Waits for a card to sort: reads the board every few minutes and exits as soon
// as one is in the Inbox or on the board with no column, printing them, so a
// product owner run started in the background is woken to sort it (the
// product-owner-run skill, "Watch the Inbox"). Gives up quietly after 12 hours.
//
//   node scripts/inbox-watch.mjs [minutes between reads, default 5]

import { execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { boardLines, boardQuery, cardsToSort, readBoard } from "./lib/board.mjs";
import { loadBoard } from "./lib/board-config.mjs";

const minutes = Number(process.argv[2] ?? 5);
const query = boardQuery(loadBoard());
const readPage = (after) => {
  const args = ["api", "graphql", "-f", `query=${query}`, ...(after === null ? [] : ["-f", `after=${after}`])];
  return JSON.parse(execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], timeout: 30_000 })).data.repositoryOwner.projectV2.items;
};

const until = Date.now() + 12 * 60 * 60 * 1000;
while (Date.now() < until) {
  try {
    const waiting = cardsToSort(readBoard(readPage));
    if (waiting.length > 0) {
      console.log(boardLines(waiting, []).join("\n"));
      process.exit(0);
    }
  } catch (error) {
    // A failed read is tried again at the next turn: GitHub hiccups, the watch goes on.
    console.error(`inbox-watch: ${error instanceof Error ? error.message : String(error)}`);
  }
  await sleep(minutes * 60 * 1000);
}
console.log("No card came in for 12 hours.");
