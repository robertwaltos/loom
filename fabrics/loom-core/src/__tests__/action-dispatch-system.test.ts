/**
 * action-dispatch-system.test.ts — Tests for the action dispatch system.
 *
 * Validates that player actions decoded from UE5 bitflags
 * route correctly through the dispatch system to modify
 * entity components (health, animation, etc.) and emit events.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentStore } from '../component-store.js';
import {
  createActionDispatchSystem,
} from '../action-dispatch-system.js';
import type {
  ActionEventSink,
  ActionEvent,
} from '../action-dispatch-system.js';
import type { ComponentStore } from '../component-store.js';
import type { SystemContext } from '../system-registry.js';
import type { EntityId } from '@loom/entities-contracts';
import type {
  PlayerInputComponent,
  TransformComponent,
  AnimationComponent,
  InteractionComponent,
} from '@loom/entities-contracts';
import type { HealthComponent, InventoryComponent } from '@loom/entities-contracts';

// ── Helpers ───────────────────────────────────────────────────────

function eid(id: string): EntityId {
  return id as unknown as EntityId;
}

function makeClock(startUs = 1_000_000) {
  let now = startUs;
  return {
    nowMicroseconds: () => now,
    advance: (us: number) => { now += us; },
  };
}

function makeContext(deltaMs = 50, tickNumber = 1): SystemContext {
  return { deltaMs, tickNumber, wallTimeMicroseconds: Date.now() * 1000 };
}

function seedPlayer(
  store: ComponentStore,
  entityId: EntityId,
  position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
): void {
  store.set(entityId, 'transform', {
    position,
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  } satisfies TransformComponent);
  store.set(entityId, 'player-input', {
    moveDirection: { x: 0, y: 0, z: 0 },
    lookDirection: { x: 1, y: 0, z: 0 },
    actions: [] as string[],
    sequenceNumber: 0,
  } satisfies PlayerInputComponent);
  store.set(entityId, 'movement', {
    speed: 0,
    maxSpeed: 3.5,
    isGrounded: true,
    movementMode: 'running' as const,
  });
  store.set(entityId, 'health', {
    current: 100,
    maximum: 100,
    regenerationRate: 1,
    isAlive: true,
  } satisfies HealthComponent);
}

function seedNpc(
  store: ComponentStore,
  entityId: EntityId,
  position: { x: number; y: number; z: number },
  interactions: InteractionComponent['availableInteractions'] = ['talk'],
): void {
  store.set(entityId, 'transform', {
    position,
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  } satisfies TransformComponent);
  store.set(entityId, 'health', {
    current: 50,
    maximum: 50,
    regenerationRate: 0,
    isAlive: true,
  } satisfies HealthComponent);
  store.set(entityId, 'interaction', {
    availableInteractions: interactions,
    interactionRadius: 5.0,
    requiresLineOfSight: false,
    promptText: 'Talk',
  } satisfies InteractionComponent);
}

function setActions(store: ComponentStore, entityId: EntityId, actions: string[]): void {
  const input = store.tryGet(entityId, 'player-input') as PlayerInputComponent;
  store.set(entityId, 'player-input', { ...input, actions });
}

// ── Tests ─────────────────────────────────────────────────────────

describe('ActionDispatchSystem', () => {
  let store: ComponentStore;
  let clock: ReturnType<typeof makeClock>;
  let events: ActionEvent[];
  let sink: ActionEventSink;
  let system: ReturnType<typeof createActionDispatchSystem>;

  const playerId = eid('player-1');
  const npcId = eid('npc-1');
  const enemyId = eid('enemy-1');

  beforeEach(() => {
    store = createComponentStore();
    clock = makeClock();
    events = [];
    sink = { onAction: (e) => events.push(e) };
    system = createActionDispatchSystem({
      componentStore: store,
      clock,
      eventSink: sink,
    });

    seedPlayer(store, playerId, { x: 0, y: 0, z: 0 });
    seedNpc(store, npcId, { x: 2, y: 0, z: 0 }, ['talk', 'trade']);
    seedNpc(store, enemyId, { x: 1, y: 0, z: 0 }, []);
  });

  // ── Combat ──────────────────────────────────────────────────────

  describe('attack action', () => {
    it('deals damage to nearest entity with health in range', () => {
      setActions(store, playerId, ['attack']);
      system(makeContext());

      const health = store.tryGet(enemyId, 'health') as HealthComponent;
      expect(health.current).toBeLessThan(50);
      expect(events).toHaveLength(1);
      expect(events[0]!.action).toBe('attack');
      expect(events[0]!.result.ok).toBe(true);
    });

    it('sets attack animation on attacker', () => {
      setActions(store, playerId, ['attack']);
      system(makeContext());

      const anim = store.tryGet(playerId, 'animation') as AnimationComponent;
      expect(anim.currentClip).toBe('attack');
    });

    it('respects cooldown — second attack in same window fails', () => {
      setActions(store, playerId, ['attack']);
      system(makeContext(50, 1));

      // Clear and re-trigger on next tick (action edge detection)
      setActions(store, playerId, []);
      system(makeContext(50, 2));
      setActions(store, playerId, ['attack']);
      system(makeContext(50, 3));

      // Second attack should be on cooldown (500ms cooldown, only 150ms elapsed)
      const cooldownEvents = events.filter((e) => !e.result.ok);
      expect(cooldownEvents).toHaveLength(1);
      expect((cooldownEvents[0]!.result as { reason: string }).reason).toBe('on-cooldown');
    });

    it('fails when no target in range', () => {
      // Move enemy far away
      store.set(enemyId, 'transform', {
        position: { x: 100, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      });
      store.set(npcId, 'transform', {
        position: { x: 100, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      });

      setActions(store, playerId, ['attack']);
      system(makeContext());

      expect(events).toHaveLength(1);
      expect(events[0]!.result.ok).toBe(false);
    });
  });

  describe('defend action', () => {
    it('sets defend animation and emits event', () => {
      setActions(store, playerId, ['defend']);
      system(makeContext());

      const anim = store.tryGet(playerId, 'animation') as AnimationComponent;
      expect(anim.currentClip).toBe('defend');
      expect(events).toHaveLength(1);
      expect(events[0]!.action).toBe('defend');
    });

    it('reduces incoming damage when defending', () => {
      // Player defends, enemy attacks player
      setActions(store, playerId, ['defend']);

      // Seed enemy as a "player" too with input so it can attack
      store.set(enemyId, 'player-input', {
        moveDirection: { x: 0, y: 0, z: 0 },
        lookDirection: { x: -1, y: 0, z: 0 },
        actions: ['attack'],
        sequenceNumber: 0,
      });

      system(makeContext());

      const playerHealth = store.tryGet(playerId, 'health') as HealthComponent;
      // Base damage is 10, defending halves it to 5, plus tiny regen
      expect(playerHealth.current).toBeCloseTo(95, 0);
    });
  });

  describe('dodge action', () => {
    it('grants invulnerability frames', () => {
      setActions(store, playerId, ['dodge']);
      system(makeContext(50, 1));

      // Enemy attacks player while dodging
      setActions(store, playerId, []);
      store.set(enemyId, 'player-input', {
        moveDirection: { x: 0, y: 0, z: 0 },
        lookDirection: { x: -1, y: 0, z: 0 },
        actions: ['attack'],
        sequenceNumber: 0,
      });
      system(makeContext(50, 2));

      const playerHealth = store.tryGet(playerId, 'health') as HealthComponent;
      expect(playerHealth.current).toBe(100); // No damage taken
    });

    it('invulnerability expires after window', () => {
      setActions(store, playerId, ['dodge']);
      system(makeContext(50, 1));

      // Advance clock past dodge window (400ms = 400,000us)
      clock.advance(500_000);

      setActions(store, playerId, []);
      store.set(enemyId, 'player-input', {
        moveDirection: { x: 0, y: 0, z: 0 },
        lookDirection: { x: -1, y: 0, z: 0 },
        actions: ['attack'],
        sequenceNumber: 0,
      });
      system(makeContext(50, 2));

      const playerHealth = store.tryGet(playerId, 'health') as HealthComponent;
      expect(playerHealth.current).toBeLessThan(100);
    });
  });

  // ── Interaction ─────────────────────────────────────────────────

  describe('interact action', () => {
    it('finds nearest interactable entity in range', () => {
      setActions(store, playerId, ['interact']);
      system(makeContext());

      expect(events).toHaveLength(1);
      expect(events[0]!.action).toBe('interact');
      expect(events[0]!.result.ok).toBe(true);
      expect(events[0]!.targetEntityId).not.toBeNull();
    });

    it('sets interact animation', () => {
      setActions(store, playerId, ['interact']);
      system(makeContext());

      const anim = store.tryGet(playerId, 'animation') as AnimationComponent;
      expect(anim.currentClip).toBe('interact');
    });

    it('fails when no interactable in range', () => {
      // Remove interaction components
      store.set(npcId, 'interaction', {
        availableInteractions: [],
        interactionRadius: 5.0,
        requiresLineOfSight: false,
        promptText: '',
      });

      setActions(store, playerId, ['interact']);
      system(makeContext());

      // NPC with empty interactions and enemy with no interaction component
      // The enemy (at x=1) has no interaction component
      // The NPC (at x=2) now has empty interactions
      expect(events).toHaveLength(1);
      expect(events[0]!.result.ok).toBe(false);
    });
  });

  describe('trade action', () => {
    it('finds nearest entity offering trade', () => {
      setActions(store, playerId, ['trade']);
      system(makeContext());

      expect(events).toHaveLength(1);
      expect(events[0]!.action).toBe('trade');
      expect(events[0]!.result.ok).toBe(true);
      expect(events[0]!.targetEntityId).toBe(npcId);
    });

    it('fails when no trade partner nearby', () => {
      store.set(npcId, 'transform', {
        position: { x: 100, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      });

      setActions(store, playerId, ['trade']);
      system(makeContext());

      expect(events[0]!.result.ok).toBe(false);
    });
  });

  // ── Utility Actions ─────────────────────────────────────────────

  describe('use-item action', () => {
    it('succeeds when player has items', () => {
      store.set(playerId, 'inventory', {
        slots: [{ slotIndex: 0, itemEntityId: 'item-1', quantity: 1 }],
        maxSlots: 10,
        weightCurrent: 1,
        weightMax: 100,
      } satisfies InventoryComponent);

      setActions(store, playerId, ['use-item']);
      system(makeContext());

      expect(events).toHaveLength(1);
      expect(events[0]!.result.ok).toBe(true);
    });

    it('fails when inventory is empty', () => {
      store.set(playerId, 'inventory', {
        slots: [{ slotIndex: 0, itemEntityId: null, quantity: 0 }],
        maxSlots: 10,
        weightCurrent: 0,
        weightMax: 100,
      } satisfies InventoryComponent);

      setActions(store, playerId, ['use-item']);
      system(makeContext());

      expect(events).toHaveLength(1);
      expect(events[0]!.result.ok).toBe(false);
    });
  });

  describe('emote action', () => {
    it('sets emote animation and respects cooldown', () => {
      setActions(store, playerId, ['emote']);
      system(makeContext(50, 1));

      const anim = store.tryGet(playerId, 'animation') as AnimationComponent;
      expect(anim.currentClip).toBe('emote');

      // Try again immediately — should be on cooldown
      setActions(store, playerId, []);
      system(makeContext(50, 2));
      setActions(store, playerId, ['emote']);
      system(makeContext(50, 3));

      const cooldownEvents = events.filter((e) => !e.result.ok);
      expect(cooldownEvents).toHaveLength(1);
    });
  });

  describe('mount action', () => {
    it('succeeds when mountable entity nearby', () => {
      const mountId = eid('mount-1');
      seedNpc(store, mountId, { x: 1, y: 1, z: 0 }, ['use']);

      setActions(store, playerId, ['mount']);
      system(makeContext());

      expect(events).toHaveLength(1);
      expect(events[0]!.result.ok).toBe(true);
      expect(events[0]!.targetEntityId).toBe(mountId);
    });

    it('fails when no mountable entity nearby', () => {
      setActions(store, playerId, ['mount']);
      system(makeContext());

      expect(events).toHaveLength(1);
      expect(events[0]!.result.ok).toBe(false);
    });
  });

  describe('survey action', () => {
    it('emits survey event with cooldown', () => {
      setActions(store, playerId, ['survey']);
      system(makeContext());

      expect(events).toHaveLength(1);
      expect(events[0]!.action).toBe('survey');
      expect(events[0]!.result.ok).toBe(true);
    });
  });

  describe('vote action', () => {
    it('emits vote event with cooldown', () => {
      setActions(store, playerId, ['vote']);
      system(makeContext());

      expect(events).toHaveLength(1);
      expect(events[0]!.action).toBe('vote');
      expect(events[0]!.result.ok).toBe(true);
    });
  });

  // ── Edge Detection ──────────────────────────────────────────────

  describe('edge detection', () => {
    it('only triggers action on the first tick it appears', () => {
      setActions(store, playerId, ['emote']);
      system(makeContext(50, 1));

      // Same action next tick — should not re-trigger
      system(makeContext(50, 2));

      expect(events).toHaveLength(1);
    });

    it('triggers again after action is released and re-pressed', () => {
      setActions(store, playerId, ['emote']);
      system(makeContext(50, 1));

      setActions(store, playerId, []);
      system(makeContext(50, 2));

      clock.advance(2_000_000); // Past cooldown
      setActions(store, playerId, ['emote']);
      system(makeContext(50, 3));

      expect(events).toHaveLength(2);
    });
  });

  // ── Health Regeneration ─────────────────────────────────────────

  describe('health regeneration', () => {
    it('regenerates health over time', () => {
      // Damage the player first
      store.set(playerId, 'health', {
        current: 50,
        maximum: 100,
        regenerationRate: 10, // 10 HP/s
        isAlive: true,
      });

      system(makeContext(1000, 1)); // 1 second

      const health = store.tryGet(playerId, 'health') as HealthComponent;
      expect(health.current).toBeCloseTo(60, 0);
    });

    it('does not exceed maximum health', () => {
      store.set(playerId, 'health', {
        current: 99,
        maximum: 100,
        regenerationRate: 100,
        isAlive: true,
      });

      system(makeContext(1000, 1));

      const health = store.tryGet(playerId, 'health') as HealthComponent;
      expect(health.current).toBe(100);
    });

    it('does not regenerate dead entities', () => {
      store.set(playerId, 'health', {
        current: 0,
        maximum: 100,
        regenerationRate: 10,
        isAlive: false,
      });

      system(makeContext(1000, 1));

      const health = store.tryGet(playerId, 'health') as HealthComponent;
      expect(health.current).toBe(0);
    });
  });

  // ── Multiple Actions ────────────────────────────────────────────

  describe('multiple simultaneous actions', () => {
    it('processes multiple actions in a single tick', () => {
      store.set(playerId, 'inventory', {
        slots: [{ slotIndex: 0, itemEntityId: 'item-1', quantity: 1 }],
        maxSlots: 10,
        weightCurrent: 1,
        weightMax: 100,
      });

      setActions(store, playerId, ['attack', 'use-item']);
      system(makeContext());

      expect(events).toHaveLength(2);
      const actions = events.map((e) => e.action);
      expect(actions).toContain('attack');
      expect(actions).toContain('use-item');
    });
  });

  // ── UI-only Actions ─────────────────────────────────────────────

  describe('UI-only actions', () => {
    it('jump succeeds without side effects', () => {
      setActions(store, playerId, ['jump']);
      system(makeContext());

      // Jump is handled by movement system — dispatch just passes through
      expect(events).toHaveLength(0); // No event sink for passthrough actions
    });

    it('toggle-map and open-menu are no-ops', () => {
      setActions(store, playerId, ['toggle-map', 'open-menu']);
      system(makeContext());

      // These are client-side only, no server events
      expect(events).toHaveLength(0);
    });
  });

  // ── Entity Death ────────────────────────────────────────────────

  describe('entity death', () => {
    it('kills entity when health reaches zero', () => {
      store.set(enemyId, 'health', {
        current: 5,
        maximum: 50,
        regenerationRate: 0,
        isAlive: true,
      });

      setActions(store, playerId, ['attack']);
      system(makeContext());

      const health = store.tryGet(enemyId, 'health') as HealthComponent;
      expect(health.current).toBe(0);
      expect(health.isAlive).toBe(false);
    });

    it('cannot attack dead entities', () => {
      store.set(enemyId, 'health', {
        current: 0,
        maximum: 50,
        regenerationRate: 0,
        isAlive: false,
      });

      setActions(store, playerId, ['attack']);
      system(makeContext());

      // Should target NPC instead (which is alive) or fail
      if (events.length > 0 && events[0]!.result.ok) {
        expect(events[0]!.targetEntityId).not.toBe(enemyId);
      }
    });
  });
});
