// Which GitHub board this repo's open work lives on: `.claude/board.json`, the
// one place its repo, project and column ids are written. The scripts read it
// from here and the skills name it, so another repo with a project of its own
// takes the whole system over by writing that file
// (`node scripts/board-setup.mjs <owner/repo> <project number>`).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BOARD_COLUMNS } from "./board.mjs";

const CONFIG_PATH = fileURLToPath(new URL("../../.claude/board.json", import.meta.url));

const isText = (value) => typeof value === "string" && value !== "";

/** The board's settings, checked whole: a missing column id would only show once a card had to move there. */
export const parseBoardConfig = (text) => {
  const config = JSON.parse(text);
  const problems = [];
  if (!isText(config.repo) || !/^[^/\s]+\/[^/\s]+$/.test(config.repo)) problems.push(`"repo" is "owner/name"`);
  for (const key of ["ownerLogin", "projectOwner", "projectTitle", "projectId", "statusFieldId"]) {
    if (!isText(config[key])) problems.push(`"${key}" is missing`);
  }
  if (!Number.isInteger(config.projectNumber) || config.projectNumber < 1) problems.push(`"projectNumber" is the project's number`);
  const missing = BOARD_COLUMNS.filter((column) => !isText(config.columns?.[column]));
  if (missing.length > 0) problems.push(`"columns" has no id for ${missing.join(", ")}`);
  if (problems.length > 0) throw new Error(`.claude/board.json: ${problems.join("; ")}`);
  return config;
};

/** The board's settings, read from `.claude/board.json`. */
export const loadBoard = () => parseBoardConfig(readFileSync(CONFIG_PATH, "utf8"));

/**
 * The settings for a project as GitHub describes it. Refuses a project whose
 * Status field lacks one of the board's columns, naming each, so the columns
 * are made before anything runs on the board.
 */
export const configFromProject = ({ repo, ownerLogin, projectOwner, projectNumber, project }) => {
  const options = project?.field?.options;
  if (!Array.isArray(options)) throw new Error(`project ${String(projectNumber)} of ${projectOwner} has no single-select "Status" field`);
  const columns = Object.fromEntries(BOARD_COLUMNS.map((column) => [column, options.find((option) => option.name === column)?.id]));
  const missing = BOARD_COLUMNS.filter((column) => columns[column] === undefined);
  if (missing.length > 0) throw new Error(`the project's Status field has no ${missing.map((column) => `"${column}"`).join(", ")} option: add ${missing.length === 1 ? "it" : "them"} on GitHub, then run this again`);
  return parseBoardConfig(JSON.stringify({ repo, ownerLogin, projectOwner, projectNumber, projectTitle: project.title, projectId: project.id, statusFieldId: project.field.id, columns }));
};

export const CONFIG_FILE = CONFIG_PATH;
