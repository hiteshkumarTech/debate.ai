// Leaderboard data. There's no backend yet, so there's no real pool of
// other players. This module builds a believable board by taking the
// user's REAL best score from their saved history and slotting it into a
// set of clearly-labeled placeholder competitors.
//
// SWAP POINT: replace getLeaderboard()'s body with a fetch() to
// GET /api/leaderboard once the backend exists. Keep the returned shape
// (array of { rank, name, score, debates, isCurrentUser, isPlaceholder })
// and the Leaderboard page won't need to change. The `isPlaceholder` flag
// is what the UI uses to visually mark fake rows — real rows return false.

import { getDebateHistory, computeAverageScore } from './debateHistory';

// Static placeholder competitors. Deliberately varied so the board looks
// alive. These are NOT real users and the UI labels them as sample data.
const PLACEHOLDER_PLAYERS = [
  { name: 'Aarav S.', score: 94, debates: 51 },
  { name: 'Mei L.', score: 91, debates: 43 },
  { name: 'Diego R.', score: 88, debates: 38 },
  { name: 'Fatima K.', score: 85, debates: 47 },
  { name: 'Jonas W.', score: 82, debates: 29 },
  { name: 'Priya N.', score: 79, debates: 33 },
  { name: 'Sam O.', score: 76, debates: 22 },
  { name: 'Lena M.', score: 73, debates: 26 },
  { name: 'Tariq B.', score: 70, debates: 19 },
  { name: 'Chloe D.', score: 67, debates: 24 },
];

// Builds the user's own row from real saved history. Returns null if the
// user has no completed debates yet (so the page can prompt them to play).
function buildUserRow(displayName) {
  const history = getDebateHistory();
  if (history.length === 0) return null;

  const avg = computeAverageScore(history);
  return {
    name: displayName || 'You',
    score: avg,
    debates: history.length,
    isCurrentUser: true,
    isPlaceholder: false,
  };
}

export function getLeaderboard(displayName) {
  const userRow = buildUserRow(displayName);

  const placeholderRows = PLACEHOLDER_PLAYERS.map((p) => ({
    ...p,
    isCurrentUser: false,
    isPlaceholder: true,
  }));

  // Merge the real user row (if any) into the placeholders, then sort by
  // score descending and assign ranks. This way the user lands wherever
  // their real average actually places them among the sample field.
  const allRows = userRow ? [...placeholderRows, userRow] : placeholderRows;
  allRows.sort((a, b) => b.score - a.score);

  return {
    rows: allRows.map((row, i) => ({ ...row, rank: i + 1 })),
    hasRealUser: Boolean(userRow),
    userRank: userRow ? allRows.findIndex((r) => r.isCurrentUser) + 1 : null,
  };
}
