import { describe, expect, it } from 'vitest';
import type { ComponentStore } from '../component-store.js';
import { createComponentStore } from '../component-store.js';
import { createInteractionSystem } from '../interaction-system.js';

function addPlayer(store: ComponentStore, entityId: string): void {
  store.set(entityId as never, 'player-input', {
    moveDirection: { x: 0, y: 0, z: 0 },
    lookDirection: { x: 0, y: 0, z: 1 },
    actions: [],
    sequenceNumber: 0,
  });
  store.set(entityId as never, 'transform', {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  });
  store.set(entityId as never, 'health', {
    current: 100,
    maximum: 100,
    regenerationRate: 0,
    isAlive: true,
  });
}

function addNpc(store: ComponentStore, entityId: string): void {
  store.set(entityId as never, 'interaction', {
    availableInteractions: ['talk', 'inspect'],
    interactionRadius: 5,
    requiresLineOfSight: false,
    promptText: 'Talk',
  });
  store.set(entityId as never, 'transform', {
    position: { x: 2, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  });
  store.set(entityId as never, 'health', {
    current: 100,
    maximum: 100,
    regenerationRate: 0,
    isAlive: true,
  });
  store.set(entityId as never, 'identity', {
    displayName: 'Merchant',
    playerId: null,
    faction: null,
    reputation: 0,
  });
}

describe('interaction-system simulation', () => {
  it('simulates proximity availability and talk request dispatch for nearby npc', () => {
    const store = createComponentStore();
    const events: string[] = [];
    let now = 1_000_000;
    const system = createInteractionSystem({
      componentStore: store,
      clock: { nowMicroseconds: () => now++ },
      worldId: 'world-1',
      eventSink: {
        onInteraction: (event) => {
          events.push(event.type);
        },
      },
    });

    addPlayer(store, 'player-1');
    addNpc(store, 'npc-1');

    system({ deltaMs: 16, tickNumber: 1, wallTimeMicroseconds: 16_000 });
    system({ deltaMs: 16, tickNumber: 2, wallTimeMicroseconds: 32_000 });

    store.set('player-1' as never, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 0 },
      lookDirection: { x: 0, y: 0, z: 1 },
      actions: ['talk'],
      sequenceNumber: 1,
    });
    system({ deltaMs: 16, tickNumber: 3, wallTimeMicroseconds: 48_000 });

    expect(events).toContain('available');
    expect(events).toContain('started');
  });
});
