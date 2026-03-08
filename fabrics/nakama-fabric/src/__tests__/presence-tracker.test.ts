import { describe, it, expect } from 'vitest';
import { createPresenceTracker, DEFAULT_PRESENCE_CONFIG } from '../presence-tracker.js';
import type { PresenceTrackerDeps } from '../presence-tracker.js';

function makeDeps(): PresenceTrackerDeps & { advance: (us: number) => void } {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time },
    advance: (us: number) => { time += us; },
  };
}

describe('PresenceTracker — connect and disconnect', () => {
  it('connects a dynasty', () => {
    const tracker = createPresenceTracker(makeDeps());
    expect(tracker.connect({ dynastyId: 'd1' })).toBe(true);
    expect(tracker.getPresence('d1')?.status).toBe('online');
  });

  it('rejects duplicate connect', () => {
    const tracker = createPresenceTracker(makeDeps());
    tracker.connect({ dynastyId: 'd1' });
    expect(tracker.connect({ dynastyId: 'd1' })).toBe(false);
  });

  it('connects with world', () => {
    const tracker = createPresenceTracker(makeDeps());
    tracker.connect({ dynastyId: 'd1', worldId: 'w1' });
    expect(tracker.getPresence('d1')?.worldId).toBe('w1');
  });

  it('disconnects a dynasty', () => {
    const tracker = createPresenceTracker(makeDeps());
    tracker.connect({ dynastyId: 'd1' });
    expect(tracker.disconnect('d1')).toBe(true);
    expect(tracker.getPresence('d1')?.status).toBe('offline');
  });

  it('returns false for unknown disconnect', () => {
    const tracker = createPresenceTracker(makeDeps());
    expect(tracker.disconnect('unknown')).toBe(false);
  });
});

describe('PresenceTracker — heartbeat', () => {
  it('updates last seen on heartbeat', () => {
    const deps = makeDeps();
    const tracker = createPresenceTracker(deps);
    tracker.connect({ dynastyId: 'd1' });
    deps.advance(5_000_000);
    expect(tracker.heartbeat('d1')).toBe(true);
    const record = tracker.getPresence('d1');
    expect(record?.lastSeenAt).toBe(6_000_000);
  });

  it('returns false for unknown dynasty', () => {
    const tracker = createPresenceTracker(makeDeps());
    expect(tracker.heartbeat('unknown')).toBe(false);
  });

  it('returns false for offline dynasty', () => {
    const tracker = createPresenceTracker(makeDeps());
    tracker.connect({ dynastyId: 'd1' });
    tracker.disconnect('d1');
    expect(tracker.heartbeat('d1')).toBe(false);
  });

  it('restores idle to online', () => {
    const deps = makeDeps();
    const tracker = createPresenceTracker(deps);
    tracker.connect({ dynastyId: 'd1' });
    deps.advance(400_000_000);
    tracker.sweepIdle();
    expect(tracker.getStatus('d1')).toBe('idle');
    tracker.heartbeat('d1');
    expect(tracker.getStatus('d1')).toBe('online');
  });
});

describe('PresenceTracker — world and status', () => {
  it('sets world for dynasty', () => {
    const tracker = createPresenceTracker(makeDeps());
    tracker.connect({ dynastyId: 'd1' });
    expect(tracker.setWorld('d1', 'w2')).toBe(true);
    expect(tracker.getPresence('d1')?.worldId).toBe('w2');
  });

  it('returns offline for unknown dynasty', () => {
    const tracker = createPresenceTracker(makeDeps());
    expect(tracker.getStatus('unknown')).toBe('offline');
  });

  it('lists online dynasties', () => {
    const tracker = createPresenceTracker(makeDeps());
    tracker.connect({ dynastyId: 'd1' });
    tracker.connect({ dynastyId: 'd2' });
    tracker.disconnect('d2');
    expect(tracker.listOnline()).toHaveLength(1);
  });

  it('lists dynasties in a world', () => {
    const tracker = createPresenceTracker(makeDeps());
    tracker.connect({ dynastyId: 'd1', worldId: 'w1' });
    tracker.connect({ dynastyId: 'd2', worldId: 'w1' });
    tracker.connect({ dynastyId: 'd3', worldId: 'w2' });
    expect(tracker.listInWorld('w1')).toHaveLength(2);
  });

  it('excludes offline from world list', () => {
    const tracker = createPresenceTracker(makeDeps());
    tracker.connect({ dynastyId: 'd1', worldId: 'w1' });
    tracker.disconnect('d1');
    expect(tracker.listInWorld('w1')).toHaveLength(0);
  });
});

describe('PresenceTracker — idle sweep', () => {
  it('sweeps idle dynasties', () => {
    const deps = makeDeps();
    const tracker = createPresenceTracker(deps);
    tracker.connect({ dynastyId: 'd1' });
    tracker.connect({ dynastyId: 'd2' });
    deps.advance(400_000_000);
    const count = tracker.sweepIdle();
    expect(count).toBe(2);
    expect(tracker.getStatus('d1')).toBe('idle');
  });

  it('uses default idle threshold', () => {
    expect(DEFAULT_PRESENCE_CONFIG.idleThresholdUs).toBe(300_000_000);
  });

  it('respects custom threshold', () => {
    const deps = makeDeps();
    const tracker = createPresenceTracker(deps, {
      idleThresholdUs: 100_000_000,
    });
    tracker.connect({ dynastyId: 'd1' });
    deps.advance(150_000_000);
    expect(tracker.sweepIdle()).toBe(1);
  });
});

describe('PresenceTracker — stats', () => {
  it('starts with zero stats', () => {
    const tracker = createPresenceTracker(makeDeps());
    const stats = tracker.getStats();
    expect(stats.totalTracked).toBe(0);
    expect(stats.onlineCount).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const deps = makeDeps();
    const tracker = createPresenceTracker(deps);
    tracker.connect({ dynastyId: 'd1' });
    tracker.connect({ dynastyId: 'd2' });
    tracker.disconnect('d2');
    deps.advance(400_000_000);
    tracker.sweepIdle();
    const stats = tracker.getStats();
    expect(stats.totalTracked).toBe(2);
    expect(stats.idleCount).toBe(1);
    expect(stats.offlineCount).toBe(1);
  });
});
