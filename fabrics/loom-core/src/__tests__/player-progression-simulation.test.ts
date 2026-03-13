import { describe, expect, it } from 'vitest';
import { createPlayerProgressionSystem } from '../player-progression.js';

describe('player-progression simulation', () => {
  it('simulates xp growth, skill learning, and upgrades through prerequisite chains', () => {
    let now = 1_000_000n;
    let id = 0;
    const system = createPlayerProgressionSystem({
      clock: { nowUs: () => now++ },
      idGen: { generate: () => `prog-${++id}` },
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    system.registerPlayer('player-1', 5_000n);
    system.defineSkill('fire-1', 'Fire I', 'Base', 3, 100n, null);
    system.defineSkill('fire-2', 'Fire II', 'Advanced', 3, 200n, 'fire-1');
    system.learnSkill('player-1', 'fire-1');
    system.learnSkill('player-1', 'fire-2');
    const upgraded = system.upgradeSkill('player-1', 'fire-2');

    expect(upgraded.success).toBe(true);
    expect(system.getStats('player-1')?.skillsLearned).toBe(2);
    expect((system.getSkill('player-1', 'fire-2')?.currentRank ?? 0)).toBeGreaterThanOrEqual(2);
  });
});
