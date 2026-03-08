import { describe, it, expect } from 'vitest';
import { createWorldLeaderboard } from '../world-leaderboard.js';
import type { LeaderboardDeps } from '../world-leaderboard.js';

function makeDeps(): LeaderboardDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('WorldLeaderboard — board lifecycle', () => {
  it('creates a board', () => {
    const lb = createWorldLeaderboard(makeDeps());
    expect(lb.createBoard('wealth')).toBe(true);
    expect(lb.listBoards()).toHaveLength(1);
  });

  it('rejects duplicate board', () => {
    const lb = createWorldLeaderboard(makeDeps());
    lb.createBoard('wealth');
    expect(lb.createBoard('wealth')).toBe(false);
  });

  it('removes a board', () => {
    const lb = createWorldLeaderboard(makeDeps());
    lb.createBoard('wealth');
    expect(lb.removeBoard('wealth')).toBe(true);
    expect(lb.listBoards()).toHaveLength(0);
  });

  it('returns false for unknown board removal', () => {
    const lb = createWorldLeaderboard(makeDeps());
    expect(lb.removeBoard('unknown')).toBe(false);
  });
});

describe('WorldLeaderboard — score submission', () => {
  it('submits a score', () => {
    const lb = createWorldLeaderboard(makeDeps());
    lb.createBoard('wealth');
    expect(lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 1000 })).toBe(true);
    expect(lb.getScore('wealth', 'd1')).toBe(1000);
  });

  it('keeps higher score on re-submit', () => {
    const lb = createWorldLeaderboard(makeDeps());
    lb.createBoard('wealth');
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 1000 });
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 500 });
    expect(lb.getScore('wealth', 'd1')).toBe(1000);
  });

  it('updates score when higher', () => {
    const lb = createWorldLeaderboard(makeDeps());
    lb.createBoard('wealth');
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 500 });
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 1500 });
    expect(lb.getScore('wealth', 'd1')).toBe(1500);
  });

  it('returns false for unknown board', () => {
    const lb = createWorldLeaderboard(makeDeps());
    expect(lb.submitScore({ boardId: 'unknown', dynastyId: 'd1', score: 100 })).toBe(false);
  });

  it('returns undefined score for unknown dynasty', () => {
    const lb = createWorldLeaderboard(makeDeps());
    lb.createBoard('wealth');
    expect(lb.getScore('wealth', 'unknown')).toBeUndefined();
  });
});

describe('WorldLeaderboard — ranking', () => {
  it('returns top N entries sorted by score', () => {
    const lb = createWorldLeaderboard(makeDeps());
    lb.createBoard('wealth');
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 300 });
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd2', score: 500 });
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd3', score: 100 });
    const top = lb.getTopN('wealth', 2);
    expect(top).toHaveLength(2);
    expect(top[0]?.dynastyId).toBe('d2');
    expect(top[1]?.dynastyId).toBe('d1');
  });

  it('returns empty for unknown board', () => {
    const lb = createWorldLeaderboard(makeDeps());
    expect(lb.getTopN('unknown', 10)).toHaveLength(0);
  });

  it('gets rank for a dynasty', () => {
    const lb = createWorldLeaderboard(makeDeps());
    lb.createBoard('wealth');
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 300 });
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd2', score: 500 });
    const rank = lb.getRank('wealth', 'd1');
    expect(rank?.rank).toBe(2);
    expect(rank?.entry.score).toBe(300);
  });

  it('returns undefined rank for unknown dynasty', () => {
    const lb = createWorldLeaderboard(makeDeps());
    lb.createBoard('wealth');
    expect(lb.getRank('wealth', 'unknown')).toBeUndefined();
  });
});

describe('WorldLeaderboard — reset', () => {
  it('resets board scores', () => {
    const lb = createWorldLeaderboard(makeDeps());
    lb.createBoard('wealth');
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 1000 });
    expect(lb.resetBoard('wealth')).toBe(true);
    expect(lb.getTopN('wealth', 10)).toHaveLength(0);
  });

  it('returns false for unknown board reset', () => {
    const lb = createWorldLeaderboard(makeDeps());
    expect(lb.resetBoard('unknown')).toBe(false);
  });
});

describe('WorldLeaderboard — stats', () => {
  it('starts with zero stats', () => {
    const lb = createWorldLeaderboard(makeDeps());
    const stats = lb.getStats();
    expect(stats.totalBoards).toBe(0);
    expect(stats.totalEntries).toBe(0);
    expect(stats.totalSubmissions).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const lb = createWorldLeaderboard(makeDeps());
    lb.createBoard('wealth');
    lb.createBoard('combat');
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 100 });
    lb.submitScore({ boardId: 'combat', dynastyId: 'd1', score: 50 });
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 200 });
    const stats = lb.getStats();
    expect(stats.totalBoards).toBe(2);
    expect(stats.totalEntries).toBe(2);
    expect(stats.totalSubmissions).toBe(3);
  });
});
