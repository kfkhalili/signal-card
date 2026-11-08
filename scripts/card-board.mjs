#!/usr/bin/env node
// scripts/card-board.mjs
//
// Who has which card on the work board (`.claude/board.json`), and what a card waits for
//, so neither machine touches what the other is working on.
//
//   take <n>                  put the card In progress for this machine, first thing, or
//                             say why not: it is with the other machine, another session took it
//                             a moment ago, or it waits for a card
//   block <n> --by <m> <why>  record on GitHub that card n waits for card m
//   unblock <n> --by <m>      take that link off again
//   waits <n>                 say what card n waits for; fails while it waits for anything
//   let-go <n>                take this machine's label off a card that has left play, or say
//                             why not: this machine still holds it, or something of it is only here
//   in-play                   who has what right now, and which files each card has changed
//   move <n> <column> [--top] put the card in that column, at its top with --top

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { BOARD_COLUMNS } from "./lib/board.mjs";
import { loadBoard } from "./lib/board-config.mjs";
import { IN_PLAY, claimCard, filesWorthComparing, letGoAnswer, machineLabel, machineOf, machineWith, machineWords, releaseClaim, takeAnswer, waitingWhy } from "./lib/card-board.mjs";

const BOARD = loadBoard();
const REPO = BOARD.repo;
const [REPO_OWNER, REPO_NAME] = REPO.split("/");
const HELD = ["Ready", "Yours"];
const BOARD_PAGE = `query($cursor:String){node(id:"${BOARD.projectId}"){... on ProjectV2{items(first:100,after:$cursor){pageInfo{hasNextPage endCursor} nodes{fieldValueByName(name:"Status"){... on ProjectV2ItemFieldSingleSelectValue{name}} content{... on Issue{number title labels(first:20){nodes{name}}}}}}}}}`;
const BOT = "<!-- tickered-bot -->";

const machine = machineOf(process.platform);
const run = (command, args) => execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const gh = (...args) => run("gh", args);
const git = (args) => run("git", args);

const CARD_FIELDS = `number state labels(first:20){nodes{name}} projectItems(first:5){nodes{id project{number} fieldValueByName(name:"Status"){... on ProjectV2ItemFieldSingleSelectValue{name}}}}`;

const boardItem = (node) => node.projectItems.nodes.find((item) => item.project.number === BOARD.projectNumber);
const toCard = (node) => ({
  number: node.number,
  state: node.state,
  column: boardItem(node)?.fieldValueByName?.name ?? "not on the board",
  labels: node.labels.nodes.map((label) => label.name),
});

const readCard = (number) => {
  const query = `{repository(owner:${JSON.stringify(REPO_OWNER)},name:${JSON.stringify(REPO_NAME)}){issue(number:${String(number)}){databaseId url title ${CARD_FIELDS} blockedBy(first:20){nodes{${CARD_FIELDS}}}}}}`;
  const node = JSON.parse(gh("api", "graphql", "-f", `query=${query}`)).data.repository.issue;
  return { ...toCard(node), title: node.title, blockers: node.blockedBy.nodes.map(toCard), databaseId: node.databaseId, url: node.url, itemId: boardItem(node)?.id ?? null };
};

/** Every card on the board. A page that fails stops here, so nobody acts on half a board. */
const readBoard = (cursor = null) => {
  const { items } = JSON.parse(gh("api", "graphql", "-f", `query=${BOARD_PAGE}`, ...(cursor === null ? [] : ["-f", `cursor=${cursor}`]))).data.node;
  return [...items.nodes, ...(items.pageInfo.hasNextPage ? readBoard(items.pageInfo.endCursor) : [])];
};

/** Puts the card in the column, adding it to the board first if it isn't on it; at the column's top with `top`. */
const moveCard = (card, column, top = false) => {
  const itemId = card.itemId ?? JSON.parse(gh("project", "item-add", String(BOARD.projectNumber), "--owner", BOARD.projectOwner, "--url", card.url, "--format", "json")).id;
  gh("project", "item-edit", "--id", itemId, "--project-id", BOARD.projectId, "--field-id", BOARD.statusFieldId, "--single-select-option-id", BOARD.columns[column]);
  if (top) gh("api", "graphql", "-f", "query=mutation($p:ID!,$i:ID!){updateProjectV2ItemPosition(input:{projectId:$p,itemId:$i}){clientMutationId}}", "-f", `p=${BOARD.projectId}`, "-f", `i=${itemId}`);
};

