// Type sidecar for po-marker.mjs (a plain-JS ESM module), for the editor's
// test that imports it (apps/editor/src/lib/poMarker.test.ts; the editor's tsc
// program runs with `allowJs: false`). Keep in sync with po-marker.mjs by hand.

export interface MarkerInfo {
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly session: string;
  readonly holder: "run" | "chat";
}

export interface TakeResult {
  readonly taken: boolean;
  readonly again?: boolean;
  readonly by?: MarkerInfo | null;
  readonly tookOverFrom?: MarkerInfo | null;
}

export function takeMarker(options: {
  readonly dir: string;
  readonly session: string;
  readonly holder: "run" | "chat";
  readonly now?: number;
}): TakeResult;

export function refreshMarker(options: {
  readonly dir: string;
  readonly session: string;
  readonly now?: number;
}): { readonly held: boolean; readonly by?: MarkerInfo | null };

export function releaseMarker(options: {
  readonly dir: string;
  readonly session: string;
}): { readonly released: boolean; readonly by?: MarkerInfo | null };

export function markerHolder(options: { readonly dir: string }): MarkerInfo | null;
