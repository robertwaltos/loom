import { describe, expect, it } from 'vitest';
import { createEntityLifecycleManager } from '../entity-lifecycle.js';

describe('entity-lifecycle simulation', () => {
  it('simulates active->migrating->active lifecycle with transition history', () => {
    let now = 1_000_000;
    const mgr = createEntityLifecycleManager({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });

    mgr.track('entity-1', 'active', 'spawned');
    mgr.transition('entity-1', 'migrating', 'world transit');
    mgr.transition('entity-1', 'active', 'arrival complete');

    const history = mgr.getHistory('entity-1');
    expect(mgr.getPhase('entity-1')).toBe('active');
    expect(history?.transitions.length).toBe(2);
  });
});
