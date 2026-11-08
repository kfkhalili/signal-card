// Type sidecar for card-board.mjs (a plain-JS ESM module), for the editor's
// contract test that imports it (apps/editor/src/lib/cardBoard.test.ts; the
// editor's tsc program runs with `allowJs: false`). Keep in sync with
// card-board.mjs by hand — the compiler cannot check this against the .mjs.

export interface BoardCard {
  readonly number: number;
  readonly state: string;
  readonly column: string;
  readonly labels: readonly string[];
}

export type TakeAnswer = { readonly kind: "take"; readonly first: boolean } | { readonly kind: "refused"; readonly why: string };

export type LetGoAnswer = { readonly kind: "let-go" } | { readonly kind: "free" | "refused"; readonly why: string };

export declare const IN_PLAY: readonly string[];
export declare function machineOf(platform: string): "mac" | "ubuntu";
export declare function machineLabel(machine: string): string;
export declare function machineWith(labels: readonly string[]): "mac" | "ubuntu" | null;
export declare function machineWords(labels: readonly string[]): string;
export declare function waitingWhy(card: BoardCard & { readonly blockers: readonly BoardCard[] }, machine: string): string | null;
export declare function takeAnswer(card: BoardCard & { readonly blockers: readonly BoardCard[] }, machine: string): TakeAnswer;
export declare function letGoAnswer(card: BoardCard & { readonly title: string }, machine: string, onlyHere: () => readonly string[]): LetGoAnswer;
export declare function filesWorthComparing(files: readonly string[]): readonly string[];
export type ClaimAnswer = { readonly kind: "claimed" } | { readonly kind: "refused"; readonly why: string };
export declare function claimCard(number: number, machine: "mac" | "ubuntu", git: (args: readonly string[]) => string, now?: number): ClaimAnswer;
export declare function releaseClaim(number: number, git: (args: readonly string[]) => string): void;
