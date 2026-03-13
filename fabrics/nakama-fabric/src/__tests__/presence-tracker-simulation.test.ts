import { describe, expect, it } from 'vitest';
import { createPresenceTracker } from '../presence-tracker.js';
import type { PresenceTrackerDeps } from '../presence-tracker.js';

describe('presence-tracker simulation', () => {
  const makeDeps = (): PresenceTrackerDeps & { advance: (deltaUs: number) => void } => {
    let now = 1_000_000;
    return {
      clock: { nowMicroseconds: () => now },
      advance: (deltaUs) => {
        now += deltaUs;
      },
    };
  };

  it('simulates connect, heartbeat, idle sweep, and reconnect cadence', () => {
    const deps = makeDeps();
    const tracker = createPresenceTracker(deps);

    tracker.connect({ dynastyId: 'd1', worldId: 'earth' });
    tracker.connect({ dynastyId: 'd2', worldId: 'earth' });
    tracker.connect({ dynastyId: 'd3', worldId: 'mars' });

    deps.advance(301_000_000);
    expect(tracker.sweepIdle()).toBe(3);
    expect(tracker.getStatus('d1')).toBe('idle');

    tracker.heartbeat('d1');
    expect(tracker.getStatus('d1')).toBe('online');
  });

  it('simulates world migrations while preserving presence visibility', () => {
    const deps = makeDeps();
    const tracker = createPresenceTracker(deps);

    tracker.connect({ dynastyId: 'd1', worldId: 'earth' });
    tracker.connect({ dynastyId: 'd2', worldId: 'earth' });
    expect(tracker.listInWorld('earth')).toHaveLength(2);

    tracker.setWorld('d2', 'venus');
    expect(tracker.listInWorld('earth')).toHaveLength(1);
    expect(tracker.listInWorld('venus')).toHaveLength(1);
  });

  it('simulates status distribution after mixed disconnect and idle events', () => {
    const deps = makeDeps();
    const tracker = createPresenceTracker(deps, { idleThresholdUs: 100_000_000 });

    tracker.connect({ dynastyId: 'd1' });
    tracker.connect({ dynastyId: 'd2' });
    tracker.connect({ dynastyId: 'd3' });

    tracker.disconnect('d3');
    deps.advance(101_000_000);
    tracker.sweepIdle();

    const stats = tracker.getStats();
    expect(stats).toEqual({ totalTracked: 3, onlineCount: 0, idleCount: 2, offlineCount: 1 });
  });
});
