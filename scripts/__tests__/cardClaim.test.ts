/** @jest-environment node */
// apps/editor/src/lib/cardClaim.test.ts
//
// Two sessions taking the same card at the same moment: only
// one may win. A claim is a marker on GitHub that one push can create and every
// other push is refused, so this runs the claim itself against real
// repositories, never the board's own.

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { claimCard, releaseClaim } from "../lib/card-board.mjs";

const lib = path.join(process.cwd(), "scripts/lib/card-board.mjs");
const LATER = Date.now() + 10 * 60 * 1000;

describe("claiming a card", () => {
  let dir = "";
  // No GIT_* from outside: a commit in a linked worktree hands its hook GIT_DIR,
  // which overrides `cwd`, and these pushes would land on the real repository.
  const scratchEnv = (): NodeJS.ProcessEnv => {
    const env: NodeJS.ProcessEnv = { ...process.env };
    for (const name of Object.keys(env)) if (name.startsWith("GIT_")) env[name] = undefined;
    return env;
  };
  const git =
    (cwd: string) =>
    (args: readonly string[]): string =>
      execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: scratchEnv() });
  const clone = (name: string): string => {
    git(dir)(["clone", "-q", "origin.git", name]);
    const folder = path.join(dir, name);
    for (const [key, value] of [["user.name", "t"], ["user.email", "t@example.test"], ["commit.gpgsign", "false"]] as const) git(folder)(["config", key, value]);
    return folder;
  };
  const onGitHub = (): string => git(dir)(["--git-dir", "origin.git", "for-each-ref", "--format=%(refname) %(objectname)", "refs/claims/"]).trim();

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "card-claim-"));
    git(dir)(["init", "-q", "--bare", "origin.git"]);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("claims a card nobody has claimed", () => {
    expect(claimCard(7, "ubuntu", git(clone("one")))).toEqual({ kind: "claimed" });
    expect(onGitHub()).toMatch(/^refs\/claims\/card-7 /);
  });

  it("refuses a card another session claimed a moment ago, and says on which machine", () => {
    claimCard(7, "mac", git(clone("one")));
    expect(claimCard(7, "ubuntu", git(clone("two")))).toEqual({ kind: "refused", why: "#7 was taken a moment ago on the Mac, by another session." });
  });

  it("refuses this machine's own second session too", () => {
    claimCard(7, "ubuntu", git(clone("one")));
    expect(claimCard(7, "ubuntu", git(clone("two")))).toEqual({ kind: "refused", why: "#7 was taken a moment ago on the Ubuntu computer, by another session." });
  });

  it("claims over a claim left from an earlier take, once its take is long over", () => {
    claimCard(7, "mac", git(clone("one")));
    const before = onGitHub();
    expect(claimCard(7, "ubuntu", git(clone("two")), LATER)).toEqual({ kind: "claimed" });
    expect(onGitHub()).not.toBe(before);
  });

  it("lets exactly one of two sessions taking the card at the same moment win, round after round", async () => {
    const folders = [clone("one"), clone("two")];
    const take = (folder: string, round: number): Promise<string> =>
      new Promise((resolve) => {
        const program = `import { execFileSync } from "node:child_process"; import { claimCard } from ${JSON.stringify(lib)};
          const git = (args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
          console.log(claimCard(${String(round)}, "ubuntu", git).kind);`;
        const child = spawn(process.execPath, ["--input-type=module", "-e", program], { cwd: folder, env: scratchEnv() });
        let said = "";
        child.stdout.on("data", (chunk: Buffer) => {
          said += chunk.toString();
        });
        child.on("close", () => {
          resolve(said.trim());
        });
      });
    for (let round = 1; round <= 6; round += 1) {
      const answers = await Promise.all(folders.map((folder) => take(folder, round)));
      expect(answers.toSorted()).toEqual(["claimed", "refused"]);
    }
  }, 60_000);

  it("is gone once the card is let go of, so the next session takes it at once", () => {
    const one = git(clone("one"));
    claimCard(7, "ubuntu", one);
    releaseClaim(7, one);
    expect(onGitHub()).toBe("");
    expect(claimCard(7, "mac", git(clone("two")))).toEqual({ kind: "claimed" });
  });

  it("has nothing to do for a card nobody has claimed", () => {
    expect(() => {
      releaseClaim(7, git(clone("one")));
    }).not.toThrow();
  });
});
