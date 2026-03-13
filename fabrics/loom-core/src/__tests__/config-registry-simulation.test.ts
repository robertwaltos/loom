import { describe, expect, it } from 'vitest';
import { createConfigRegistry } from '../config-registry.js';

describe('config-registry simulation', () => {
  it('simulates runtime namespace config loading and typed lookup', () => {
    let now = 1_000_000;
    const reg = createConfigRegistry({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });

    reg.loadBulk([
      { namespace: 'game', key: 'tickRate', value: '60' },
      { namespace: 'game', key: 'pvp', value: 'true' },
    ]);

    expect(reg.getNumber('game', 'tickRate')).toBe(60);
    expect(reg.getBoolean('game', 'pvp')).toBe(true);
    expect(reg.getStats().totalEntries).toBe(2);
  });
});