const hasRef = (ref) => {
  try {
    run("git", ["rev-parse", "--verify", "--quiet", ref]);
    return true;
  } catch {
    return false;
  }
};

/**
 * The files a card's branch has changed. This machine's card is read against its
 * own `main`, or what it has landed reads as this card's; the other machine's
 * only from GitHub, where this machine's old copy can't hide what it added.
 */
const branchFiles = (number, holder) => {
  const name = `tree/card-${String(number)}`;
  const [base, ref] = holder === machine && hasRef(name) ? ["main", name] : ["origin/main", `origin/${name}`];
  if (!hasRef(ref)) return null;
  return filesWorthComparing(run("git", ["diff", "--name-only", `${base}...${ref}`]).split("\n").filter((file) => file !== ""));
};

const printInPlay = (leaveOut) => {
  try {
    run("git", ["fetch", "-q", "--prune", "origin"]);
  } catch {
    console.log("GitHub could not be reached, so the files below may be out of date.");
  }
  const cards = readBoard()
    .map((item) => ({ ...item.content, column: item.fieldValueByName?.name }))
    .map((card) => ({ ...card, labels: (card.labels?.nodes ?? []).map((label) => label.name) }))
    .filter((card) => card.title !== undefined && !card.title.startsWith("Release:") && card.number !== leaveOut)
    // A card waiting in Ready or Yours has work on its branch once that is on GitHub, or while its label says it is only on one machine.
    .filter((card) => IN_PLAY.includes(card.column) || (HELD.includes(card.column) && (machineWith(card.labels) !== null || hasRef(`origin/tree/card-${String(card.number)}`))));
  console.log(cards.length === 0 ? "Nothing else is in play." : "In play:");
  for (const card of cards) {
    const files = branchFiles(card.number, machineWith(card.labels));
    console.log(`#${String(card.number)} ${card.column}, ${machineWords(card.labels)}: ${card.title}`);
    console.log(files === null ? "  not pushed yet, so its files can't be seen from here" : `  ${files.length === 0 ? "only shared files so far" : files.join(", ")}`);
  }
};

const count = (range) => Number(run("git", ["rev-list", "--count", range]).trim());

/** The folder of the worktree that has the branch checked out, or null. */
const worktreeOf = (branch) => {
  const found = run("git", ["worktree", "list", "--porcelain"])
    .split("\n\n")
    .map((block) => block.split("\n"))
    .find((lines) => lines.includes(`branch refs/heads/${branch}`));
  const folder = found === undefined ? null : found[0].replace(/^worktree /, "");
  // A worktree whose folder was removed by hand holds nothing.
  return folder !== null && existsSync(folder) ? folder : null;
};

/** What of the card is on this machine and not on GitHub, where the other machine would carry it on from. */
const onlyHere = (number) => {
  const name = `tree/card-${String(number)}`;
  const local = hasRef(name);
  const pushed = hasRef(`origin/${name}`);
  const found = [];
  if (local && count(pushed ? `origin/${name}..${name}` : `main..${name}`) > 0) found.push(pushed ? "commits on its branch that GitHub doesn't have" : "a branch that isn't on GitHub");
  const branch = local ? name : pushed ? `origin/${name}` : null;
  // A branch with no commits of its own rests on nothing worth handing over.
  if (branch !== null && count(`main..${branch}`) > 0 && count(`origin/main..${run("git", ["merge-base", "main", branch]).trim()}`) > 0) found.push("a branch resting on work this machine landed that isn't live yet");
  const folder = worktreeOf(name);
  if (folder !== null && run("git", ["-C", folder, "status", "--porcelain"]).trim() !== "") found.push("changes in its folder that aren't committed");
  return found;
};

const letGo = (number) => {
  // A cloud session runs on Linux but holds none of the Ubuntu computer's work, so it can't tell what is only there.
  if (process.env.CLAUDE_CODE_REMOTE === "true") {
    console.error("A cloud session lets go of no card.");
    process.exit(1);
  }
  // Without a fresh look at GitHub, what is only here can't be told.
  run("git", ["fetch", "-q", "--prune", "origin"]);
  const answer = letGoAnswer(readCard(number), machine, () => onlyHere(number));
  if (answer.kind === "refused") {
    console.error(answer.why);
    process.exit(1);
  }
  // Taken again while the branch was read: it is in play once more, so the label stays.
  if (answer.kind === "let-go" && IN_PLAY.includes(readCard(number).column)) {
    console.error(`#${String(number)} was taken again meanwhile, so this machine still holds it.`);
    process.exit(1);
  }
  if (answer.kind === "let-go") {
    gh("issue", "edit", String(number), "--repo", REPO, "--remove-label", machineLabel(machine));
    releaseClaim(number, git);
  }
  console.log(answer.kind === "free" ? answer.why : `#${String(number)} is open to either machine now.`);
};

