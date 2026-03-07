import { describe, it, expect } from 'vitest';
import { createWorldManager } from '../world-manager.js';
import { createEventFactory } from '../event-factory.js';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import { createFakeClock } from '../clock.js';
import { createSequentialIdGenerator } from '../id-generator.js';
import { createSilentLogger } from '../logger.js';
import type { LoomEvent } from '@loom/events-contracts';

function createTestWorldManager() {
  const clock = createFakeClock(1_000_000);
  const idGenerator = createSequentialIdGenerator('world');
  const logger = createSilentLogger();
  const eventBus = createInProcessEventBus({ logger });
  const eventFactory = createEventFactory(clock, idGenerator);

  const worlds = createWorldManager({ eventBus, eventFactory, clock });
  return { worlds, eventBus, clock };
}

describe('WorldManager load/unload', () => {
  it('loads a world', () => {
    const { worlds } = createTestWorldManager();
    worlds.loadWorld('kelath-prime', 'server-1', 500);

    const world = worlds.getWorld('kelath-prime');
    expect(world.worldId).toBe('kelath-prime');
    expect(world.serverId).toBe('server-1');
    expect(world.state).toBe('active');
    expect(world.playerCapacity).toBe(500);
    expect(world.currentPlayerCount).toBe(0);
  });

  it('throws on duplicate world', () => {
    const { worlds } = createTestWorldManager();
    worlds.loadWorld('w1', 's1', 100);
    expect(() => {
      worlds.loadWorld('w1', 's2', 200);
    }).toThrow('already exists');
  });

  it('unloads a world', () => {
    const { worlds } = createTestWorldManager();
    worlds.loadWorld('w1', 's1', 100);
    worlds.unloadWorld('w1', 'empty');
    expect(worlds.tryGetWorld('w1')).toBeUndefined();
  });

  it('throws on unloading non-existent world', () => {
    const { worlds } = createTestWorldManager();
    expect(() => {
      worlds.unloadWorld('nope', 'shutdown');
    }).toThrow('not found');
  });
});

describe('WorldManager players', () => {
  it('tracks player counts', () => {
    const { worlds } = createTestWorldManager();
    worlds.loadWorld('w1', 's1', 2);

    worlds.incrementPlayers('w1');
    expect(worlds.getWorld('w1').currentPlayerCount).toBe(1);

    worlds.incrementPlayers('w1');
    expect(worlds.getWorld('w1').currentPlayerCount).toBe(2);

    expect(() => {
      worlds.incrementPlayers('w1');
    }).toThrow('capacity');

    worlds.decrementPlayers('w1');
    expect(worlds.getWorld('w1').currentPlayerCount).toBe(1);
  });

  it('checks world readiness', () => {
    const { worlds } = createTestWorldManager();
    expect(worlds.isWorldReady('nope')).toBe(false);

    worlds.loadWorld('w1', 's1', 100);
    expect(worlds.isWorldReady('w1')).toBe(true);
  });

  it('lists all worlds', () => {
    const { worlds } = createTestWorldManager();
    worlds.loadWorld('w1', 's1', 100);
    worlds.loadWorld('w2', 's2', 200);
    expect(worlds.listWorlds()).toHaveLength(2);
  });
});

describe('WorldManager events', () => {
  it('emits world.loaded event', async () => {
    const { worlds, eventBus } = createTestWorldManager();
    const events: LoomEvent[] = [];
    eventBus.subscribe({ types: ['world.loaded'] }, (e) => {
      events.push(e);
    });

    worlds.loadWorld('w1', 's1', 100);
    await Promise.resolve();

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('world.loaded');
  });

  it('emits world.unloaded event', async () => {
    const { worlds, eventBus } = createTestWorldManager();
    const events: LoomEvent[] = [];
    eventBus.subscribe({ types: ['world.unloaded'] }, (e) => {
      events.push(e);
    });

    worlds.loadWorld('w1', 's1', 100);
    worlds.unloadWorld('w1', 'shutdown');
    await Promise.resolve();

    expect(events).toHaveLength(1);
  });
});
