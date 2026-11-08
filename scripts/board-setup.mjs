#!/usr/bin/env node
// Points this checkout's board scripts and skills at a GitHub project: reads the
// project's id, its Status field and each column's id from GitHub and writes
// them to `.claude/board.json`, which everything else reads.
//
//   node scripts/board-setup.mjs <owner/repo> <project number> [--project-owner <login>] [--owner <login>]
//
// The project belongs to the repo's owner unless --project-owner says otherwise
// (an organisation's project), and the owner whose comments are answers is the
// repo's owner unless --owner says otherwise. The project's Status field needs
// one option for each column: Inbox, Yours, Ready, In progress, Review, Landed,
// Parked, Done; the script names any that are missing.

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { CONFIG_FILE, configFromProject } from "./lib/board-config.mjs";

const [repo, number, ...rest] = process.argv.slice(2);
const option = (name) => {
  const at = rest.indexOf(name);
  return at === -1 ? undefined : rest[at + 1];
};
const projectNumber = Number(number);
if (repo === undefined || !repo.includes("/") || !Number.isInteger(projectNumber)) {
  console.error("Usage: board-setup.mjs <owner/repo> <project number> [--project-owner <login>] [--owner <login>]");
  process.exit(2);
}
const repoOwner = repo.split("/")[0];
const projectOwner = option("--project-owner") ?? repoOwner;
const ownerLogin = option("--owner") ?? repoOwner;

const query = `{repositoryOwner(login:${JSON.stringify(projectOwner)}){... on ProjectV2Owner{projectV2(number:${String(projectNumber)}){id title field(name:"Status"){... on ProjectV2SingleSelectField{id options{id name}}}}}}}`;
try {
  const answer = JSON.parse(execFileSync("gh", ["api", "graphql", "-f", `query=${query}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }));
  const project = answer.data.repositoryOwner?.projectV2;
  if (project === undefined || project === null) throw new Error(`${projectOwner} has no project ${String(projectNumber)} that this login can read (gh auth refresh -s project)`);
  const config = configFromProject({ repo, ownerLogin, projectOwner, projectNumber, project });
  writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`.claude/board.json now points at "${config.projectTitle}" (project ${String(projectNumber)} of ${projectOwner}) for ${repo}.`);
} catch (error) {
  console.error(`board-setup: ${String(error.stderr ?? error.message).trim()}`);
  process.exit(1);
}
