/** @jest-environment node */
// apps/editor/src/lib/cardBoard.test.ts
//
// Who has which card, and what a card waits for: the rules
// scripts/card-board.mjs answers with before it changes anything on the board.

import { filesWorthComparing, letGoAnswer, machineOf, takeAnswer, waitingWhy } from "../lib/card-board.mjs";

const card = { number: 7, state: "OPEN", column: "Ready", labels: [], blockers: [] };
const blocker = { number: 3, state: "OPEN", column: "In progress", labels: ["machine: ubuntu"] };

describe("which machine this is", () => {
  it("is the Mac on macOS and Ubuntu on Linux", () => {
    expect(machineOf("darwin")).toBe("mac");
    expect(machineOf("linux")).toBe("ubuntu");
  });
});

describe("taking a card", () => {
  it("takes a free card, as the first to take it", () => {
    expect(takeAnswer(card, "mac")).toEqual({ kind: "take", first: true });
  });

  it("takes a card from Review, sent back with the owner's words", () => {
    expect(takeAnswer({ ...card, column: "Review", labels: ["machine: mac"] }, "mac")).toEqual({ kind: "take", first: true });
  });

  it("is not first when this machine already has the card In progress", () => {
    expect(takeAnswer({ ...card, column: "In progress", labels: ["machine: mac"] }, "mac")).toEqual({ kind: "take", first: false });
  });

  it("refuses the other machine's card, and names the machine", () => {
    expect(takeAnswer({ ...card, column: "In progress", labels: ["machine: ubuntu"] }, "mac")).toEqual({ kind: "refused", why: "#7 is with the Ubuntu computer." });
    expect(takeAnswer({ ...card, labels: ["machine: mac"] }, "ubuntu")).toEqual({ kind: "refused", why: "#7 is with the Mac." });
  });

  it("lets a session carry on with a card that gained a blocker after it was taken", () => {
    expect(takeAnswer({ ...card, column: "In progress", labels: ["machine: mac"], blockers: [blocker] }, "mac")).toEqual({ kind: "take", first: false });
  });

  it("refuses a card already landed or parked", () => {
    expect(takeAnswer({ ...card, column: "Landed", labels: ["machine: mac"] }, "mac")).toEqual({ kind: "refused", why: "#7 is in Landed." });
    expect(takeAnswer({ ...card, column: "Parked" }, "mac")).toEqual({ kind: "refused", why: "#7 is in Parked." });
  });

  it("refuses a closed card", () => {
    expect(takeAnswer({ ...card, state: "CLOSED" }, "mac")).toEqual({ kind: "refused", why: "#7 is closed." });
  });

  it("refuses a card whose blocker is still open, saying where that is", () => {
    expect(takeAnswer({ ...card, blockers: [blocker] }, "mac")).toEqual({ kind: "refused", why: "#7 waits for #3 (In progress, the Ubuntu computer)." });
  });

  it("names every blocker still open, and one with no machine as such", () => {
    const answer = takeAnswer({ ...card, blockers: [blocker, { number: 4, state: "OPEN", column: "Ready", labels: [] }, { number: 5, state: "CLOSED", column: "Done", labels: [] }] }, "mac");
    expect(answer).toEqual({ kind: "refused", why: "#7 waits for #3 (In progress, the Ubuntu computer), #4 (Ready, no machine yet)." });
  });

  it("takes a card whose blocker is closed: its work is on GitHub, where both machines see it", () => {
    expect(takeAnswer({ ...card, blockers: [{ ...blocker, state: "CLOSED", column: "Done" }] }, "ubuntu")).toEqual({ kind: "take", first: true });
  });

  it("counts a blocker landed on this machine as done, because this machine's main holds it", () => {
    expect(takeAnswer({ ...card, blockers: [{ ...blocker, column: "Landed", labels: ["machine: mac"] }] }, "mac")).toEqual({ kind: "take", first: true });
  });

  it("does not count a blocker landed only on the other machine: this one can't see it yet", () => {
    expect(takeAnswer({ ...card, blockers: [{ ...blocker, column: "Landed", labels: ["machine: ubuntu"] }] }, "mac")).toEqual({ kind: "refused", why: "#7 waits for #3 (Landed, the Ubuntu computer)." });
  });
});

