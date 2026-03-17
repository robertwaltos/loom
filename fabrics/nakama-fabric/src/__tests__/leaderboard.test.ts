import { describe, it, expect } from 'vitest';
import { createLeaderboardRegistry } from '../leaderboard.js';
import type { LeaderboardClock } from '../leaderboard.js';

function makeClock(): LeaderboardClock {
  let counter = 0;
  return {
    now: () => {
      counter++;
      return new Date(1_700_000_000_000 + counter * 1_000).toISOString();
    },
  };
}

// ── submitScore ───────────────────────────────────────────────────

describe('Leaderboard — submitScore', () => {
  it('inserts a new player and assigns rank 1', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    board.submitScore('p1', 'Alice', 1000n);
    expect(board.getPlayerRank('p1')).toBe(1);
    expect(board.size()).toBe(1);
  });

  it('replaces score on update and re-ranks correctly', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    board.submitScore('p1', 'Alice', 500n);
    board.submitScore('p2', 'Bob', 1000n);
    expect(board.getPlayerRank('p1')).toBe(2);
    board.submitScore('p1', 'Alice', 2000n);
    expect(board.getPlayerRank('p1')).toBe(1);
    expect(board.getPlayerRank('p2')).toBe(2);
  });

  it('lower re-submit still replaces and pushes player down', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    board.submitScore('p1', 'Alice', 5000n);
    board.submitScore('p2', 'Bob', 1000n);
    board.submitScore('p1', 'Alice', 10n); // score drops
    expect(board.getPlayerRank('p1')).toBe(2);
    expect(board.getPlayerRank('p2')).toBe(1);
  });

  it('updates displayName on re-submit', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('pvp_rating');
    board.submitScore('p1', 'Alice', 500n);
    board.submitScore('p1', 'Alicia', 500n);
    expect(board.getPlayerEntry('p1')?.displayName).toBe('Alicia');
  });
});

// ── Tie-breaking ─────────────────────────────────────────────────

describe('Leaderboard — tie-breaking', () => {
  it('breaks ties by earlier updatedAt — first submitted wins', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    board.submitScore('p1', 'Alice', 1000n); // earlier timestamp
    board.submitScore('p2', 'Bob', 1000n);   // later timestamp
    const top = board.getTopN(2);
    expect(top[0]?.playerId).toBe('p1');
    expect(top[1]?.playerId).toBe('p2');
  });

  it('re-submit with same score moves player behind later-timestamped equal', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    board.submitScore('p1', 'Alice', 1000n);
    board.submitScore('p2', 'Bob', 1000n);
    // re-submit p1 — now has a later timestamp than p2
    board.submitScore('p1', 'Alice', 1000n);
    expect(board.getPlayerRank('p2')).toBe(1);
    expect(board.getPlayerRank('p1')).toBe(2);
  });
});

// ── getTopN ───────────────────────────────────────────────────────

describe('Leaderboard — getTopN', () => {
  it('returns entries sorted descending by score', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('pvp_rating');
    board.submitScore('p1', 'A', 100n);
    board.submitScore('p2', 'B', 500n);
    board.submitScore('p3', 'C', 300n);
    const top2 = board.getTopN(2);
    expect(top2).toHaveLength(2);
    expect(top2[0]?.playerId).toBe('p2');
    expect(top2[1]?.playerId).toBe('p3');
  });

  it('returns all entries when n >= size', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('pvp_rating');
    board.submitScore('p1', 'A', 100n);
    board.submitScore('p2', 'B', 200n);
    expect(board.getTopN(100)).toHaveLength(2);
  });

  it('assigns consecutive 1-based ranks', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    board.submitScore('p1', 'A', 300n);
    board.submitScore('p2', 'B', 200n);
    board.submitScore('p3', 'C', 100n);
    const top = board.getTopN(3);
    expect(top[0]?.rank).toBe(1);
    expect(top[1]?.rank).toBe(2);
    expect(top[2]?.rank).toBe(3);
  });
});

// ── getPlayerRank ─────────────────────────────────────────────────

describe('Leaderboard — getPlayerRank', () => {
  it('returns null for unknown player', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    expect(board.getPlayerRank('ghost')).toBeNull();
  });

  it('returns correct rank after score update', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    board.submitScore('p1', 'A', 100n);
    board.submitScore('p2', 'B', 200n);
    expect(board.getPlayerRank('p1')).toBe(2);
    board.submitScore('p1', 'A', 500n);
    expect(board.getPlayerRank('p1')).toBe(1);
  });
});

// ── getAroundPlayer ───────────────────────────────────────────────

