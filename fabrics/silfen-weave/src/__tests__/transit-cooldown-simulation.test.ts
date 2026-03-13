import { describe, expect, it } from 'vitest';
import { createTransitCooldownTracker } from '../transit-cooldown.js';

describe('transit-cooldown simulation', () => {
  it('enforces cooldown windows and tracks repeated transits', () => {
    let now = 1_000_000;
    const tracker = createTransitCooldownTracker({
      clock: { nowMicroseconds: () => now },
    });

    tracker.startCooldown({ entityId: 'e1', cooldownUs: 10_000_000 });
    expect(tracker.isOnCooldown('e1')).toBe(true);

    now += 4_000_000;
    expect(tracker.getRemainingUs('e1')).toBe(6_000_000);
    tracker.startCooldown({ entityId: 'e1', cooldownUs: 8_000_000 });
    expect(tracker.getRecord('e1')?.transitCount).toBe(2);
  });
});
