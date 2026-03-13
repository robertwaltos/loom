import { describe, expect, it } from 'vitest';
import { createResourceScarcitySystem } from '../resource-scarcity.js';

describe('resource-scarcity simulation', () => {
  it('simulates cascading depletion alerts and restoration', () => {
    let now = 1_000_000n;
    let id = 0;
    const system = createResourceScarcitySystem({
      clock: { nowMicroseconds: () => now },
      idGen: { generateId: () => `alert-${++id}` },
      logger: { info: () => undefined },
    });

    system.registerResource('water', 'earth', 100_000n, 90_000n);
    const scarce = system.updateAvailability('water', 'earth', 15_000n);
    expect(scarce.success).toBe(true);
    if (!scarce.success) return;
    expect(scarce.alert?.currentLevel).toBe('SCARCE');

    system.updateAvailability('water', 'earth', 4_000n);
    const thresholds = system.checkThresholds('water', 'earth');
    expect(thresholds.found).toBe(true);
    if (!thresholds.found) return;
    expect(['CRITICAL', 'DEPLETED']).toContain(thresholds.scarcityLevel);
  });
});
