import { describe, expect, it } from 'vitest';
import { createSaveGameSystem } from '../save-game.js';

describe('save-game simulation', () => {
  it('simulates slot lifecycle with multiple snapshots and latest-load retrieval', () => {
    let now = 1_000_000_000n;
    let id = 0;
    const system = createSaveGameSystem({
      clock: { nowUs: () => now++ },
      idGen: { generate: () => `save-${++id}` },
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    system.registerPlayer('player-1');
    const slot = system.createSlot('player-1', 'Main');
    if (typeof slot === 'string') throw new Error('expected slot');

    system.saveState(slot.slotId, { level: 1, hp: 100 });
    system.saveState(slot.slotId, { level: 2, hp: 80 });
    const latest = system.loadLatest(slot.slotId);

    expect(typeof latest).toBe('object');
    if (typeof latest === 'object') expect(latest.data['level']).toBe(2);
    expect(system.getSummary('player-1')?.totalSaves).toBe(2);
  });
});
