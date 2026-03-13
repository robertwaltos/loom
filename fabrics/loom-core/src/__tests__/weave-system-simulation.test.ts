import { describe, expect, it } from 'vitest';
import { createWeaveSystem } from '../weave-system.js';
import { createComponentStore } from '../component-store.js';
import type { EntityId } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

describe('weave-system simulation', () => {
  it('simulates completed transit application into world-membership and event publication', () => {
    let id = 0;
    const store = createComponentStore();
    store.set(eid('ship-1'), 'world-membership', {
      worldId: 'earth',
      enteredAt: 100,
      isTransitioning: true,
      transitionTargetWorldId: 'mars',
    });

    const events: string[] = [];
    const system = createWeaveSystem({
      orchestrator: {
        tick: () => ({
          corridorsOpened: 0,
          transitsCompleted: 1,
          transitsAborted: 0,
          activeCorridors: 0,
          tickNumber: 1,
        }),
      },
      completions: { drainCompleted: () => [{ entityId: 'ship-1', destinationNodeId: 'mars' }] },
      componentStore: store,
      clock: { nowMicroseconds: () => 1_000_000 },
      events: { publish: (event) => events.push(event.type) },
      idGenerator: { next: () => 'id-' + String(++id) },
    });

    system({ deltaMs: 33, tickNumber: 1, wallTimeMicroseconds: 33_000 });

    const membership = store.get(eid('ship-1'), 'world-membership') as { worldId: string };
    expect(membership.worldId).toBe('mars');
    expect(events).toEqual(['weave.transition.completed']);
  });
});
