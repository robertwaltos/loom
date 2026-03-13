import { describe, expect, it } from 'vitest';
import { createWorldReputationService } from '../world-reputation.js';

describe('world-reputation simulation', () => {
  const make = () => {
    let now = 1_000_000;
    return createWorldReputationService({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });
  };

  it('simulates quest rewards and violations across multiple worlds', () => {
    const rep = make();

    rep.change({ dynastyId: 'd1', worldId: 'earth', delta: 250, reason: 'public works' });
    rep.change({ dynastyId: 'd1', worldId: 'mars', delta: -300, reason: 'trade breach' });
    rep.change({ dynastyId: 'd2', worldId: 'earth', delta: 650, reason: 'defense pact' });

    expect(rep.getReputation('d1', 'earth').tier).toBe('respected');
    expect(rep.getReputation('d1', 'mars').tier).toBe('distrusted');
    expect(rep.getReputation('d2', 'earth').tier).toBe('honoured');
  });

  it('simulates boundary clamping under extreme positive and negative events', () => {
    const rep = make();

    rep.change({ dynastyId: 'd1', worldId: 'earth', delta: 50_000, reason: 'stacked commendations' });
    rep.change({ dynastyId: 'd2', worldId: 'earth', delta: -50_000, reason: 'civil war crimes' });

    expect(rep.getReputation('d1', 'earth').score).toBe(1000);
    expect(rep.getReputation('d2', 'earth').score).toBe(-1000);
    expect(rep.getReputation('d1', 'earth').tier).toBe('exalted');
    expect(rep.getReputation('d2', 'earth').tier).toBe('reviled');
  });

  it('simulates reporting views by dynasty and world plus aggregate averages', () => {
    const rep = make();

    rep.change({ dynastyId: 'd1', worldId: 'w1', delta: 100, reason: 'aid convoy' });
    rep.change({ dynastyId: 'd1', worldId: 'w2', delta: 300, reason: 'shared technology' });
    rep.change({ dynastyId: 'd2', worldId: 'w1', delta: -100, reason: 'smuggling' });

    expect(rep.listByDynasty('d1')).toHaveLength(2);
    expect(rep.listByWorld('w1')).toHaveLength(2);

    const stats = rep.getStats();
    expect(stats.trackedPairs).toBe(3);
    expect(stats.averageScore).toBeCloseTo((100 + 300 - 100) / 3, 10);
  });
});
