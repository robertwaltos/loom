import { describe, expect, it } from 'vitest';
import { createDayNightCycle } from '../day-night-cycle.js';

describe('day-night-cycle simulation', () => {
  it('simulates a world clock crossing dawn into morning', () => {
    let currentTime = 0n;
    const cycle = createDayNightCycle({
      clock: { nowMicroseconds: () => currentTime },
      logger: { info: () => undefined },
    });

    cycle.registerWorld('world-1', 0n);
    currentTime = 4n * 60n * 60n * 1_000_000n;
    cycle.advanceClock('world-1');
    currentTime = 7n * 60n * 60n * 1_000_000n;
    cycle.advanceClock('world-1');

    expect(cycle.getCurrentPhase('world-1')).toBe('MORNING');
    expect(cycle.getTransitionHistory('world-1').length).toBeGreaterThan(0);
  });
});
