/**
 * Selvage Adapters — Proves the ECS-to-selvage bridge works.
 */

import { describe, it, expect } from 'vitest';
import {
  createEntityQueryAdapter,
  createComponentQueryAdapter,
  createPlayerEntityAdapter,
  createSelvageBroadcastSystem,
  SELVAGE_BROADCAST_PRIORITY,
} from '../selvage-adapters.js';
import { createComponentStore } from '../component-store.js';
import type { SystemContext } from '../system-registry.js';
import type { EntityId } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

function ctx(tick: number): SystemContext {
  return { deltaMs: 33, tickNumber: tick, wallTimeMicroseconds: tick * 33000 };
}

// ── Entity Query Adapter ───────────────────────────────────────────

describe('EntityQueryAdapter', () => {
  it('projects entities from source to selvage format', () => {
    const source = {
      queryByWorld: (worldId: string) => [
        { id: 'e1', type: 'player', worldId },
        { id: 'e2', type: 'npc', worldId },
      ],
    };

    const adapter = createEntityQueryAdapter(source);
    const result = adapter.queryByWorld('earth');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'e1', type: 'player', worldId: 'earth' });
    expect(result[1]).toEqual({ id: 'e2', type: 'npc', worldId: 'earth' });
  });

  it('returns empty array for empty world', () => {
    const source = { queryByWorld: () => [] };
    const adapter = createEntityQueryAdapter(source);

    expect(adapter.queryByWorld('empty-world')).toHaveLength(0);
  });
});

// ── Component Query Adapter ────────────────────────────────────────

describe('ComponentQueryAdapter', () => {
  it('builds component map from store', () => {
    const store = createComponentStore();
    const entityId = eid('e1');

    store.set(entityId, 'transform', { position: { x: 1, y: 2, z: 3 } });
    store.set(entityId, 'health', { current: 100, maximum: 100 });

    const adapter = createComponentQueryAdapter(store);
    const components = adapter.getComponents('e1');

    expect(components['transform']).toEqual({ position: { x: 1, y: 2, z: 3 } });
    expect(components['health']).toEqual({ current: 100, maximum: 100 });
  });

  it('returns empty object for unknown entity', () => {
    const store = createComponentStore();
    const adapter = createComponentQueryAdapter(store);
    const components = adapter.getComponents('nonexistent');

    expect(Object.keys(components)).toHaveLength(0);
  });
});

// ── Player Entity Adapter ──────────────────────────────────────────

describe('PlayerEntityAdapter', () => {
  it('delegates spawn to provided function', () => {
    const spawned: Array<{ cid: string; wid: string }> = [];
    const adapter = createPlayerEntityAdapter({
      spawnPlayer: (connectionId, worldId) => {
        spawned.push({ cid: connectionId, wid: worldId });
        return 'entity-1';
      },
      despawnPlayer: () => {
        /* noop */
      },
    });

    const entityId = adapter.spawnPlayer('conn-1', 'earth');

    expect(entityId).toBe('entity-1');
    expect(spawned).toHaveLength(1);
    expect(spawned[0]?.cid).toBe('conn-1');
  });

  it('delegates despawn to provided function', () => {
    const despawned: string[] = [];
    const adapter = createPlayerEntityAdapter({
      spawnPlayer: () => 'e1',
      despawnPlayer: (entityId) => {
        despawned.push(entityId);
      },
    });

    adapter.despawnPlayer('entity-1');

    expect(despawned).toEqual(['entity-1']);
  });
});

// ── Broadcast System ───────────────────────────────────────────────

describe('SelvageBroadcastSystem', () => {
  it('calls broadcastSnapshot each tick', () => {
    const calls: Array<{ tick: number; timestamp: number }> = [];
    const broadcast = {
      broadcastSnapshot: (tick: number, timestamp: number) => {
        calls.push({ tick, timestamp });
      },
    };

    const system = createSelvageBroadcastSystem(broadcast);
    system(ctx(1));
    system(ctx(2));

    expect(calls).toHaveLength(2);
    expect(calls[0]?.tick).toBe(1);
    expect(calls[1]?.tick).toBe(2);
  });

  it('converts microseconds to milliseconds', () => {
    const calls: Array<{ tick: number; timestamp: number }> = [];
    const broadcast = {
      broadcastSnapshot: (tick: number, timestamp: number) => {
        calls.push({ tick, timestamp });
      },
    };

    const system = createSelvageBroadcastSystem(broadcast);
    system({ deltaMs: 33, tickNumber: 1, wallTimeMicroseconds: 1_000_000 });

    expect(calls[0]?.timestamp).toBe(1000);
  });

  it('has correct priority constant', () => {
    expect(SELVAGE_BROADCAST_PRIORITY).toBe(950);
  });
});
