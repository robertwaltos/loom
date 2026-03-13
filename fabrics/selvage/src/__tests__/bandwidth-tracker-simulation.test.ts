import { describe, it, expect } from 'vitest';
import { createBandwidthTracker } from '../bandwidth-tracker.js';

function makeDeps(start = 0) {
  let time = start;
  return {
    deps: { clock: { nowMicroseconds: () => time } },
    advance: (us: number) => { time += us; },
  };
}

describe('Bandwidth Tracker Simulation', () => {
  it('tracks traffic for multiple connections within quota', () => {
    const { deps } = makeDeps();
    const tracker = createBandwidthTracker(deps, { maxBytesPerWindow: 10_000 });

    tracker.register('conn-1');
    tracker.register('conn-2');

    tracker.recordTraffic({ connectionId: 'conn-1', bytesSent: 1_000, bytesReceived: 500 });
    tracker.recordTraffic({ connectionId: 'conn-1', bytesSent: 2_000, bytesReceived: 1_000 });
    tracker.recordTraffic({ connectionId: 'conn-2', bytesSent: 500, bytesReceived: 250 });

    const r1 = tracker.getRecord('conn-1');
    expect(r1).toBeDefined();
    expect(r1!.bytesSent).toBe(3_000);
    expect(r1!.bytesReceived).toBe(1_500);

    const r2 = tracker.getRecord('conn-2');
    expect(r2!.bytesSent).toBe(500);

    const stats = tracker.getStats();
    expect(stats.trackedConnections).toBe(2);
    expect(stats.totalViolations).toBe(0);
  });

  it('flags connections exceeding the bandwidth quota', () => {
    const { deps } = makeDeps();
    const tracker = createBandwidthTracker(deps, { maxBytesPerWindow: 2_000 });

    tracker.register('conn-heavy');
    tracker.recordTraffic({ connectionId: 'conn-heavy', bytesSent: 1_800, bytesReceived: 400 });

    expect(tracker.isOverQuota('conn-heavy')).toBe(true);
    expect(tracker.getStats().totalViolations).toBeGreaterThan(0);
  });

  it('unregisters connections and no longer tracks them', () => {
    const { deps } = makeDeps();
    const tracker = createBandwidthTracker(deps);

    tracker.register('conn-temp');
    tracker.recordTraffic({ connectionId: 'conn-temp', bytesSent: 100, bytesReceived: 50 });
    expect(tracker.getRecord('conn-temp')).toBeDefined();

    tracker.unregister('conn-temp');
    expect(tracker.getRecord('conn-temp')).toBeUndefined();
  });
});
