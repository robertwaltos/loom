import { describe, expect, it } from 'vitest';
import { createFrequencyLockService } from '../frequency-lock.js';

function makeService() {
  let t = 1_000_000;
  return createFrequencyLockService({
    clock: { nowMicroseconds: () => (t += 1_000) },
    idGenerator: { next: () => 'lock-1' },
  });
}

describe('frequency-lock simulation', () => {
  it('runs attunement through lock, disruption, and repair', () => {
    const service = makeService();
    const record = service.registerConnection('earth', 'mars');

    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    const locked = service.lockFrequency(record.connectionId);
    expect(typeof locked).toBe('object');

    const disruption = service.disrupt(record.connectionId, 0.7, 'storm');
    expect(typeof disruption).toBe('object');
    if (typeof disruption === 'string') return;
    expect(disruption.newState === 'DISRUPTED' || disruption.newState === 'BROKEN').toBe(true);

    const repaired = service.repair(record.connectionId, 0.8);
    expect(typeof repaired).toBe('object');
    if (typeof repaired === 'string') return;
    expect(repaired.coherence).toBeGreaterThan(0.5);
  });
});
