import { describe, expect, it } from 'vitest';
import { createShuttleSystem, createEcsPopulationAdapter } from '../shuttle-system.js';
import { createComponentStore } from '../component-store.js';
import type { EntityId } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

describe('shuttle-system simulation', () => {
  it('simulates ECS npc discovery and orchestrator ticking across worlds', () => {
    const store = createComponentStore();
    store.set(eid('npc-1'), 'npc-tier', {
      tier: 1,
      memoryWindowDays: 90,
      aiBackend: 'behavior-tree',
      canCreateAssets: false,
    });
    store.set(eid('npc-1'), 'world-membership', {
      worldId: 'earth',
      enteredAt: 1,
      isTransitioning: false,
      transitionTargetWorldId: null,
    });

    const population = createEcsPopulationAdapter(store);
    const earthNpcs = population.listActiveNpcs('earth');

    const ticks: Array<{ worldId: string; deltaUs: number }> = [];
    const system = createShuttleSystem({
      orchestrator: {
        tick: (worldId, deltaUs) => {
          ticks.push({ worldId, deltaUs });
          return { npcsProcessed: 1, decisionsActed: 1, tickNumber: ticks.length };
        },
      },
      componentStore: store,
      worldList: { listWorldIds: () => ['earth', 'mars'] },
    });

    system({ deltaMs: 20, tickNumber: 3, wallTimeMicroseconds: 60_000 });

    expect(earthNpcs).toHaveLength(1);
    expect(earthNpcs[0]?.npcId).toBe('npc-1');
    expect(ticks).toEqual([
      { worldId: 'earth', deltaUs: 20_000 },
      { worldId: 'mars', deltaUs: 20_000 },
    ]);
  });
});
