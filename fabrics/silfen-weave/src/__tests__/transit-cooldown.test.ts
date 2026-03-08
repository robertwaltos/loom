import { describe, it, expect } from 'vitest';
import { createTransitCooldownTracker } from '../transit-cooldown.js';
import type { TransitCooldownDeps } from '../transit-cooldown.js';

function makeDeps(): TransitCooldownDeps & { advance: (us: number) => void } {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time },
    advance: (us: number) => { time += us; },
  };
}

describe('TransitCooldownTracker — start cooldown', () => {
  it('starts a cooldown for an entity', () => {
    const tracker = createTransitCooldownTracker(makeDeps());
    const record = tracker.startCooldown({ entityId: 'e1', cooldownUs: 10_000_000 });
    expect(record.entityId).toBe('e1');
    expect(record.transitCount).toBe(1);
  });

  it('increments transit count on re-transit', () => {
    const tracker = createTransitCooldownTracker(makeDeps());
    tracker.startCooldown({ entityId: 'e1', cooldownUs: 10_000_000 });
    const record = tracker.startCooldown({ entityId: 'e1', cooldownUs: 10_000_000 });
    expect(record.transitCount).toBe(2);
  });

  it('retrieves cooldown record', () => {
    const tracker = createTransitCooldownTracker(makeDeps());
    tracker.startCooldown({ entityId: 'e1', cooldownUs: 10_000_000 });
    const record = tracker.getRecord('e1');
    expect(record?.entityId).toBe('e1');
  });

  it('returns undefined for unknown entity', () => {
    const tracker = createTransitCooldownTracker(makeDeps());
    expect(tracker.getRecord('unknown')).toBeUndefined();
  });
});

describe('TransitCooldownTracker — cooldown state', () => {
  it('reports entity on cooldown', () => {
    const tracker = createTransitCooldownTracker(makeDeps());
    tracker.startCooldown({ entityId: 'e1', cooldownUs: 10_000_000 });
    expect(tracker.isOnCooldown('e1')).toBe(true);
  });

  it('reports entity off cooldown after expiry', () => {
    const deps = makeDeps();
    const tracker = createTransitCooldownTracker(deps);
    tracker.startCooldown({ entityId: 'e1', cooldownUs: 5_000_000 });
    deps.advance(10_000_000);
    expect(tracker.isOnCooldown('e1')).toBe(false);
  });

  it('reports false for unknown entity', () => {
    const tracker = createTransitCooldownTracker(makeDeps());
    expect(tracker.isOnCooldown('unknown')).toBe(false);
  });

  it('calculates remaining cooldown time', () => {
    const deps = makeDeps();
    const tracker = createTransitCooldownTracker(deps);
    tracker.startCooldown({ entityId: 'e1', cooldownUs: 10_000_000 });
    deps.advance(3_000_000);
    const remaining = tracker.getRemainingUs('e1');
    expect(remaining).toBe(7_000_000);
  });

  it('returns zero remaining for expired cooldown', () => {
    const deps = makeDeps();
    const tracker = createTransitCooldownTracker(deps);
    tracker.startCooldown({ entityId: 'e1', cooldownUs: 5_000_000 });
    deps.advance(10_000_000);
    expect(tracker.getRemainingUs('e1')).toBe(0);
  });

  it('returns zero remaining for unknown entity', () => {
    const tracker = createTransitCooldownTracker(makeDeps());
    expect(tracker.getRemainingUs('unknown')).toBe(0);
  });
});

describe('TransitCooldownTracker — clear and list', () => {
  it('clears a cooldown', () => {
    const tracker = createTransitCooldownTracker(makeDeps());
    tracker.startCooldown({ entityId: 'e1', cooldownUs: 10_000_000 });
    expect(tracker.clearCooldown('e1')).toBe(true);
    expect(tracker.isOnCooldown('e1')).toBe(false);
  });

  it('returns false for unknown clear', () => {
    const tracker = createTransitCooldownTracker(makeDeps());
    expect(tracker.clearCooldown('unknown')).toBe(false);
  });

  it('lists entities currently on cooldown', () => {
    const deps = makeDeps();
    const tracker = createTransitCooldownTracker(deps);
    tracker.startCooldown({ entityId: 'e1', cooldownUs: 10_000_000 });
    tracker.startCooldown({ entityId: 'e2', cooldownUs: 5_000_000 });
    deps.advance(7_000_000);
    const onCooldown = tracker.listOnCooldown();
    expect(onCooldown).toHaveLength(1);
    expect(onCooldown[0]?.entityId).toBe('e1');
  });
});

describe('TransitCooldownTracker — stats', () => {
  it('starts with zero stats', () => {
    const tracker = createTransitCooldownTracker(makeDeps());
    const stats = tracker.getStats();
    expect(stats.totalEntities).toBe(0);
    expect(stats.entitiesOnCooldown).toBe(0);
    expect(stats.totalTransits).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const tracker = createTransitCooldownTracker(makeDeps());
    tracker.startCooldown({ entityId: 'e1', cooldownUs: 10_000_000 });
    tracker.startCooldown({ entityId: 'e2', cooldownUs: 10_000_000 });
    tracker.startCooldown({ entityId: 'e1', cooldownUs: 10_000_000 });
    const stats = tracker.getStats();
    expect(stats.totalEntities).toBe(2);
    expect(stats.entitiesOnCooldown).toBe(2);
    expect(stats.totalTransits).toBe(3);
  });
});
