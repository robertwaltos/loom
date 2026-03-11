/**
 * world-leaderboard.ts — World-scoped leaderboards.
 *
 * Maintains scored leaderboards per world with dynasty entries.
 * Supports score submission, top-N queries, rank lookups, and
 * periodic resets. Each world can have multiple named boards
 * (e.g., "wealth", "exploration", "combat").
 */

// ── Ports ────────────────────────────────────────────────────────

interface LeaderboardClock {
  readonly nowMicroseconds: () => number;
}

interface LeaderboardDeps {
  readonly clock: LeaderboardClock;
}

// ── Types ────────────────────────────────────────────────────────

interface LeaderboardEntry {
  readonly dynastyId: string;
  readonly score: number;
  readonly submittedAt: number;
}

interface SubmitScoreParams {
  readonly boardId: string;
  readonly dynastyId: string;
  readonly score: number;
}

interface RankResult {
  readonly rank: number;
  readonly entry: LeaderboardEntry;
}

interface LeaderboardInfo {
  readonly boardId: string;
  readonly entryCount: number;
  readonly createdAt: number;
}

interface LeaderboardStats {
  readonly totalBoards: number;
  readonly totalEntries: number;
  readonly totalSubmissions: number;
}

interface WorldLeaderboard {
  readonly createBoard: (boardId: string) => boolean;
  readonly removeBoard: (boardId: string) => boolean;
  readonly submitScore: (params: SubmitScoreParams) => boolean;
  readonly getTopN: (boardId: string, n: number) => readonly LeaderboardEntry[];
  readonly getRank: (boardId: string, dynastyId: string) => RankResult | undefined;
  readonly getScore: (boardId: string, dynastyId: string) => number | undefined;
  readonly resetBoard: (boardId: string) => boolean;
  readonly listBoards: () => readonly LeaderboardInfo[];
  readonly getStats: () => LeaderboardStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableBoard {
  readonly boardId: string;
  readonly entries: Map<string, MutableEntry>;
  readonly createdAt: number;
}

interface MutableEntry {
  readonly dynastyId: string;
  score: number;
  submittedAt: number;
}

interface LeaderboardState {
  readonly deps: LeaderboardDeps;
  readonly boards: Map<string, MutableBoard>;
  totalSubmissions: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function sortedEntries(board: MutableBoard): LeaderboardEntry[] {
  const entries = [...board.entries.values()];
  entries.sort((a, b) => b.score - a.score);
  return entries.map((e) => ({
    dynastyId: e.dynastyId,
    score: e.score,
    submittedAt: e.submittedAt,
  }));
}

// ── Operations ───────────────────────────────────────────────────

function createBoardImpl(state: LeaderboardState, boardId: string): boolean {
  if (state.boards.has(boardId)) return false;
  state.boards.set(boardId, {
    boardId,
    entries: new Map(),
    createdAt: state.deps.clock.nowMicroseconds(),
  });
  return true;
}

function removeBoardImpl(state: LeaderboardState, boardId: string): boolean {
  return state.boards.delete(boardId);
}

function submitScoreImpl(state: LeaderboardState, params: SubmitScoreParams): boolean {
  const board = state.boards.get(params.boardId);
  if (!board) return false;
  const now = state.deps.clock.nowMicroseconds();
  const existing = board.entries.get(params.dynastyId);
  if (existing) {
    if (params.score > existing.score) {
      existing.score = params.score;
      existing.submittedAt = now;
    }
  } else {
    board.entries.set(params.dynastyId, {
      dynastyId: params.dynastyId,
      score: params.score,
      submittedAt: now,
    });
  }
  state.totalSubmissions += 1;
  return true;
}

function getTopNImpl(state: LeaderboardState, boardId: string, n: number): LeaderboardEntry[] {
  const board = state.boards.get(boardId);
  if (!board) return [];
  return sortedEntries(board).slice(0, n);
}

function getRankImpl(
  state: LeaderboardState,
  boardId: string,
  dynastyId: string,
): RankResult | undefined {
  const board = state.boards.get(boardId);
  if (!board) return undefined;
  const sorted = sortedEntries(board);
  const index = sorted.findIndex((e) => e.dynastyId === dynastyId);
  if (index < 0) return undefined;
  const entry = sorted[index];
  if (!entry) return undefined;
  return { rank: index + 1, entry };
}

function getScoreImpl(
  state: LeaderboardState,
  boardId: string,
  dynastyId: string,
): number | undefined {
  const board = state.boards.get(boardId);
  if (!board) return undefined;
  return board.entries.get(dynastyId)?.score;
}

function resetBoardImpl(state: LeaderboardState, boardId: string): boolean {
  const board = state.boards.get(boardId);
  if (!board) return false;
  board.entries.clear();
  return true;
}

function listBoardsImpl(state: LeaderboardState): LeaderboardInfo[] {
  const result: LeaderboardInfo[] = [];
  for (const board of state.boards.values()) {
    result.push({
      boardId: board.boardId,
      entryCount: board.entries.size,
      createdAt: board.createdAt,
    });
  }
  return result;
}

function countEntries(state: LeaderboardState): number {
  let total = 0;
  for (const board of state.boards.values()) {
    total += board.entries.size;
  }
  return total;
}

function getStatsImpl(state: LeaderboardState): LeaderboardStats {
  return {
    totalBoards: state.boards.size,
    totalEntries: countEntries(state),
    totalSubmissions: state.totalSubmissions,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createWorldLeaderboard(deps: LeaderboardDeps): WorldLeaderboard {
  const state: LeaderboardState = {
    deps,
    boards: new Map(),
    totalSubmissions: 0,
  };
  return {
    createBoard: (id) => createBoardImpl(state, id),
    removeBoard: (id) => removeBoardImpl(state, id),
    submitScore: (p) => submitScoreImpl(state, p),
    getTopN: (id, n) => getTopNImpl(state, id, n),
    getRank: (id, d) => getRankImpl(state, id, d),
    getScore: (id, d) => getScoreImpl(state, id, d),
    resetBoard: (id) => resetBoardImpl(state, id),
    listBoards: () => listBoardsImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createWorldLeaderboard };
export type {
  WorldLeaderboard,
  LeaderboardDeps,
  LeaderboardEntry,
  SubmitScoreParams,
  RankResult,
  LeaderboardInfo,
  LeaderboardStats,
};
