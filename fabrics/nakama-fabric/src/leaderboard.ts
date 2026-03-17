/**
 * leaderboard.ts — Generic leaderboard engine for Koydo.
 *
 * Supports five board types with bigint scores, 1-based ranking sorted
 * descending by score, ties broken by earlier updatedAt (ISO 8601).
 * Uses port-based design — inject a LeaderboardClock for determinism.
 */

// ── Types ────────────────────────────────────────────────────────

export type LeaderboardType =
  | 'global_wealth'
  | 'world_dominance'
  | 'chronicle_entries'
  | 'dynasty_age'
  | 'pvp_rating';

export interface LeaderboardEntry {
  readonly rank: number;
  readonly playerId: string;
  readonly displayName: string;
  readonly score: bigint;
  readonly updatedAt: string; // ISO 8601
}

export interface Leaderboard {
  submitScore(playerId: string, displayName: string, score: bigint): void;
  getTopN(n: number): ReadonlyArray<LeaderboardEntry>;
  getPlayerRank(playerId: string): number | null;
  getPlayerEntry(playerId: string): LeaderboardEntry | null;
  getAroundPlayer(playerId: string, window: number): ReadonlyArray<LeaderboardEntry>;
  removePlayer(playerId: string): void;
  size(): number;
}

export interface LeaderboardRegistry {
  getOrCreate(boardId: LeaderboardType): Leaderboard;
  list(): ReadonlyArray<LeaderboardType>;
  reset(boardId: LeaderboardType): void;
  snapshot(boardId: LeaderboardType): ReadonlyArray<LeaderboardEntry>;
}

// ── Port ─────────────────────────────────────────────────────────

export interface LeaderboardClock {
  readonly now: () => string;
}

// ── Internal State ───────────────────────────────────────────────

interface MutableEntry {
  playerId: string;
  displayName: string;
  score: bigint;
  updatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function sortEntries(entries: MutableEntry[]): MutableEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score > a.score) return 1;
    if (b.score < a.score) return -1;
    // Earlier updatedAt wins ties
    if (a.updatedAt < b.updatedAt) return -1;
    if (a.updatedAt > b.updatedAt) return 1;
    return 0;
  });
}

function toEntry(raw: MutableEntry, rank: number): LeaderboardEntry {
  return {
    rank,
    playerId: raw.playerId,
    displayName: raw.displayName,
    score: raw.score,
    updatedAt: raw.updatedAt,
  };
}

// ── Board ────────────────────────────────────────────────────────

function createLeaderboard(clock: LeaderboardClock): Leaderboard {
  const players = new Map<string, MutableEntry>();

  function getSorted(): MutableEntry[] {
    return sortEntries([...players.values()]);
  }

  function submitScore(playerId: string, displayName: string, score: bigint): void {
    players.set(playerId, { playerId, displayName, score, updatedAt: clock.now() });
  }

  function getTopN(n: number): ReadonlyArray<LeaderboardEntry> {
    return getSorted()
      .slice(0, n)
      .map((e, i) => toEntry(e, i + 1));
  }

  function getPlayerRank(playerId: string): number | null {
    if (!players.has(playerId)) return null;
    const index = getSorted().findIndex((e) => e.playerId === playerId);
    return index < 0 ? null : index + 1;
  }

  function getPlayerEntry(playerId: string): LeaderboardEntry | null {
    const rank = getPlayerRank(playerId);
    if (rank === null) return null;
    const sorted = getSorted();
    const raw = sorted[rank - 1];
    return raw !== undefined ? toEntry(raw, rank) : null;
  }

  function getAroundPlayer(playerId: string, window: number): ReadonlyArray<LeaderboardEntry> {
    const rank = getPlayerRank(playerId);
    if (rank === null) return [];
    const sorted = getSorted();
    const idx = rank - 1;
    const start = Math.max(0, idx - window);
    const end = Math.min(sorted.length - 1, idx + window);
    const result: LeaderboardEntry[] = [];
    for (let i = start; i <= end; i++) {
      const raw = sorted[i];
      if (raw !== undefined) {
        result.push(toEntry(raw, i + 1));
      }
    }
    return result;
  }

  function removePlayer(playerId: string): void {
    players.delete(playerId);
  }

  function size(): number {
    return players.size;
  }

  return { submitScore, getTopN, getPlayerRank, getPlayerEntry, getAroundPlayer, removePlayer, size };
}

// ── Registry ─────────────────────────────────────────────────────

export function createLeaderboardRegistry(clock?: LeaderboardClock): LeaderboardRegistry {
  const effectiveClock: LeaderboardClock = clock ?? { now: () => new Date().toISOString() };
  const boards = new Map<LeaderboardType, Leaderboard>();

  function getOrCreate(boardId: LeaderboardType): Leaderboard {
    const existing = boards.get(boardId);
    if (existing !== undefined) return existing;
    const board = createLeaderboard(effectiveClock);
    boards.set(boardId, board);
    return board;
  }

  function list(): ReadonlyArray<LeaderboardType> {
    return [...boards.keys()];
  }

  function reset(boardId: LeaderboardType): void {
    boards.set(boardId, createLeaderboard(effectiveClock));
  }

  function snapshot(boardId: LeaderboardType): ReadonlyArray<LeaderboardEntry> {
    const board = boards.get(boardId);
    return board !== undefined ? board.getTopN(board.size()) : [];
  }

  return { getOrCreate, list, reset, snapshot };
}
