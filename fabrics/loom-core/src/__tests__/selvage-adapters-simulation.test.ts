import { describe, expect, it } from 'vitest';
import {
  createComponentQueryAdapter,
  createEntityQueryAdapter,
  createPlayerEntityAdapter,
  createSelvageBroadcastSystem,
} from '../selvage-adapters.js';
import { createComponentStore } from '../component-store.js';
import type { EntityId } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

describe('selvage-adapters simulation', () => {
  it('simulates bridging world queries, components, player lifecycle, and broadcast tick', () => {
    const source = {
      queryByWorld: (worldId: string) => [{ id: 'e-1', type: 'player', worldId }],
    };
    const entityAdapter = createEntityQueryAdapter(source);

    const store = createComponentStore();
    store.set(eid('e-1'), 'transform', { position: { x: 1, y: 2, z: 3 } });
    const componentAdapter = createComponentQueryAdapter(store);

    const spawns: string[] = [];
    const despawns: string[] = [];
    const playerAdapter = createPlayerEntityAdapter({
      spawnPlayer: (connectionId) => {
        const id = 'player-' + connectionId;
        spawns.push(id);
        return id;
      },
      despawnPlayer: (entityId) => {
        despawns.push(entityId);
      },
    });

    const snapshots: Array<{ tick: number; ts: number }> = [];
    const broadcastSystem = createSelvageBroadcastSystem({
      broadcastSnapshot: (tick, timestamp) => snapshots.push({ tick, ts: timestamp }),
    });

    const entities = entityAdapter.queryByWorld('earth');
    const comps = componentAdapter.getComponents('e-1');
    const spawned = playerAdapter.spawnPlayer('c-1', 'earth');
    playerAdapter.despawnPlayer(spawned);
    broadcastSystem({ deltaMs: 16, tickNumber: 7, wallTimeMicroseconds: 7_000_000 });

    expect(entities[0]?.worldId).toBe('earth');
    expect(comps['transform']).toBeDefined();
    expect(spawns).toEqual(['player-c-1']);
    expect(despawns).toEqual(['player-c-1']);
    expect(snapshots[0]).toEqual({ tick: 7, ts: 7000 });
  });
});
