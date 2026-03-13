import { describe, expect, it } from 'vitest';
import { createActionDispatchSystem } from '../action-dispatch-system.js';
import { createComponentStore } from '../component-store.js';

describe('action-dispatch-system simulation', () => {
  it('simulates a player attack action reducing nearby enemy health', () => {
    const store = createComponentStore();
    const events: Array<{ action: string; ok: boolean }> = [];
    const system = createActionDispatchSystem({
      componentStore: store,
      clock: { nowMicroseconds: () => 1_000_000 },
      eventSink: { onAction: (e) => events.push({ action: e.action, ok: e.result.ok }) },
    });

    const player = 'player-1' as never;
    const enemy = 'enemy-1' as never;

    store.set(player, 'transform', {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });
    store.set(player, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 0 },
      lookDirection: { x: 1, y: 0, z: 0 },
      actions: ['attack'],
      sequenceNumber: 1,
    });
    store.set(player, 'movement', {
      speed: 0,
      maxSpeed: 3.5,
      isGrounded: true,
      movementMode: 'running',
    });
    store.set(player, 'health', {
      current: 100,
      maximum: 100,
      regenerationRate: 0,
      isAlive: true,
    });

    store.set(enemy, 'transform', {
      position: { x: 1, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });
    store.set(enemy, 'health', {
      current: 50,
      maximum: 50,
      regenerationRate: 0,
      isAlive: true,
    });

    system({ deltaMs: 50, tickNumber: 1, wallTimeMicroseconds: 1_000_000 });
    const hp = store.tryGet(enemy, 'health') as { current: number } | undefined;

    expect(hp?.current).toBeLessThan(50);
    expect(events.some((e) => e.action === 'attack' && e.ok)).toBe(true);
  });
});
