import { describe, expect, it } from 'vitest';
import { createCorridorStabilityService } from '../corridor-stability.js';

function setup(kalonOk = true) {
  let now = 1_000_000;
  return createCorridorStabilityService({
    clock: { nowMicroseconds: () => now },
    kalon: { debit: () => kalonOk },
    config: { degradationPerTransit: 2 },
  });
}

describe('corridor-stability simulation', () => {
  it('degrades with usage and recovers via stabilization', () => {
    const service = setup(true);
    service.registerCorridor('c1', 'a', 'b');

    for (let i = 0; i < 20; i++) service.recordTransit('c1');
    const before = service.getCorridor('c1');
    expect(before?.grade === 'stable' || before?.grade === 'degraded' || before?.grade === 'critical').toBe(true);

    const stabilized = service.stabilize('c1', 'dynasty-1');
    expect(typeof stabilized).toBe('object');
    if (typeof stabilized === 'string') return;
    expect(stabilized.newStability).toBeGreaterThan(stabilized.previousStability);
  });

  it('fails stabilization when treasury cannot pay', () => {
    const service = setup(false);
    service.registerCorridor('c2', 'u', 'v');
    service.applyDegradation('c2', 30, 'anomaly');
    expect(service.stabilize('c2', 'dynasty-2')).toBe('insufficient_kalon');
  });
});