describe('Leaderboard — getAroundPlayer', () => {
  function setupBoard() {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('pvp_rating');
    // ranks after insertion: p5(5000)=1, p4(4000)=2, p3(3000)=3, p2(2000)=4, p1(1000)=5
    board.submitScore('p1', 'P1', 1000n);
    board.submitScore('p2', 'P2', 2000n);
    board.submitScore('p3', 'P3', 3000n);
    board.submitScore('p4', 'P4', 4000n);
    board.submitScore('p5', 'P5', 5000n);
    return board;
  }

  it('returns window entries above + player + window entries below', () => {
    const board = setupBoard();
    const around = board.getAroundPlayer('p3', 1); // rank 3
    expect(around).toHaveLength(3);
    expect(around[0]?.playerId).toBe('p4'); // rank 2
    expect(around[1]?.playerId).toBe('p3'); // rank 3
    expect(around[2]?.playerId).toBe('p2'); // rank 4
  });

  it('clamps at top edge', () => {
    const board = setupBoard();
    const around = board.getAroundPlayer('p5', 2); // rank 1, no entries above
    expect(around[0]?.rank).toBe(1);
    expect(around).toHaveLength(3); // clamped: ranks 1, 2, 3
  });

  it('clamps at bottom edge', () => {
    const board = setupBoard();
    const around = board.getAroundPlayer('p1', 2); // rank 5, no entries below
    expect(around[around.length - 1]?.rank).toBe(5);
    expect(around).toHaveLength(3); // clamped: ranks 3, 4, 5
  });

  it('returns empty for unknown player', () => {
    const board = setupBoard();
    expect(board.getAroundPlayer('ghost', 2)).toHaveLength(0);
  });
});

// ── removePlayer ──────────────────────────────────────────────────

describe('Leaderboard — removePlayer', () => {
  it('removes player, shifts ranks, nulls out old rank', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    board.submitScore('p1', 'A', 300n);
    board.submitScore('p2', 'B', 200n);
    board.submitScore('p3', 'C', 100n);
    board.removePlayer('p2');
    expect(board.size()).toBe(2);
    expect(board.getPlayerRank('p1')).toBe(1);
    expect(board.getPlayerRank('p3')).toBe(2);
    expect(board.getPlayerRank('p2')).toBeNull();
  });
});

// ── Registry ─────────────────────────────────────────────────────

describe('Leaderboard — registry', () => {
  it('multiple board types are independent', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const wealth = registry.getOrCreate('global_wealth');
    const pvp = registry.getOrCreate('pvp_rating');
    wealth.submitScore('p1', 'Alice', 9999n);
    expect(pvp.getPlayerRank('p1')).toBeNull();
    expect(pvp.size()).toBe(0);
  });

  it('reset clears board — snapshot returns empty', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    board.submitScore('p1', 'Alice', 9999n);
    registry.reset('global_wealth');
    expect(registry.snapshot('global_wealth')).toHaveLength(0);
  });

  it('snapshot returns ordered copy of all entries', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('dynasty_age');
    board.submitScore('p1', 'A', 100n);
    board.submitScore('p2', 'B', 300n);
    board.submitScore('p3', 'C', 200n);
    const snap = registry.snapshot('dynasty_age');
    expect(snap).toHaveLength(3);
    expect(snap[0]?.score).toBe(300n);
    expect(snap[1]?.score).toBe(200n);
    expect(snap[2]?.score).toBe(100n);
  });

  it('snapshot returns empty for unknown board', () => {
    const registry = createLeaderboardRegistry(makeClock());
    expect(registry.snapshot('chronicle_entries')).toHaveLength(0);
  });

  it('list returns all created board ids', () => {
    const registry = createLeaderboardRegistry(makeClock());
    registry.getOrCreate('global_wealth');
    registry.getOrCreate('pvp_rating');
    const listed = registry.list();
    expect(listed).toContain('global_wealth');
    expect(listed).toContain('pvp_rating');
    expect(listed).toHaveLength(2);
  });

  it('getOrCreate returns the same board instance', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const b1 = registry.getOrCreate('world_dominance');
    const b2 = registry.getOrCreate('world_dominance');
    b1.submitScore('p1', 'A', 100n);
    expect(b2.size()).toBe(1);
  });
});

// ── bigint and size ────────────────────────────────────────────────

describe('Leaderboard — bigint scores and size', () => {
  it('handles very large bigint scores without precision loss', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    const huge = 10n ** 30n;
    board.submitScore('p1', 'A', huge);
    expect(board.getPlayerEntry('p1')?.score).toBe(huge);
  });

  it('correctly ranks players with bigint scores', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    board.submitScore('p1', 'A', 10n ** 18n);
    board.submitScore('p2', 'B', 10n ** 20n);
    expect(board.getPlayerRank('p2')).toBe(1);
    expect(board.getPlayerRank('p1')).toBe(2);
  });

  it('size reflects current player count accurately', () => {
    const registry = createLeaderboardRegistry(makeClock());
    const board = registry.getOrCreate('global_wealth');
    expect(board.size()).toBe(0);
    board.submitScore('p1', 'A', 100n);
    expect(board.size()).toBe(1);
    board.submitScore('p2', 'B', 200n);
    expect(board.size()).toBe(2);
    board.submitScore('p1', 'A', 999n); // upsert, no size change
    expect(board.size()).toBe(2);
    board.removePlayer('p1');
    expect(board.size()).toBe(1);
  });
});
