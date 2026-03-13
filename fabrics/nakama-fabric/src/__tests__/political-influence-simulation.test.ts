import { describe, expect, it } from 'vitest';
import { createPoliticalInfluence } from '../political-influence.js';

describe('political-influence simulation', () => {
  it('simulates capital accumulation and strategic spend across actions', () => {
    let now = 1_000_000n;
    let seq = 0;
    const system = createPoliticalInfluence({
      clock: { nowMicroseconds: () => now },
      idGen: { generate: () => `pi-${seq++}` },
      logger: { info: () => undefined, warn: () => undefined },
    });

    system.addCapital({ dynastyId: 'dyn-1', worldId: 'w-1', amount: 5_000_000n });
    const sway = system.spendInfluence({
      dynastyId: 'dyn-1',
      action: 'SWAY_VOTE',
      target: { targetType: 'ASSEMBLY', targetId: 'asm-1', worldId: 'w-1' },
    });
    const alliance = system.spendInfluence({
      dynastyId: 'dyn-1',
      action: 'SECURE_ALLIANCE',
      target: { targetType: 'DYNASTY', targetId: 'dyn-2', worldId: 'w-1' },
    });

    expect(typeof sway).toBe('object');
    expect(typeof alliance).toBe('object');
    const status = system.getCapitalStatus({ dynastyId: 'dyn-1', worldId: 'w-1' });
    expect(typeof status).toBe('object');
    if (typeof status !== 'object') return;
    expect(status.currentCapital).toBeLessThan(5_000_000n);
  });
});
