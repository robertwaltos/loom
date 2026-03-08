import { describe, it, expect } from 'vitest';
import { createBandwidthTracker } from '../bandwidth-tracker.js';
import type { BandwidthTrackerDeps } from '../bandwidth-tracker.js';

function makeDeps(): BandwidthTrackerDeps & { advance: (us: number) => void } {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time },
    advance: (us: number) => { time += us; },
  };
}

describe('BandwidthTracker — registration', () => {
  it('registers a connection', () => {
    const tracker = createBandwidthTracker(makeDeps());
    expect(tracker.register('c1')).toBe(true);
    expect(tracker.getStats().trackedConnections).toBe(1);
  });

  it('rejects duplicate registration', () => {
    const tracker = createBandwidthTracker(makeDeps());
    tracker.register('c1');
    expect(tracker.register('c1')).toBe(false);
  });

  it('unregisters a connection', () => {
    const tracker = createBandwidthTracker(makeDeps());
    tracker.register('c1');
    expect(tracker.unregister('c1')).toBe(true);
    expect(tracker.getStats().trackedConnections).toBe(0);
  });
});

describe('BandwidthTracker — traffic recording', () => {
  it('records traffic', () => {
    const tracker = createBandwidthTracker(makeDeps());
    tracker.register('c1');
    expect(tracker.recordTraffic({
      connectionId: 'c1', bytesSent: 1000, bytesReceived: 500,
    })).toBe(true);
    const record = tracker.getRecord('c1');
    expect(record?.bytesSent).toBe(1000);
    expect(record?.bytesReceived).toBe(500);
  });

  it('accumulates traffic', () => {
    const tracker = createBandwidthTracker(makeDeps());
    tracker.register('c1');
    tracker.recordTraffic({ connectionId: 'c1', bytesSent: 100, bytesReceived: 50 });
    tracker.recordTraffic({ connectionId: 'c1', bytesSent: 200, bytesReceived: 100 });
    const record = tracker.getRecord('c1');
    expect(record?.bytesSent).toBe(300);
    expect(record?.bytesReceived).toBe(150);
  });

  it('returns false for unknown connection', () => {
    const tracker = createBandwidthTracker(makeDeps());
    expect(tracker.recordTraffic({
      connectionId: 'unknown', bytesSent: 100, bytesReceived: 50,
    })).toBe(false);
  });
});

describe('BandwidthTracker — quota enforcement', () => {
  it('detects over-quota connection', () => {
    const tracker = createBandwidthTracker(makeDeps(), {
      maxBytesPerWindow: 1000,
    });
    tracker.register('c1');
    tracker.recordTraffic({ connectionId: 'c1', bytesSent: 600, bytesReceived: 500 });
    expect(tracker.isOverQuota('c1')).toBe(true);
  });

  it('reports within quota', () => {
    const tracker = createBandwidthTracker(makeDeps(), {
      maxBytesPerWindow: 1000,
    });
    tracker.register('c1');
    tracker.recordTraffic({ connectionId: 'c1', bytesSent: 100, bytesReceived: 50 });
    expect(tracker.isOverQuota('c1')).toBe(false);
  });

  it('returns false for unknown connection', () => {
    const tracker = createBandwidthTracker(makeDeps());
    expect(tracker.isOverQuota('unknown')).toBe(false);
  });
});

describe('BandwidthTracker — window reset', () => {
  it('manually resets window', () => {
    const tracker = createBandwidthTracker(makeDeps());
    tracker.register('c1');
    tracker.recordTraffic({ connectionId: 'c1', bytesSent: 1000, bytesReceived: 500 });
    expect(tracker.resetWindow('c1')).toBe(true);
    const record = tracker.getRecord('c1');
    expect(record?.bytesSent).toBe(0);
    expect(record?.bytesReceived).toBe(0);
  });

  it('auto-resets on window expiry', () => {
    const deps = makeDeps();
    const tracker = createBandwidthTracker(deps, {
      windowUs: 10_000_000,
    });
    tracker.register('c1');
    tracker.recordTraffic({ connectionId: 'c1', bytesSent: 5000, bytesReceived: 0 });
    deps.advance(15_000_000);
    tracker.recordTraffic({ connectionId: 'c1', bytesSent: 100, bytesReceived: 0 });
    const record = tracker.getRecord('c1');
    expect(record?.bytesSent).toBe(100);
  });
});

describe('BandwidthTracker — stats', () => {
  it('tracks aggregate statistics', () => {
    const tracker = createBandwidthTracker(makeDeps(), {
      maxBytesPerWindow: 500,
    });
    tracker.register('c1');
    tracker.recordTraffic({ connectionId: 'c1', bytesSent: 300, bytesReceived: 300 });
    const stats = tracker.getStats();
    expect(stats.trackedConnections).toBe(1);
    expect(stats.totalBytesSent).toBe(300);
    expect(stats.totalBytesReceived).toBe(300);
    expect(stats.totalViolations).toBe(1);
  });

  it('starts with zero stats', () => {
    const tracker = createBandwidthTracker(makeDeps());
    const stats = tracker.getStats();
    expect(stats.trackedConnections).toBe(0);
    expect(stats.totalBytesSent).toBe(0);
  });
});
