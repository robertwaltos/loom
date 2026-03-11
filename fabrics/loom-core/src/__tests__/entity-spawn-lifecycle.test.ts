import { describe, it, expect } from 'vitest';
import { createEntitySpawnLifecycle } from '../entity-spawn-lifecycle.js';
import type { SpawnLifecycleDeps, LifecycleEvent } from '../entity-spawn-lifecycle.js';

function makeDeps(overrides?: Partial<SpawnLifecycleDeps>): SpawnLifecycleDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: {
      generate: () => {
        idCounter++;
        return 'gen-' + String(idCounter);
      },
    },
    ...overrides,
  };
}

describe('EntitySpawnLifecycle — spawn queue', () => {
  it('enqueues a spawn request', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    const req = mgr.enqueueSpawn('npc');
    expect(req.entityType).toBe('npc');
    expect(req.entityId).toBe('gen-1');
  });

  it('enqueues a spawn with explicit ID', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    const req = mgr.enqueueSpawnWithId('custom-1', 'player');
    expect(req.entityId).toBe('custom-1');
    expect(req.entityType).toBe('player');
  });

  it('includes metadata in spawn request', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    const req = mgr.enqueueSpawn('npc', { worldId: 'w-1' });
    expect(req.metadata).toEqual({ worldId: 'w-1' });
  });

  it('flush spawns processes all pending', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    mgr.enqueueSpawn('npc');
    mgr.enqueueSpawn('npc');
    const results = mgr.flushSpawns();
    expect(results).toHaveLength(2);
    expect(mgr.getStats().spawnQueueSize).toBe(0);
  });

  it('entities become active after flush', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    expect(mgr.isActive('e-1')).toBe(true);
    expect(mgr.getEntityType('e-1')).toBe('npc');
  });
});

describe('EntitySpawnLifecycle — destroy queue', () => {
  it('enqueues a destroy request for active entity', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    const req = mgr.enqueueDestroy('e-1', 'killed');
    expect(req?.entityId).toBe('e-1');
  });

  it('returns undefined when destroying non-active entity', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    expect(mgr.enqueueDestroy('unknown', 'gone')).toBeUndefined();
  });

  it('flush destroys removes entities from active', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    mgr.enqueueDestroy('e-1', 'expired');
    mgr.flushDestroys();
    expect(mgr.isActive('e-1')).toBe(false);
  });

  it('destroy result includes reason', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    mgr.enqueueDestroy('e-1', 'combat death');
    const results = mgr.flushDestroys();
    expect(results[0]?.reason).toBe('combat death');
  });
});

describe('EntitySpawnLifecycle — flush combined', () => {
  it('processes destroys before spawns', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    mgr.enqueueDestroy('e-1', 'recycle');
    mgr.enqueueSpawn('npc');
    const result = mgr.flush();
    expect(result.destroyed).toHaveLength(1);
    expect(result.spawned).toHaveLength(1);
  });
});

describe('EntitySpawnLifecycle — entity pooling', () => {
  it('pools destroyed entities for recycling', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    mgr.enqueueDestroy('e-1', 'despawn');
    const destroyResults = mgr.flushDestroys();
    expect(destroyResults[0]?.pooled).toBe(true);
    expect(mgr.getStats().pooledEntityCount).toBe(1);
  });

  it('recycles pooled entity on next spawn of same type', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    mgr.enqueueDestroy('e-1', 'despawn');
    mgr.flushDestroys();
    mgr.enqueueSpawn('npc');
    const results = mgr.flushSpawns();
    expect(results[0]?.recycled).toBe(true);
    expect(results[0]?.entityId).toBe('e-1');
  });

  it('does not recycle across different types', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    mgr.enqueueDestroy('e-1', 'despawn');
    mgr.flushDestroys();
    mgr.enqueueSpawn('player');
    const results = mgr.flushSpawns();
    expect(results[0]?.recycled).toBe(false);
  });

  it('respects pool max per type', () => {
    const mgr = createEntitySpawnLifecycle(
      makeDeps({ poolConfig: { enabled: true, maxPooledPerType: 1 } }),
    );
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.enqueueSpawnWithId('e-2', 'npc');
    mgr.flushSpawns();
    mgr.enqueueDestroy('e-1', 'despawn');
    mgr.enqueueDestroy('e-2', 'despawn');
    const results = mgr.flushDestroys();
    const pooledCount = results.filter((r) => r.pooled).length;
    expect(pooledCount).toBe(1);
  });

  it('disables pooling when configured', () => {
    const mgr = createEntitySpawnLifecycle(
      makeDeps({ poolConfig: { enabled: false, maxPooledPerType: 32 } }),
    );
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    mgr.enqueueDestroy('e-1', 'despawn');
    const results = mgr.flushDestroys();
    expect(results[0]?.pooled).toBe(false);
  });
});

describe('EntitySpawnLifecycle — hooks', () => {
  it('calls onCreate hooks on spawn flush', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    const spawned: string[] = [];
    mgr.onSpawn((eid) => {
      spawned.push(eid);
    });
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    expect(spawned).toEqual(['e-1']);
  });

  it('calls onDestroy hooks on destroy flush', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    const destroyed: string[] = [];
    mgr.onDestroy((eid) => {
      destroyed.push(eid);
    });
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    mgr.enqueueDestroy('e-1', 'gone');
    mgr.flushDestroys();
    expect(destroyed).toEqual(['e-1']);
  });

  it('supports multiple hooks', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    let count = 0;
    mgr.onSpawn(() => {
      count++;
    });
    mgr.onSpawn(() => {
      count++;
    });
    mgr.enqueueSpawn('npc');
    mgr.flushSpawns();
    expect(count).toBe(2);
  });
});

describe('EntitySpawnLifecycle — lifecycle events', () => {
  it('emits spawned event', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    const events: LifecycleEvent[] = [];
    mgr.onLifecycleEvent((e) => {
      events.push(e);
    });
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe('spawned');
    expect(events[0]?.entityId).toBe('e-1');
  });

  it('emits destroyed event', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    const events: LifecycleEvent[] = [];
    mgr.onLifecycleEvent((e) => {
      events.push(e);
    });
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    mgr.enqueueDestroy('e-1', 'killed');
    mgr.flushDestroys();
    const destroyed = events.filter((e) => e.kind === 'destroyed');
    expect(destroyed).toHaveLength(1);
    expect(destroyed[0]?.entityType).toBe('npc');
  });
});

describe('EntitySpawnLifecycle — stats', () => {
  it('starts with zero stats', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    const stats = mgr.getStats();
    expect(stats.totalSpawned).toBe(0);
    expect(stats.totalDestroyed).toBe(0);
    expect(stats.totalRecycled).toBe(0);
    expect(stats.activeEntityCount).toBe(0);
  });

  it('tracks spawn and destroy totals', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    mgr.enqueueSpawn('npc');
    mgr.enqueueSpawn('npc');
    mgr.flushSpawns();
    const stats = mgr.getStats();
    expect(stats.totalSpawned).toBe(2);
    expect(stats.activeEntityCount).toBe(2);
  });

  it('tracks recycled count', () => {
    const mgr = createEntitySpawnLifecycle(makeDeps());
    mgr.enqueueSpawnWithId('e-1', 'npc');
    mgr.flushSpawns();
    mgr.enqueueDestroy('e-1', 'despawn');
    mgr.flushDestroys();
    mgr.enqueueSpawn('npc');
    mgr.flushSpawns();
    expect(mgr.getStats().totalRecycled).toBe(1);
  });
});
