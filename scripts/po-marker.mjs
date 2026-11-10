#!/usr/bin/env node
// scripts/po-marker.mjs
//
// The product owner's run marker, for the product-owner-run skill and the
// review-with-me chat (their "State" and hard rule 4):
//
//   take <session> <run|chat>   take it, or say who holds it (exit 1)
//   refresh <session>           keep it fresh; exit 1 when someone else holds it now
//   release <session>           give it back, only if it is this session's
//   who                         who holds it
//
// The marker lives in ~/.tickered/po-run/running (override: TICKERED_PO_MARKER).

import { homedir } from "node:os";
import path from "node:path";
import { markerHolder, refreshMarker, releaseMarker, takeMarker } from "./lib/po-marker.mjs";

const dir = process.env.TICKERED_PO_MARKER ?? path.join(homedir(), ".tickered", "po-run", "running");
const [command, session, holder] = process.argv.slice(2);
const describe = (info) => (info === null ? "nobody" : `${info.session} (${info.holder}, updated ${info.updatedAt})`);

if (command === "take" && session && (holder === "run" || holder === "chat")) {
  const result = takeMarker({ dir, session, holder });
  if (result.taken) {
    console.log(result.tookOverFrom ? `Taken over from ${describe(result.tookOverFrom)}, which had gone stale.` : "Taken.");
  } else {
    console.log(`Held by ${describe(result.by)}: do nothing that lands or pushes.`);
    process.exit(1);
  }
} else if (command === "refresh" && session) {
  const result = refreshMarker({ dir, session });
  if (!result.held) {
    console.log(`Now held by ${describe(result.by)}: stop.`);
    process.exit(1);
  }
} else if (command === "release" && session) {
  const result = releaseMarker({ dir, session });
  console.log(result.released ? "Released." : `Not this session's (${describe(result.by)}); left alone.`);
} else if (command === "who") {
  console.log(describe(markerHolder({ dir })));
} else {
  console.log("usage: po-marker.mjs take <session> <run|chat> | refresh <session> | release <session> | who");
  process.exit(2);
}
