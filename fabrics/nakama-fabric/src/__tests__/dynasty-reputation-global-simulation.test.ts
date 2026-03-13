import { describe, expect, it } from 'vitest';
import { createDynastyReputationGlobalEngine } from '../dynasty-reputation-global.js';

describe('dynasty reputation global simulation', () => {
  it('simulates cross-world aggregation and leaderboard shifts', () => {
    let now = 1_000_000;
    let id = 0;
    const engine = createDynastyReputationGlobalEngine({
      clock: { nowMicroseconds: () => now },
      idGenerator: { next: () => 'r-' + String(id++) },
    });

    engine.recordWorldReputation({ dynastyId: 'atlas', worldId: 'core', score: 900, worldTier: 5 });
    engine.recordWorldReputation({ dynastyId: 'atlas', worldId: 'fringe', score: 300, worldTier: 1 });
    engine.recordWorldReputation({ dynastyId: 'nova', worldId: 'core', score: 700, worldTier: 5 });

    const atlas = engine.computeGlobalScore('atlas');
    const nova = engine.computeGlobalScore('nova');

    expect(typeof atlas).toBe('object');
    expect(typeof nova).toBe('object');

    const top = engine.getTopDynasties(2);
    expect(top).toHaveLength(2);
    expect(top[0]?.dynastyId).toBe('atlas');

    now += 10_000;
    engine.computeGlobalScore('atlas');
    expect(engine.getReputationHistory('atlas').length).toBe(3);
  });
});