describe("what a card waits for", () => {
  it("says so while a blocker is not done, for this machine", () => {
    expect(waitingWhy({ ...card, blockers: [blocker] }, "mac")).toBe("#7 waits for #3 (In progress, the Ubuntu computer).");
  });

  it("says nothing once it waits for nothing", () => {
    expect(waitingWhy(card, "mac")).toBeNull();
    expect(waitingWhy({ ...card, blockers: [{ ...blocker, column: "Landed", labels: ["machine: mac"] }] }, "mac")).toBeNull();
  });
});

describe("letting go of a card's label", () => {
  const leaving = { ...card, title: "A card", column: "Yours", labels: ["machine: mac"] };
  // This machine's git is read only once the card is its own and has left play.
  const nothingAsked = () => {
    throw new Error("asked what is only here");
  };

  it("takes this machine's label off a card that has left play with nothing of it only here", () => {
    for (const column of ["Inbox", "Yours", "Ready", "Parked"]) expect(letGoAnswer({ ...leaving, column }, "mac", () => [])).toEqual({ kind: "let-go" });
  });

  it("keeps the label while this machine still holds the card", () => {
    expect(letGoAnswer({ ...leaving, column: "In progress" }, "mac", nothingAsked)).toEqual({ kind: "refused", why: "#7 is In progress, so this machine still holds it." });
    expect(letGoAnswer({ ...leaving, column: "Review" }, "mac", nothingAsked)).toEqual({ kind: "refused", why: "#7 is in Review, so this machine still holds it." });
    expect(letGoAnswer({ ...leaving, column: "Landed" }, "mac", nothingAsked)).toEqual({ kind: "refused", why: "#7 is in Landed, so this machine still holds it." });
  });

  it("keeps the label while something of the card is only on this machine, and says what", () => {
    expect(letGoAnswer(leaving, "mac", () => ["commits on its branch that GitHub doesn't have", "changes in its folder that aren't committed"])).toEqual({
      kind: "refused",
      why: "#7 keeps its label: commits on its branch that GitHub doesn't have, changes in its folder that aren't committed.",
    });
  });

  it("keeps the label of a card about this machine's own main: its release card, and the one bringing its waiting work up to date", () => {
    const why = "#7 is about this machine's own main, so it keeps its label.";
    expect(letGoAnswer({ ...leaving, title: "Release: Mac changes waiting to go live" }, "mac", nothingAsked)).toEqual({ kind: "refused", why });
    expect(letGoAnswer({ ...leaving, column: "Ready", title: "Bring the Mac waiting work up to date" }, "mac", nothingAsked)).toEqual({ kind: "refused", why });
  });

  it("never takes the other machine's label off", () => {
    expect(letGoAnswer({ ...leaving, labels: ["machine: ubuntu"] }, "mac", nothingAsked)).toEqual({ kind: "refused", why: "#7 is with the Ubuntu computer." });
  });

  it("has nothing to do for a card with no label", () => {
    expect(letGoAnswer({ ...leaving, labels: [] }, "mac", nothingAsked)).toEqual({ kind: "free", why: "#7 carries no machine label." });
  });
});

describe("what two cards are compared on", () => {
  it("leaves out the files nearly every card changes, whose clashes are settled in seconds", () => {
    const files = ["CLAUDE.md", "docs/editor.md", "docs/adr/0122-x.md", "cockpit/capabilities.mjs", "cockpit/dist/index.html", "pnpm-lock.yaml", ".claude/skills/work-card/SKILL.md", "apps/editor/src/store/editorActions.ts", "packages/core/src/geom/sides.ts"];
    expect(filesWorthComparing(files)).toEqual(["apps/editor/src/store/editorActions.ts", "packages/core/src/geom/sides.ts"]);
  });
});
