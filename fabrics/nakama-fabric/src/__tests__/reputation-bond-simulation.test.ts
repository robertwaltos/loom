import { describe, expect, it } from 'vitest';
import { createReputationBondSystem } from '../reputation-bond.js';

describe('reputation-bond simulation', () => {
  it('simulates bond lifecycle with partial slash and release', () => {
    let now = 1_000_000n;
    let id = 0;
    const system = createReputationBondSystem({
      clock: { nowMicroseconds: () => now },
      idGen: { generateId: () => `rb-${++id}` },
      logger: { info: () => undefined },
    });

    system.registerBonder('bonder-1');
    const created = system.createBond('bonder-1', 'beneficiary-1', 2_000n, 10_000_000n);
    if (typeof created === 'string') throw new Error('createBond failed');

    const slash = system.slashBond(created.bondId, 500n, 'minor breach');
    expect(slash.success).toBe(true);
    const release = system.releaseBond(created.bondId);
    expect(release.success).toBe(true);
    expect(system.getBond(created.bondId)?.status).toBe('RELEASED');
  });
});
