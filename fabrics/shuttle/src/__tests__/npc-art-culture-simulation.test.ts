import { describe, expect, it } from 'vitest';
import { createCultureSystem } from '../npc-art-culture.js';

describe('npc-art-culture simulation', () => {
  it('simulates creation, diffusion, and prestige growth across worlds', () => {
    let now = 1_000_000n;
    let id = 0;
    const system = createCultureSystem({
      clock: { nowMicroseconds: () => now },
      idGenerator: { next: () => `art-${++id}` },
      logger: { info: () => undefined },
    });

    const art = system.createArtwork('npc-a', 'MUSIC', 'Symphony of Dust', 'world-a', 90, 88);
    if (typeof art !== 'string') throw new Error('artwork create failed');

    expect(system.spreadCulture(art, 'world-a', 'world-b', 'TRADE')).toBe('ok');
    expect(system.spreadCulture(art, 'world-a', 'world-c', 'DIPLOMACY')).toBe('ok');

    expect(system.computePrestige('world-a')).toBeGreaterThan(0);
    expect(system.computePrestige('world-b')).toBeGreaterThan(0);
    expect(system.getCulturalReport().totalDiffusions).toBe(2);
  });
});
