// scripts/lib/po-marker.mjs
//
// The product owner's run marker (`~/.tickered/po-run/running/`): one run or
// review chat lands and pushes at a time. Taking it is a `mkdir`, which only
// one taker can win; nobody writes `info.json` by hand, so nobody overwrites
// another holder's (5 Nov: a chat did, and two landings of the same cards ran).

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const HOUR = 60 * 60 * 1000;
// Longer than the holder's longest landing and push.
const FRESH_FOR = { run: 12 * HOUR, chat: 3 * HOUR };

const infoPath = (dir) => path.join(dir, "info.json");

const readInfo = (dir) => {
  try {
    return JSON.parse(readFileSync(infoPath(dir), "utf8"));
  } catch {
    return null;
  }
};

const isFresh = (info, now) => {
  if (info === null) return false;
  const updated = Date.parse(info.updatedAt ?? "");
  const lasts = FRESH_FOR[info.holder] ?? FRESH_FOR.run;
  return Number.isFinite(updated) && now - updated < lasts;
};

const sign = (dir, session, holder, now) => {
  const stamp = new Date(now).toISOString();
  writeFileSync(infoPath(dir), JSON.stringify({ startedAt: stamp, updatedAt: stamp, session, holder }));
};

/**
 * Takes the marker for `session`, or says who holds it. A holder whose
 * `updatedAt` has gone stale is moved aside (kept, never deleted) and the
 * marker taken again.
 */
export const takeMarker = ({ dir, session, holder, now = Date.now() }) => {
  mkdirSync(path.dirname(dir), { recursive: true });
  try {
    mkdirSync(dir);
  } catch {
    const info = readInfo(dir);
    if (info?.session === session) return { taken: true, again: true };
    if (isFresh(info, now)) return { taken: false, by: info };
    renameSync(dir, path.join(path.dirname(dir), `stale-${new Date(now).toISOString().replaceAll(":", "-")}`));
    try {
      mkdirSync(dir);
    } catch {
      return { taken: false, by: readInfo(dir) };
    }
    sign(dir, session, holder, now);
    return { taken: true, tookOverFrom: info };
  }
  sign(dir, session, holder, now);
  return { taken: true };
};

/** Refreshes `updatedAt`, only while the marker still names `session`. */
export const refreshMarker = ({ dir, session, now = Date.now() }) => {
  const info = readInfo(dir);
  if (info?.session !== session) return { held: false, by: info };
  writeFileSync(infoPath(dir), JSON.stringify({ ...info, updatedAt: new Date(now).toISOString() }));
  return { held: true };
};

/** Gives the marker back, only while it still names `session`. */
export const releaseMarker = ({ dir, session }) => {
  const info = readInfo(dir);
  if (info?.session !== session) return { released: false, by: info };
  rmSync(dir, { recursive: true, force: true });
  return { released: true };
};

/** Who holds the marker now, or null. */
export const markerHolder = ({ dir }) => readInfo(dir);
