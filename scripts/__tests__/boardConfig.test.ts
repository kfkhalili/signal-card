/** @jest-environment node */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BOARD_COLUMNS, boardQuery } from "../lib/board.mjs";
import { CONFIG_FILE, configFromProject, loadBoard, parseBoardConfig } from "../lib/board-config.mjs";

const root = process.cwd();

const project = (names: readonly string[]) => ({
  id: "PVT_new",
  title: "New work",
  field: { id: "PVTSSF_new", options: names.map((name, i) => ({ id: `opt${String(i)}`, name })) },
});

// `.claude/board.json` is each checkout's own and isn't committed, so a checkout
// without one (CI) checks the same rules against a stand-in board.
const standIn = configFromProject({
  repo: "someone/app",
  ownerLogin: "someone",
  projectOwner: "someone",
  projectNumber: 1,
  project: { id: "PVT_standin", title: "Stand-in", field: { id: "PVTSSF_standin", options: BOARD_COLUMNS.map((name, i) => ({ id: `standin${String(i)}`, name })) } },
});
const thisBoard = () => (existsSync(CONFIG_FILE) ? loadBoard() : standIn);

describe("the board's one config", () => {
  it("names every column the system moves cards between", () => {
    const board = thisBoard();
    expect(Object.keys(board.columns).sort()).toEqual([...BOARD_COLUMNS].sort());
  });

  it("is the only place the project's and columns' ids are written, so another repo changes one file", () => {
    const board = thisBoard();
    const ids = [board.projectId, board.statusFieldId, ...Object.values(board.columns)];
    const files = [
      ...readdirSync(join(root, "scripts"), { recursive: true, encoding: "utf8" }).filter((file) => /\.(mjs|mts)$/.test(file)).map((file) => join("scripts", file)),
      ...readdirSync(join(root, ".claude/skills"), { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".md")).map((file) => join(".claude/skills", file)),
      "CLAUDE.md",
    ];
    const naming = files.filter((file) => ids.some((id) => readFileSync(join(root, file), "utf8").includes(id)));
    expect(naming).toEqual([]);
  });

  it("refuses a config missing a column, naming it", () => {
    const board = thisBoard();
    const columns = Object.fromEntries(Object.entries(board.columns).filter(([name]) => name !== "Landed"));
    expect(() => parseBoardConfig(JSON.stringify({ ...board, columns }))).toThrow("no id for Landed");
    expect(() => parseBoardConfig(JSON.stringify({ ...board, repo: "tickered" }))).toThrow('"repo" is "owner/name"');
  });
});

describe("setting up a new board", () => {
  const input = { repo: "someone/app", ownerLogin: "someone", projectOwner: "an-org", projectNumber: 3 };

  it("takes each column's id from the project's Status options", () => {
    const config = configFromProject({ ...input, project: project([...BOARD_COLUMNS, "Extra"]) });
    expect(config).toMatchObject({ repo: "someone/app", projectOwner: "an-org", projectNumber: 3, projectTitle: "New work", projectId: "PVT_new", statusFieldId: "PVTSSF_new" });
    expect(config.columns.Inbox).toBe("opt0");
    expect(config.columns.Done).toBe(`opt${String(BOARD_COLUMNS.length - 1)}`);
  });

  it("names the columns the project still lacks", () => {
    expect(() => configFromProject({ ...input, project: project(["Inbox", "Ready"]) })).toThrow('no "Yours", "In progress"');
  });

  it("reads a user's project and an organisation's alike", () => {
    expect(boardQuery({ projectOwner: "an-org", projectNumber: 3 })).toContain('repositoryOwner(login:"an-org"){... on ProjectV2Owner{projectV2(number:3)');
  });
});
