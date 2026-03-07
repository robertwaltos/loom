import { describe, it, expect } from 'vitest';
import { createLoomCore } from '../loom-core.js';
import { createFakeClock } from '../clock.js';
import { createSequentialIdGenerator } from '../id-generator.js';
import type { LoomEvent } from '@loom/events-contracts';

function createTestLoom() {
  return createLoomCore({
    clock: createFakeClock(1_000_000),
    idGenerator: createSequentialIdGenerator('loom'),
  });
}

describe('LoomCore creation', () => {
  it('creates a working loom instance', () => {
    const loom = createTestLoom();
    expect(loom.eventBus).toBeDefined();
    expect(loom.entities).toBeDefined();
    expect(loom.worlds).toBeDefined();
    expect(loom.eventFactory).toBeDefined();
    loom.shutdown();
  });

  it('shuts down cleanly', () => {
    const loom = createTestLoom();
    loom.shutdown();
    expect(() => {
      loom.eventBus.publish({
        type: 'test',
        payload: {},
        metadata: {
          eventId: 'x',
          correlationId: 'x',
          causationId: null,
          timestamp: 0,
          sequenceNumber: 0,
          sourceWorldId: 'w',
          sourceFabricId: 'f',
          schemaVersion: 1,
        },
      });
    }).toThrow('closed');
  });
});

describe('LoomCore entity lifecycle', () => {
  it('spawns entity and emits event', async () => {
    const loom = createTestLoom();
    const events: LoomEvent[] = [];
    loom.eventBus.subscribe({}, (e) => {
      events.push(e);
    });

    loom.entities.spawn('player', 'kelath-prime', {
      health: { current: 100, maximum: 100 },
    });

    await Promise.resolve();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('entity.spawned');
    loom.shutdown();
  });
});

describe('LoomCore multi-world', () => {
  it('loads world and spawns entities in it', async () => {
    const loom = createTestLoom();
    const events: LoomEvent[] = [];
    loom.eventBus.subscribe({}, (e) => {
      events.push(e);
    });

    loom.worlds.loadWorld('kelath-prime', 'server-1', 500);
    loom.worlds.incrementPlayers('kelath-prime');

    const playerId = loom.entities.spawn('player', 'kelath-prime');
    expect(loom.entities.queryByWorld('kelath-prime')).toHaveLength(1);

    loom.entities.despawn(playerId, 'destroyed');
    loom.worlds.decrementPlayers('kelath-prime');

    await Promise.resolve();
    expect(events.length).toBeGreaterThanOrEqual(3);
    loom.shutdown();
  });

  it('supports multi-world scenarios', () => {
    const loom = createTestLoom();

    loom.worlds.loadWorld('kelath-prime', 's1', 500);
    loom.worlds.loadWorld('void-reach', 's2', 200);

    loom.entities.spawn('npc', 'kelath-prime');
    loom.entities.spawn('npc', 'kelath-prime');
    loom.entities.spawn('npc', 'void-reach');

    expect(loom.entities.queryByWorld('kelath-prime')).toHaveLength(2);
    expect(loom.entities.queryByWorld('void-reach')).toHaveLength(1);
    expect(loom.entities.count()).toBe(3);
    loom.shutdown();
  });
});
