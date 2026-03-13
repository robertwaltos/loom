import { describe, expect, it } from 'vitest';
import { createEntitySpawnLifecycle } from '../entity-spawn-lifecycle.js';

describe('entity-spawn-lifecycle simulation', () => {
  it('simulates queue-driven spawns, destroy pass, and pooled recycle', () => {
    let now = 1_000_000;
    let id = 0;
    const lifecycle = createEntitySpawnLifecycle({
      clock: { nowMicroseconds: () => (now += 100_000) },
      idGenerator: { generate: () => `spawn-${++id}` },
      poolConfig: { enabled: true, maxPooledPerType: 2 },
    });

    lifecycle.enqueueSpawnWithId('npc-1', 'npc');
    lifecycle.flushSpawns();
    lifecycle.enqueueDestroy('npc-1', 'cleanup');
    const destroyed = lifecycle.flushDestroys();
    lifecycle.enqueueSpawn('npc');
    const respawned = lifecycle.flushSpawns();

    expect(destroyed[0]?.pooled).toBe(true);
    expect(respawned[0]?.recycled).toBe(true);
    expect(respawned[0]?.entityId).toBe('npc-1');
    expect(lifecycle.getStats().activeEntityCount).toBe(1);
  });
});
