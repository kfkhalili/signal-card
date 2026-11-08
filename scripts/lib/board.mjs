// The work board (`.claude/board.json`), read cheaply and whole. `gh project item-list` asks
// for every field of every card: about 100 of GitHub's 5,000 points an hour per
// page, about 300 for the board of 243 cards on 1 Nov, shared by every session on
// every machine. This asks for what a session reads, a point a page, and for every
// page: a fixed limit of 200 cards silently left out the rest once the board
// outgrew it.

export const BOARD_COLUMNS = ["Inbox", "Yours", "Ready", "In progress", "Review", "Landed", "Parked", "Done"];

const PAGE = "items(first:100,after:$after){pageInfo{hasNextPage endCursor}nodes{id fieldValueByName(name:\"Status\"){... on ProjectV2ItemFieldSingleSelectValue{name}}content{... on Issue{number title}... on PullRequest{number title}... on DraftIssue{title}}}}";
/** One page of the board: a user's project or an organisation's alike. */
export const boardQuery = ({ projectOwner, projectNumber }) =>
  `query($after:String){repositoryOwner(login:${JSON.stringify(projectOwner)}){... on ProjectV2Owner{projectV2(number:${String(projectNumber)}){${PAGE}}}}}`;

/** Every card, top of the board first. `readPage(after)` gives one page, or throws: half a board is no answer. */
export const readBoard = (readPage) => {
  const cards = [];
  let after = null;
  for (;;) {
    const { pageInfo, nodes } = readPage(after);
    for (const { id, fieldValueByName, content } of nodes) {
      cards.push({ id, number: content?.number ?? null, column: fieldValueByName?.name ?? null, title: content?.title ?? "" });
    }
    if (!pageInfo.hasNextPage) return cards;
    if (pageInfo.endCursor === null) throw new Error("GitHub says the board goes on, but gave no cursor to read on from");
    after = pageInfo.endCursor;
  }
};

/** Refuses a column the board doesn't have, before anything is read: an empty list would read as an empty column. */
export const assertColumns = (columns) => {
  for (const column of columns) {
    if (!BOARD_COLUMNS.includes(column)) throw new Error(`"${column}" is not a column: ${BOARD_COLUMNS.join(", ")}`);
  }
};

/** A line per card, tab-separated: item id, number, column, title. Only the columns named, if any are. */
export const boardLines = (cards, columns) =>
  cards
    .filter((card) => columns.length === 0 || columns.includes(card.column))
    .map((card) => `${card.id}\t${card.number ?? "-"}\t${card.column ?? ""}\t${card.title}`);

/** The cards waiting to be sorted: in the Inbox, or on the board with no column at all. */
export const cardsToSort = (cards) => cards.filter((card) => card.column === "Inbox" || card.column === null);
