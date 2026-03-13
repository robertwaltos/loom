import { describe, expect, it } from 'vitest';
import { createEconomicCrisisSystem } from '../economic-crisis.js';

describe('economic-crisis simulation', () => {
  it('simulates escalation from warning to intervention', () => {
    let now = 1_000_000n;
    let id = 0;
    const system = createEconomicCrisisSystem({
      clock: { nowMicroseconds: () => (now += 1_000n) },
      idGen: { generateId: () => `cr-${++id}` },
      logger: { info: () => undefined },
    });

    system.updateIndicator('world-a', 'INFLATION_RATE', 0.12);
    system.updateIndicator('world-a', 'UNEMPLOYMENT_RATE', 0.2);

    const trigger = system.checkCrisisTriggers('world-a');
    expect(trigger.triggered).toBe(true);
    if (!trigger.triggered) return;

    expect(['WARNING', 'CRISIS']).toContain(trigger.crisisTrigger.phase);
    expect(system.getCurrentPhase('world-a')).toBe(trigger.crisisTrigger.phase);
  });
});
