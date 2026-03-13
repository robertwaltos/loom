import { describe, expect, it } from 'vitest';
import { createPopulationEconomySystem } from '../population-economy.js';

describe('population-economy simulation', () => {
  it('simulates growth, productivity uplift, and snapshot reporting', () => {
    let now = 1_000_000n;
    let seq = 0;
    const system = createPopulationEconomySystem({
      clock: { nowMicroseconds: () => (now += 1_000_000n) },
      idGen: { generateId: () => `pop-${++seq}` },
      logger: { info: () => undefined },
    });

    system.registerWorld('world-1', 900_000n, 250);
    system.setProductivityIndex('world-1', 1.3);
    const growth = system.simulateGrowth('world-1', 3);
    expect(growth.success).toBe(true);
    if (!growth.success) return;

    system.updatePopulation('world-1', growth.projectedPopulation);
    const snap = system.takeSnapshot('world-1');
    expect(typeof snap).toBe('object');
    if (typeof snap !== 'object') return;
    expect(['ESTABLISHED', 'PROSPEROUS', 'DOMINANT']).toContain(snap.tier);
    expect(system.listSnapshots('world-1').length).toBe(1);
  });
});
