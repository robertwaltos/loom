import { describe, it, expect } from 'vitest';
import { createEntityLifecycleManager } from '../entity-lifecycle.js';
import type { EntityLifecycleDeps, LifecycleTransition } from '../entity-lifecycle.js';

function makeDeps(overrides?: Partial<EntityLifecycleDeps>): EntityLifecycleDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    ...overrides,
  };
}

describe('EntityLifecycle — tracking', () => {
  it('tracks an entity with initial phase', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    const record = mgr.track('e-1', 'active', 'spawned');
    expect(record.entityId).toBe('e-1');
    expect(record.phase).toBe('active');
    expect(record.reason).toBe('spawned');
  });

  it('returns existing record if already tracked', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    mgr.track('e-1', 'active', 'spawned');
    const duplicate = mgr.track('e-1', 'dormant', 'other');
    expect(duplicate.phase).toBe('active');
  });

  it('stores metadata on track', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    const record = mgr.track('e-1', 'active', 'spawned', { worldId: 'w-1' });
    expect(record.metadata).toEqual({ worldId: 'w-1' });
  });

  it('untracks an entity', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    mgr.track('e-1', 'active', 'spawned');
    expect(mgr.untrack('e-1')).toBe(true);
    expect(mgr.getPhase('e-1')).toBeUndefined();
  });

  it('returns false when untracking unknown entity', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    expect(mgr.untrack('unknown')).toBe(false);
  });
});

describe('EntityLifecycle — transitions', () => {
  it('transitions active to dormant', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    mgr.track('e-1', 'active', 'spawned');
    const t = mgr.transition('e-1', 'dormant', 'player offline');
    expect(t.from).toBe('active');
    expect(t.to).toBe('dormant');
    expect(mgr.getPhase('e-1')).toBe('dormant');
  });

  it('transitions active to migrating', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    mgr.track('e-1', 'active', 'spawned');
    const t = mgr.transition('e-1', 'migrating', 'world transit');
    expect(t.to).toBe('migrating');
  });

  it('transitions migrating back to active', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    mgr.track('e-1', 'active', 'spawned');
    mgr.transition('e-1', 'migrating', 'transit started');
    const t = mgr.transition('e-1', 'active', 'transit complete');
    expect(t.from).toBe('migrating');
    expect(t.to).toBe('active');
  });

  it('rejects invalid transition', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    mgr.track('e-1', 'archived', 'expired');
    expect(() => mgr.transition('e-1', 'active', 'revive'))
      .toThrow('Invalid lifecycle transition');
  });

  it('rejects transition for untracked entity', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    expect(() => mgr.transition('e-1', 'active', 'nope'))
      .toThrow('not tracked');
  });

  it('dormant cannot transition to migrating', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    mgr.track('e-1', 'dormant', 'idle');
    expect(() => mgr.transition('e-1', 'migrating', 'nope'))
      .toThrow('Invalid lifecycle transition');
  });
});

describe('EntityLifecycle — history', () => {
  it('records transition history', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    mgr.track('e-1', 'active', 'spawned');
    mgr.transition('e-1', 'dormant', 'offline');
    mgr.transition('e-1', 'active', 'back online');

    const history = mgr.getHistory('e-1');
    expect(history?.transitions).toHaveLength(2);
    expect(history?.currentPhase).toBe('active');
  });

  it('returns undefined history for unknown entity', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    expect(mgr.getHistory('unknown')).toBeUndefined();
  });

  it('evicts old history entries beyond max', () => {
    const mgr = createEntityLifecycleManager(makeDeps({ maxHistoryPerEntity: 2 }));
    mgr.track('e-1', 'active', 'spawned');
    mgr.transition('e-1', 'dormant', 'first');
    mgr.transition('e-1', 'active', 'second');
    mgr.transition('e-1', 'suspended', 'third');

    const history = mgr.getHistory('e-1');
    expect(history?.transitions).toHaveLength(2);
  });
});

describe('EntityLifecycle — queries', () => {
  it('queries entities by phase', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    mgr.track('e-1', 'active', 'spawned');
    mgr.track('e-2', 'dormant', 'idle');
    mgr.track('e-3', 'active', 'spawned');

    const active = mgr.queryByPhase('active');
    expect(active).toHaveLength(2);
    expect(active).toContain('e-1');
    expect(active).toContain('e-3');
  });

  it('returns empty for phase with no entities', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    expect(mgr.queryByPhase('migrating')).toHaveLength(0);
  });

  it('getRecord returns current state', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    mgr.track('e-1', 'active', 'spawned');
    mgr.transition('e-1', 'suspended', 'paused');

    const record = mgr.getRecord('e-1');
    expect(record?.phase).toBe('suspended');
    expect(record?.reason).toBe('paused');
  });

  it('getRecord returns undefined for unknown', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    expect(mgr.getRecord('unknown')).toBeUndefined();
  });
});

describe('EntityLifecycle — callbacks', () => {
  it('notifies on transition', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    const captured: LifecycleTransition[] = [];
    mgr.onTransition((t) => { captured.push(t); });

    mgr.track('e-1', 'active', 'spawned');
    mgr.transition('e-1', 'dormant', 'offline');

    expect(captured).toHaveLength(1);
    expect(captured[0]?.to).toBe('dormant');
  });

  it('supports multiple callbacks', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    let count = 0;
    mgr.onTransition(() => { count++; });
    mgr.onTransition(() => { count++; });

    mgr.track('e-1', 'active', 'spawned');
    mgr.transition('e-1', 'archived', 'expired');

    expect(count).toBe(2);
  });
});

describe('EntityLifecycle — stats', () => {
  it('counts entities by phase', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    mgr.track('e-1', 'active', 'spawned');
    mgr.track('e-2', 'dormant', 'idle');
    mgr.track('e-3', 'active', 'spawned');
    mgr.transition('e-3', 'migrating', 'transit');

    const stats = mgr.getStats();
    expect(stats.trackedCount).toBe(3);
    expect(stats.activeCount).toBe(1);
    expect(stats.dormantCount).toBe(1);
    expect(stats.migratingCount).toBe(1);
    expect(stats.totalTransitions).toBe(1);
  });

  it('starts with zero stats', () => {
    const mgr = createEntityLifecycleManager(makeDeps());
    const stats = mgr.getStats();
    expect(stats.trackedCount).toBe(0);
    expect(stats.totalTransitions).toBe(0);
  });
});