const take = (number) => {
  // A cloud session runs on Linux but is neither machine, and what it commits is unsigned.
  if (process.env.CLAUDE_CODE_REMOTE === "true") {
    console.error("A cloud session takes no card.");
    process.exit(1);
  }
  const card = readCard(number);
  const answer = takeAnswer(card, machine);
  if (answer.kind === "refused") {
    console.error(answer.why);
    process.exit(1);
  }
  if (answer.first) {
    // Only one session may go on from here, on either machine.
    const claim = claimCard(number, machine, git);
    if (claim.kind === "refused") {
      console.error(claim.why);
      process.exit(1);
    }
    gh("issue", "edit", String(number), "--repo", REPO, "--add-label", machineLabel(machine));
    moveCard(card, "In progress");
    gh("issue", "comment", String(number), "--repo", REPO, "--body", `Started ${new Date().toISOString().slice(0, 10)} on ${machineWords([machineLabel(machine)])}.\n\n${BOT}`);
  }
  const where = machineWords([machineLabel(machine)]);
  console.log(answer.first ? `#${String(number)} is In progress on ${where}, taken now.` : `#${String(number)} was already In progress on ${where}.`);
  // The card is taken by now, so a list that can't be read must not read as a refusal.
  try {
    printInPlay(number);
  } catch {
    console.log("What else is in play could not be read; run in-play again.");
  }
};

const block = (number, blocker, why) => {
  const { databaseId, blockers } = readCard(blocker);
  // Two cards waiting for each other would wait for ever: the one already waited for goes on.
  if (blockers.some((card) => card.number === number)) {
    console.log(`#${String(blocker)} already waits for #${String(number)}, so #${String(number)} goes on.`);
    return;
  }
  gh("api", "-X", "POST", `repos/${REPO}/issues/${String(number)}/dependencies/blocked_by`, "-F", `issue_id=${String(databaseId)}`);
  gh("issue", "comment", String(number), "--repo", REPO, "--body", `Waits for #${String(blocker)}: ${why}\n\n${BOT}`);
  console.log(`#${String(number)} now waits for #${String(blocker)}.`);
};

const unblock = (number, blocker) => {
  gh("api", "-X", "DELETE", `repos/${REPO}/issues/${String(number)}/dependencies/blocked_by/${String(readCard(blocker).databaseId)}`);
  console.log(`#${String(number)} no longer waits for #${String(blocker)}.`);
};

const waits = (number) => {
  const why = waitingWhy(readCard(number), machine);
  console.log(why ?? `#${String(number)} waits for nothing.`);
  if (why !== null) process.exit(1);
};

const move = (number, column, top) => {
  if (!BOARD_COLUMNS.includes(column)) {
    console.error(`"${column}" is not a column: ${BOARD_COLUMNS.join(", ")}`);
    process.exit(2);
  }
  moveCard(readCard(number), column, top);
  console.log(`#${String(number)} is in ${column}${top ? ", at the top" : ""}.`);
};

const [command, first, flag, second, ...words] = process.argv.slice(2);
try {
  if (command === "take" && first !== undefined) take(Number(first));
  else if (command === "waits" && first !== undefined) waits(Number(first));
  else if (command === "let-go" && first !== undefined) letGo(Number(first));
  else if (command === "in-play") printInPlay(null);
  else if (command === "move" && first !== undefined && flag !== undefined && (second === undefined || second === "--top")) move(Number(first), flag, second === "--top");
  else if (command === "block" && first !== undefined && flag === "--by" && second !== undefined && words.length > 0) block(Number(first), Number(second), words.join(" "));
  else if (command === "unblock" && first !== undefined && flag === "--by" && second !== undefined) unblock(Number(first), Number(second));
  else {
    console.error("Usage: card-board.mjs take <n> | waits <n> | let-go <n> | block <n> --by <m> <why> | unblock <n> --by <m> | in-play | move <n> <column> [--top]");
    process.exit(2);
  }
} catch (error) {
  // GitHub could not be read or written: nothing here is a refusal.
  console.error(`GitHub did not answer as expected: ${String(error.stderr ?? error.message).trim()}`);
  process.exit(3);
}
