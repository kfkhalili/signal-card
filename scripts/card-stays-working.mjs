#!/usr/bin/env node
// A session working a card stays working until the card has moved (owner,
// 31 Oct: "In progress" means something is working on it). Claude Code runs
// this on every tool call and whenever a session tries to stop
// (`.claude/settings.json`). A session claims its card by running
// `echo "work-card claim #<n>"` (`work-card` step 1); a session that never
// claimed one is left alone.
//
// - PostToolUse records the claim and the time of the session's latest tool
//   call, in `~/.tickered/card-sessions/<session>.json`. The product owner run
//   reads those times to find a card nothing is working on any more.
// - Stop keeps the session going while its card is still In progress. It
//   leaves by moving the card: to Review when finished, to Yours with one
//   question when it can't finish. The Stop button doesn't run this hook, and
//   Claude Code ends a turn after eight blocks in a row with no tool call.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadBoard } from "./lib/board-config.mjs";

const IN_PROGRESS = "In progress";
/** The start of the command, so a command that only mentions the line claims nothing. */
const CLAIM = /^\s*echo "work-card claim #(\d+)"\s*(?:;|&&|\n|$)/;
const RECORDS = join(homedir(), ".tickered", "card-sessions");

const recordPath = (session) => join(RECORDS, `${session.replace(/[^\w-]/g, "_")}.json`);

const readRecord = (session) => {
  try {
    return JSON.parse(readFileSync(recordPath(session), "utf8"));
  } catch {
    return null;
  }
};

const writeRecord = (session, card) => {
  mkdirSync(RECORDS, { recursive: true });
  writeFileSync(recordPath(session), `${JSON.stringify({ card, session, updatedAt: new Date().toISOString() })}\n`);
};

/** The card's column on the board, or null when the board can't be read. */
const columnOf = (card) => {
  try {
    const { repo, projectNumber } = loadBoard();
    const [owner, name] = repo.split("/");
    const query = `{repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(name)}){issue(number:${card}){projectItems(first:5){nodes{project{number} fieldValueByName(name:"Status"){... on ProjectV2ItemFieldSingleSelectValue{name}}}}}}}`;
    const out = execFileSync("gh", ["api", "graphql", "-f", `query=${query}`, "--jq", `.data.repository.issue.projectItems.nodes[] | select(.project.number == ${String(projectNumber)}) | .fieldValueByName.name`], { encoding: "utf8", timeout: 20_000, stdio: ["ignore", "pipe", "ignore"] });
    return out.trim();
  } catch {
    return null;
  }
};

const onToolUse = (input) => {
  const command = typeof input.tool_input?.command === "string" ? input.tool_input.command : "";
  const claim = input.tool_name === "Bash" ? CLAIM.exec(command) : null;
  if (claim !== null) {
    writeRecord(input.session_id, Number(claim[1]));
    return;
  }
  const record = readRecord(input.session_id);
  if (record !== null) writeRecord(input.session_id, record.card);
};

const onStop = (input) => {
  const record = readRecord(input.session_id);
  if (record === null || columnOf(record.card) !== IN_PROGRESS) return;
  const reason = `#${record.card} is still In progress, so keep working on it. Finish it and move it to Review, or stop as work-card's hard rule 3 says and move it to Yours with one question. If you are waiting for something, wait in the foreground and say what for.`;
  process.stdout.write(`${JSON.stringify({ decision: "block", reason })}\n`);
};

const input = JSON.parse(readFileSync(0, "utf8"));
if (input.hook_event_name === "Stop") onStop(input);
else if (input.hook_event_name === "PostToolUse") onToolUse(input);
