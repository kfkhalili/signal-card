// Type sidecar for board.mjs (a plain-JS ESM module), for the editor's contract
// test that imports it (apps/editor/src/board.test.ts; the editor's tsc program
// runs with `allowJs: false`). Keep in sync with board.mjs by hand — the
// compiler cannot check this against the .mjs.

export interface BoardPage {
  readonly pageInfo: { readonly hasNextPage: boolean; readonly endCursor: string | null };
  readonly nodes: readonly {
    readonly id: string;
    readonly fieldValueByName: { readonly name: string } | null;
    readonly content: { readonly number?: number; readonly title?: string } | null;
  }[];
}

export interface BoardCard {
  readonly id: string;
  readonly number: number | null;
  readonly column: string | null;
  readonly title: string;
}

export declare const BOARD_COLUMNS: readonly string[];
export declare function boardQuery(board: { readonly projectOwner: string; readonly projectNumber: number }): string;
export declare function readBoard(readPage: (after: string | null) => BoardPage): readonly BoardCard[];
export declare function assertColumns(columns: readonly string[]): void;
export declare function boardLines(cards: readonly BoardCard[], columns: readonly string[]): readonly string[];
export declare function cardsToSort(cards: readonly BoardCard[]): readonly BoardCard[];
