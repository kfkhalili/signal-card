---
name: land-and-release
description: Land approved cards of the "Tickered" board and see them live — the one set of steps the product owner run and the review chat both use for a yes: bring the card's PR up to date, run the full checks, merge it into main, watch Vercel's production deploy until it is live, and retire card branches. Used only from `product-owner-run` (step 2) or `review-with-me` (hard rule 4), never on its own.
---

# Land and release

Tickered has no release batching: **merging a card's PR into `main` is the release**, because Vercel deploys `main` to production on every merge. A `product-owner-run` run and a `review-with-me` chat both carry out the owner's yes with these steps, so the two never act differently. Which answers count, and their receipts, are the caller's (`product-owner-run` hard rule 3 and "Answers and receipts"). CLAUDE.md's "Open work" section holds over anything here.

**The run marker is the caller's.** Both callers hold it while they land, through `node scripts/po-marker.mjs` alone. Refresh it before each merge and any write to the board; when it says someone else holds it now, stop at once.

## Hard rules

1. **Only the owner's yes lands a card.** A run lands only cards with a live yes on them (`product-owner-run` step 2), or under a standing yes the owner wrote in CLAUDE.md.
2. **Merge only through the card's PR,** with `gh pr merge <pr> --merge` (the repo's history uses merge commits). Never push `main` directly, never deploy by hand, never use the Vercel connector to deploy, promote or roll back.
3. **Read the checks' own exit status.** Run the full checks on their own, never piped into `tail` or `grep`; write the output to a file and read the file afterwards.
4. **Never merge before the full checks pass** on the PR branch as it will land (rebased on today's `origin/main`).
5. **A landing is undone only with a revert PR,** never a force-push to `main`.
6. **Hooks always run.** Never `--no-verify` or `HUSKY=0`.
7. **This machine's cards only.** Land only cards with this machine's label (`[ "$(uname -s)" = Darwin ] && echo mac || echo ubuntu`).
8. Every comment written from these steps ends with `<!-- tickered-bot -->`.

## Landing a card

One card at a time, oldest yes first. A card that waits for another (`node scripts/card-board.mjs waits <n>` fails) is not landed: the caller gives it `Not yet: it waits for #<m>. Your yes still stands.`

1. **Bring it up to date.** In a worktree on `tree/card-<n>`: `git fetch origin`, `git rebase origin/main`. On a clash, `git rebase --abort`: the card goes back to the caller as a yes that won't land ("it clashes with what landed since").
2. **Full checks:** `npm ci`, then `npm run typecheck && npm run lint && npm test && npm run build`, reading its own exit status (rule 3). A failing check is re-run once alone; if it passes, it was flaky, not a failure. A real failure goes back to the caller as a yes that won't land, with what failed.
3. **Push the rebased branch** (`git push --force-with-lease --force-if-includes origin tree/card-<n>`) and wait for the PR's own checks on GitHub to finish (`gh pr checks <pr> --watch`). A red check is a yes that won't land.
4. **Merge:** `gh pr merge <pr> --merge`. GitHub closes the card through its `Closes #<n>`.
5. Write `Acted on: merged; Vercel is putting it live.` on the card and move it to **Landed**. Archive the card's session (`mcp__ccd_session_mgmt__archive_session`): its work is over, and it can still be opened and read.

## Seeing it live

After each merge, find the production deploy for the merge commit (the Vercel connector's `list_deployments` for the project, `target` production, read only; or the commit's status checks, `gh api repos/<repo>/commits/<sha>/status`). Wait for it to finish:
- **Ready:** write `Acted on: live (<time>).`, move the card to **Done**, and archive its branch (below).
- **Error or cancelled:** write `Not yet: Vercel's deploy of it failed: <why, from its build log in plain words>.` Leave the card in **Landed**, open an Inbox card for the fix (or a revert, if the live site is broken), and say so under **Stuck**. Never redeploy or roll back from here: that is the owner's step in Vercel.
- **Can't be read** (no connector, no status): say so under **Stuck** and leave the card in **Landed**; the next run checks again.

## Card branches

**Archiving a live card's branch:** put one line in a comment on the card (date, branch, the commit it pointed to, `git rev-parse origin/tree/card-<n>`), so it can be brought back with `git branch tree/card-<n> <commit>`. Then, only if `git cherry origin/main origin/tree/card-<n>` shows nothing missing, `git push origin --delete tree/card-<n>` and remove any local branch and worktree for it.

**Retiring a card's branch** when its card closes without landing: delete it here and on GitHub only if it has no commits of its own (`git rev-list --count origin/main..origin/tree/card-<n>` is 0). If it has commits, keep it and say so in the briefing.

No other branch is ever deleted from these steps.
