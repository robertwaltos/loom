import { describe, expect, it } from 'vitest';
import { createMatchmakingEngine } from '../matchmaking.js';

describe('matchmaking simulation', () => {
  it('simulates queueing, grouping, and cancellation in one cycle', () => {
    let now = 1_000_000;
    let id = 0;
    const engine = createMatchmakingEngine({
      idGenerator: { next: () => `mm-${++id}` },
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });

    const t1 = engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 40 });
    engine.submit({ dynastyId: 'd2', activityType: 'raid', skillMin: 30, skillMax: 70 });
    engine.submit({ dynastyId: 'd3', activityType: 'trade', skillMin: 0, skillMax: 100 });

    const groups = engine.findMatches();
    expect(groups).toHaveLength(1);
    expect(groups[0].dynastyIds.sort()).toEqual(['d1', 'd2']);

    const cancelled = engine.cancel(t1.ticketId);
    expect(cancelled).toBe(false);
    expect(engine.getStats().groupsFormed).toBe(1);
  });
});
