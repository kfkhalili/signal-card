// Type sidecar for board-config.mjs (a plain-JS ESM module), for the editor's
// contract test that imports it (apps/editor/src/boardConfig.test.ts; the
// editor's tsc program runs with `allowJs: false`). Keep in sync by hand.

export interface BoardConfig {
  readonly repo: string;
  readonly ownerLogin: string;
  readonly projectOwner: string;
  readonly projectNumber: number;
  readonly projectTitle: string;
  readonly projectId: string;
  readonly statusFieldId: string;
  readonly columns: Readonly<Record<string, string>>;
}

export interface GitHubProject {
  readonly id: string;
  readonly title: string;
  readonly field: { readonly id: string; readonly options: readonly { readonly id: string; readonly name: string }[] } | null;
}

export declare const CONFIG_FILE: string;
export declare function parseBoardConfig(text: string): BoardConfig;
export declare function loadBoard(): BoardConfig;
export declare function configFromProject(input: {
  readonly repo: string;
  readonly ownerLogin: string;
  readonly projectOwner: string;
  readonly projectNumber: number;
  readonly project: GitHubProject;
}): BoardConfig;
