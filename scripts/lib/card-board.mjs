// scripts/lib/card-board.mjs
//
// Who has which card, and what a card waits for: the rules
// scripts/card-board.mjs answers with before it changes anything on the board,
// and the claim on GitHub that lets only one session take a card.

import { randomUUID } from "node:crypto";

const MACHINE_NAMES = { mac: "the Mac", ubuntu: "the Ubuntu computer" };
const NOT_TO_TAKE = ["Landed", "Parked", "Done"];
/** The columns where one machine holds a card. Anywhere else it carries a label only while work of it is only on one machine. */
export const IN_PLAY = ["In progress", "Review", "Landed"];

/** The files nearly every card changes. A clash in one is settled in seconds, so sharing them is no reason to wait. */
const SHARED_FILE = /^(?:CLAUDE\.md|pnpm-lock\.yaml|docs\/.*|cockpit\/.*|\.claude\/.*|.*\.md)$/;

export const machineOf = (platform) => (platform === "darwin" ? "mac" : "ubuntu");

export const machineLabel = (machine) => `machine: ${machine}`;

export const machineWith = (labels) => Object.keys(MACHINE_NAMES).find((machine) => labels.includes(machineLabel(machine))) ?? null;

export const machineWords = (labels) => {
  const machine = machineWith(labels);
  return machine === null ? "no machine yet" : MACHINE_NAMES[machine];
};

/** A closed card's work is on GitHub, where both machines see it; a card landed here is on this machine's `main`. */
const isDoneFor = (blocker, machine) =>
  blocker.state === "CLOSED" || (blocker.column === "Landed" && blocker.labels.includes(machineLabel(machine)));

/** What the card waits for, in words, or null when it waits for nothing. */
export const waitingWhy = (card, machine) => {
  const waitingOn = card.blockers.filter((blocker) => !isDoneFor(blocker, machine));
  if (waitingOn.length === 0) return null;
  const listed = waitingOn.map((blocker) => `#${String(blocker.number)} (${blocker.column}, ${machineWords(blocker.labels)})`);
  return `#${String(card.number)} waits for ${listed.join(", ")}.`;
};

/**
 * May this machine take the card, and is it the first to? Nothing is changed by
 * asking. A card it already has In progress is never refused: whatever the card
 * gained since, its session carries on.
 */
export const takeAnswer = (card, machine) => {
  const name = `#${String(card.number)}`;
  if (card.state === "CLOSED") return { kind: "refused", why: `${name} is closed.` };
  const holder = machineWith(card.labels);
  if (holder !== null && holder !== machine) return { kind: "refused", why: `${name} is with ${MACHINE_NAMES[holder]}.` };
  if (card.column === "In progress" && holder === machine) return { kind: "take", first: false };
  if (NOT_TO_TAKE.includes(card.column)) return { kind: "refused", why: `${name} is in ${card.column}.` };
  const why = waitingWhy(card, machine);
  return why === null ? { kind: "take", first: true } : { kind: "refused", why };
};

/** The cards about this machine's own `main`, which only it can carry on: its release card, and the one bringing its waiting work up to date. */
const ABOUT_MAIN = /^(?:Release:|Bring the .* waiting work up to date)/;

/**
 * May this machine take its label off the card? Only once the card has left play
 * and nothing of it is only here, so either machine can carry it on (owner, 3 Nov).
 * `onlyHere` says, in words, what of the card is on this machine and not on GitHub;
 * it is asked last, once the card is this machine's and has left play.
 */
export const letGoAnswer = (card, machine, onlyHere) => {
  const name = `#${String(card.number)}`;
  const holder = machineWith(card.labels);
  if (holder === null) return { kind: "free", why: `${name} carries no machine label.` };
  if (holder !== machine) return { kind: "refused", why: `${name} is with ${MACHINE_NAMES[holder]}.` };
  if (ABOUT_MAIN.test(card.title)) return { kind: "refused", why: `${name} is about this machine's own main, so it keeps its label.` };
  if (IN_PLAY.includes(card.column)) return { kind: "refused", why: `${name} is ${card.column === "In progress" ? card.column : `in ${card.column}`}, so this machine still holds it.` };
  const found = onlyHere();
  if (found.length > 0) return { kind: "refused", why: `${name} keeps its label: ${found.join(", ")}.` };
  return { kind: "let-go" };
};

export const filesWorthComparing = (files) => files.filter((file) => !SHARED_FILE.test(file));

/** How long a claim stands for its own take: a take is done in seconds, so a claim older than this was left by one long over. */
const CLAIM_STANDS_MS = 5 * 60 * 1000;

const claimRef = (number) => `refs/claims/card-${String(number)}`;

/** The claim on GitHub, as the commit it names, or null. */
const claimOnGitHub = (number, git) => git(["ls-remote", "origin", claimRef(number)]).split("\t")[0].trim() || null;

/**
 * Claim the card before taking it, so two sessions taking it at the same moment,
 * on one machine or two, can't both win. The claim is a ref on GitHub that
 * only one push can create: every other is refused. A claim older than its take
 * was left by an earlier holding and is claimed over, the same way. `git` runs git
 * in this checkout, whose `origin` is GitHub, and throws when git fails.
 */
export const claimCard = (number, machine, git, now = Date.now()) => {
  const ref = claimRef(number);
  const found = claimOnGitHub(number, git);
  if (found !== null) {
    let read;
    try {
      git(["fetch", "-q", "--no-write-fetch-head", "origin", ref]);
      read = git(["log", "-1", "--format=%ct%n%s", found]);
    } catch (error) {
      // Let go of or claimed over since it was looked up: look again.
      if (claimOnGitHub(number, git) !== found) return claimCard(number, machine, git, now);
      throw error;
    }
    const [time, subject] = read.split("\n");
    if (now - Number(time) * 1000 < CLAIM_STANDS_MS) return { kind: "refused", why: `#${String(number)} was taken a moment ago on ${subject.replace(/^.* taken on /, "")}, by another session.` };
  }
  const tree = git(["hash-object", "-w", "-t", "tree", "--stdin"]).trim();
  // Its own mark, or two sessions claiming in the same second make the same commit, and the second push is no change at all.
  const claim = git(["commit-tree", tree, "-m", `#${String(number)} taken on ${MACHINE_NAMES[machine]}`, "-m", randomUUID()]).trim();
  try {
    // The lease is checked by GitHub as it writes the ref: a claim made meanwhile refuses this push.
    git(["push", "-q", "--no-verify", `--force-with-lease=${ref}:${found ?? ""}`, "origin", `${claim}:${ref}`]);
  } catch (error) {
    // Claimed by another session meanwhile: its claim now stands, and says where.
    if (claimOnGitHub(number, git) !== found) return claimCard(number, machine, git, now);
    throw error;
  }
  return { kind: "claimed" };
};

/** Take the card's claim off once it has left play, so the next session takes it at once. A claim made meanwhile stays. */
export const releaseClaim = (number, git) => {
  const found = claimOnGitHub(number, git);
  if (found === null) return;
  try {
    git(["push", "-q", "--no-verify", `--force-with-lease=${claimRef(number)}:${found}`, "origin", `:${claimRef(number)}`]);
  } catch {
    // Claimed again meanwhile, or GitHub out of reach: a claim left behind lapses by itself.
  }
};
