import { describe, expect, it } from 'vitest';
import { createWorldLeaderboard } from '../world-leaderboard.js';

describe('world-leaderboard simulation', () => {
  const make = () => {
    let now = 1_000_000;
    return createWorldLeaderboard({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });
  };

  it('simulates multi-board seasonal standings and rank lookups', () => {
    const lb = make();
    lb.createBoard('wealth');
    lb.createBoard('combat');

    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 1200 });
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd2', score: 900 });
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd3', score: 1500 });

    lb.submitScore({ boardId: 'combat', dynastyId: 'd2', score: 300 });
    lb.submitScore({ boardId: 'combat', dynastyId: 'd1', score: 250 });

    const topWealth = lb.getTopN('wealth', 2);
    expect(topWealth.map((e) => e.dynastyId)).toEqual(['d3', 'd1']);
    expect(lb.getRank('combat', 'd1')?.rank).toBe(2);
  });

  it('simulates score-improvement semantics where only better submissions stick', () => {
    const lb = make();
    lb.createBoard('wealth');

    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 1000 });
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 700 });
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 1800 });

    expect(lb.getScore('wealth', 'd1')).toBe(1800);
    expect(lb.getStats().totalSubmissions).toBe(3);
    expect(lb.getStats().totalEntries).toBe(1);
  });

  it('simulates a board reset between seasons while preserving board registry', () => {
    const lb = make();
    lb.createBoard('wealth');
    lb.submitScore({ boardId: 'wealth', dynastyId: 'd1', score: 400 });

    expect(lb.resetBoard('wealth')).toBe(true);
    expect(lb.getTopN('wealth', 10)).toHaveLength(0);
    expect(lb.listBoards()).toHaveLength(1);
  });
});
