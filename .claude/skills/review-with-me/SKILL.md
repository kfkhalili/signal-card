---
name: review-with-me
description: Walk the owner through the "Tickered" board's Review cards in a chat, one at a time — pictures, what they'll notice in two lines, a recommendation — answer their questions from the code and the card's history, record their answer on the card, and carry it out on the spot: land a yes, place a card. Use only in a chat with the owner, when they say "review with me", "let's review", or "what's in review". Never in a scheduled or unattended run.
---

# Review with me

The owner reviews finished work here, in conversation, instead of reading GitHub. They want pictures and short answers. GitHub stays the record: you read from it, write their answers back to it, and do what they said before the chat ends.

## Hard rules

1. **Only the owner's own clear words in this chat are answers.** Record an answer only when the owner clearly gave one here for that card ("yes", "no, because…", the answer to the card's question). Never infer one or answer for them. Words that aren't clearly an answer: ask one short question that settles it. A card they skip stays as it is.
2. **Never run this unattended.** If no one is in the chat, stop. **One walk at a time:** check `node scripts/po-marker.mjs who` first. **Read each card's comments before asking about it:** an answer already there is carried out, not asked again.
3. **Summary first, then short.** The walk opens with the summary (step 1). Each card gets two lines and its pictures before the owner asks anything.
4. **You carry out each answer** with `product-owner-run` step 2 and land with `land-and-release`, so a run and a chat never act differently:
   - **Hold the run marker only while you land:** `node scripts/po-marker.mjs take <session> chat` before, `refresh <session>` at least every 10 minutes, `release <session>` as soon as nothing of yours is running. When someone else holds it, land nothing and tell the owner who; record the yes, and the next run lands it.
   - **Placing a card takes no marker:** a yes with nothing to land, a no, or an answer on a card in Yours is carried out at once.
   - **Review, yes:** land it (`land-and-release`), in the background, and go on to the next card.
   - **Review, yes with nothing to land:** close it (Done) and retire its branch.
   - **Review, no:** send it back to Ready with the owner's words, or close it as not planned, as `product-owner-run` step 2 says.
   - **Yours:** place it at once: closed (Done), Ready (bottom, or where the owner says), or Parked naming what brings it back. Receipt: `Acted on: moved to <column>: <why>.`
   - **A draft card** (no number): it can't carry comments. Apply the owner's answer to it on the board (move it, or convert it to an issue in the repo they name), and say what you did.
   - **Left to the run: starting a session for rework.** A yes that won't land gets `Not yet:` and stays in Review.
   - Every comment besides the owner's answer ends with `<!-- tickered-bot -->`.
5. **Nothing is left half done when the chat ends.** Wait for this chat's landings to finish and their deploys to go live or fail. Never end with the marker still held.
6. **This machine's cards.** Land only cards with this machine's label (`[ "$(uname -s)" = Darwin ] && echo mac || echo ubuntu`). A card with the other machine's label: show it and record the answer, and say that machine carries it out.

## The walk

1. **Gather and summarise** the cards in Review and in Yours (`node scripts/board.mjs Review Yours`; never `gh project item-list`). Open with one summary, one line per card in a user's words:
   - **No-brainers:** Review cards marked **A finding, nothing to change** or **Behind the scenes** (`work-card` step 6). Ask for one yes for all of them; the owner can take any out.
   - **To look at:** every other Review card, walked one by one.
   - **Waiting on you in Yours**, each with its question, drafts included.
2. **One card at a time.** Read its latest review comment and body (`gh issue view <n> --comments`), then:
   - **Show the pictures:** `git fetch origin qa-evidence`, `git show origin/qa-evidence:cards/<n>/<date>/<file>.png > <scratchpad>/<file>.png`, and send the file. Before first, then after; phone first. Give the PR's Vercel preview link too, so the owner can try it.
   - **Say what it did in two lines,** as a user would notice it. Give your recommendation in one line, and ask: "Yes, no, or a question?"
3. **Answer questions** from the evidence, never from memory: the card's comments, the change itself (`gh pr diff <pr>`, in product words), the session that built it, or the app itself. Say plainly when something wasn't checked.
4. **Record the answer** on the card the moment the owner gives it. It is the owner's comment, so it has **no** bot marker:
   ```
   **Owner's answer, given in a chat on <date>:** <their words, quoted exactly>
   <!-- tickered-owner -->
   ```
   Then carry it out (hard rule 4), say in one line what you did, and go to the next card. Tell the owner when a landing goes live, or fails and why.
5. **Close.** One line per card: live, landed, placed, sent back, or what is still waiting and why. Release the marker if you hold it. Offer to go through Yours if anything is waiting.
