/** @jest-environment node */
// apps/editor/src/lib/poMarker.test.ts
//
// The product owner's run marker: one run or review chat lands and pushes at a
// time. On 5 Nov a chat wrote the marker by hand over another chat's, and two
// landings of the same cards ran at once.

import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { markerHolder, refreshMarker, releaseMarker, takeMarker } from "../lib/po-marker.mjs";

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse("2026-11-05T12:00:00Z");

describe("the run marker", () => {
  let root = "";
  let dir = "";
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "po-marker-"));
    dir = path.join(root, "running");
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("is taken by the first, and refused to a second while the first is fresh", () => {
    expect(takeMarker({ dir, session: "chat-a", holder: "chat", now: NOW }).taken).toBe(true);
    const second = takeMarker({ dir, session: "chat-b", holder: "chat", now: NOW + HOUR });
    expect(second.taken).toBe(false);
    expect(second.by?.session).toBe("chat-a");
    expect(markerHolder({ dir })?.session).toBe("chat-a");
  });

  it("is taken over from a holder gone stale, keeping the old one aside", () => {
    takeMarker({ dir, session: "chat-a", holder: "chat", now: NOW });
    const later = takeMarker({ dir, session: "run-b", holder: "run", now: NOW + 4 * HOUR });
    expect(later.taken).toBe(true);
    expect(later.tookOverFrom?.session).toBe("chat-a");
    expect(markerHolder({ dir })?.session).toBe("run-b");
    expect(readdirSync(root).some((name) => name.startsWith("stale-"))).toBe(true);
  });

  it("keeps a run fresh longer than a chat", () => {
    takeMarker({ dir, session: "run-a", holder: "run", now: NOW });
    expect(takeMarker({ dir, session: "chat-b", holder: "chat", now: NOW + 4 * HOUR }).taken).toBe(false);
  });

  it("is refreshed and released only by the session it names", () => {
    takeMarker({ dir, session: "chat-a", holder: "chat", now: NOW });
    expect(refreshMarker({ dir, session: "chat-b", now: NOW + HOUR }).held).toBe(false);
    expect(releaseMarker({ dir, session: "chat-b" }).released).toBe(false);
    expect(existsSync(dir)).toBe(true);
    expect(refreshMarker({ dir, session: "chat-a", now: NOW + HOUR }).held).toBe(true);
    expect(releaseMarker({ dir, session: "chat-a" }).released).toBe(true);
    expect(existsSync(dir)).toBe(false);
  });

  it("can be taken again by its own holder", () => {
    takeMarker({ dir, session: "chat-a", holder: "chat", now: NOW });
    expect(takeMarker({ dir, session: "chat-a", holder: "chat", now: NOW + HOUR }).taken).toBe(true);
  });
});
