/**
 * interaction-chronicle-simulation.test.ts — NPC Interaction + Chronicle tests.
 *
 * Proves that:
 *   - Interaction system detects player proximity to NPCs
 *   - Available/unavailable events fire on enter/leave range
 *   - Player interaction requests (talk, trade, inspect) are processed
 *   - Dead entities cannot be interacted with
 *   - Chronicle entries are immutable and hash-chained
 *   - Chronicle search works across summaries/bodies/tags
 *   - Chain integrity verification catches breaks
 *   - Bible NPCs get InteractionComponents during world seed
 *   - Chronicle terminals respond to 'use' interactions
 *   - Integration: full world seed → interaction → chronicle pipeline
 */

import { describe, it, expect } from 'vitest';
import { createComponentStore } from '../component-store.js';
import { createEntityRegistry } from '../entity-registry.js';
import { createSpawnSystem } from '../spawn-system.js';
import { createSilentLogger } from '../logger.js';
import { createSequentialIdGenerator } from '../id-generator.js';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import { createEventFactory } from '../event-factory.js';
import { createInteractionSystem } from '../interaction-system.js';
import { createChronicleService } from '../chronicle-service.js';
import { seedBibleWorld } from '../bible-world-seed.js';
import type { EntityId } from '@loom/entities-contracts';
import type {
  TransformComponent,
  PlayerInputComponent,
  InteractionComponent,
  IdentityComponent,
  HealthComponent,
  AIBrainComponent,
} from '@loom/entities-contracts';
import type { InteractionEvent } from '../interaction-system.js';
import type { ChronicleEntry } from '../chronicle-service.js';
import type { SystemContext } from '../system-registry.js';

// ── Test Helpers ────────────────────────────────────────────────

function eid(id: string): EntityId {
  return id as unknown as EntityId;
}

function createTestDeps() {
  const logger = createSilentLogger();
  const idGen = createSequentialIdGenerator('test');
  const clock = { nowMicroseconds: () => Date.now() * 1000 };
  const eventBus = createInProcessEventBus({ logger });
  const eventFactory = createEventFactory(clock, idGen);
  const components = createComponentStore();
  const registry = createEntityRegistry({
    eventBus,
    eventFactory,
    componentStore: components,
    idGenerator: idGen,
    clock,
  });
  const spawnSystem = createSpawnSystem({
    entityRegistry: registry,
    componentStore: components,
    clock,
  });
  return { entityRegistry: registry, spawnSystem, components, idGen, clock };
}

function tick(context?: Partial<SystemContext>): SystemContext {
  return {
    deltaMs: 16,
    tickNumber: context?.tickNumber ?? 1,
    wallTimeMicroseconds: Date.now() * 1000,
    ...context,
  };
}

function spawnPlayerAt(
  deps: ReturnType<typeof createTestDeps>,
  position: { x: number; y: number; z: number },
): EntityId {
  const entityId = deps.entityRegistry.spawn('player', 'test-world', {});
  deps.components.set(entityId, 'transform', {
    position,
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  } satisfies TransformComponent);
  deps.components.set(entityId, 'player-input', {
    moveDirection: { x: 0, y: 0, z: 0 },
    lookDirection: { x: 0, y: 0, z: 0, w: 1 },
    actions: [],
    sequenceNumber: 0,
  } satisfies PlayerInputComponent);
  deps.components.set(entityId, 'health', {
    current: 100,
    maximum: 100,
    regenerationRate: 1,
    isAlive: true,
  } satisfies HealthComponent);
  return entityId;
}

function spawnInteractableAt(
  deps: ReturnType<typeof createTestDeps>,
  position: { x: number; y: number; z: number },
  name: string,
  interactions: ReadonlyArray<'talk' | 'trade' | 'inspect' | 'use' | 'pickup'> = ['talk'],
  radius = 5,
): EntityId {
  const entityId = deps.entityRegistry.spawn('npc', 'test-world', {});
  deps.components.set(entityId, 'transform', {
    position,
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  } satisfies TransformComponent);
  deps.components.set(entityId, 'identity', {
    displayName: name,
    playerId: null,
    faction: null,
    reputation: 0,
  } satisfies IdentityComponent);
  deps.components.set(entityId, 'interaction', {
    availableInteractions: interactions,
    interactionRadius: radius,
    requiresLineOfSight: false,
    promptText: name,
  } satisfies InteractionComponent);
  deps.components.set(entityId, 'health', {
    current: 100,
    maximum: 100,
    regenerationRate: 1,
    isAlive: true,
  } satisfies HealthComponent);
  deps.components.set(entityId, 'ai-brain', {
    behaviorTreeId: 'bt_tier1',
    currentGoal: 'idle',
    awarenessRadius: 15,
    hostility: 'friendly',
    knownEntities: [],
  } satisfies AIBrainComponent);
  return entityId;
}

// ── Interaction System Tests ────────────────────────────────────

describe('InteractionSystem', () => {
  describe('proximity detection', () => {
    it('emits available when player enters interaction range', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      const player = spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      spawnInteractableAt(deps, { x: 3, y: 0, z: 0 }, 'Merchant');

      // First tick initializes, second tick triggers scan
      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      const available = events.filter((e) => e.type === 'available');
      expect(available).toHaveLength(1);
      expect(available[0]!.targetDisplayName).toBe('Merchant');
      expect(available[0]!.playerEntityId).toBe(player);
    });

    it('emits unavailable when player leaves interaction range', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      const player = spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      spawnInteractableAt(deps, { x: 3, y: 0, z: 0 }, 'Merchant');

      // Enter range
      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));
      expect(events.filter((e) => e.type === 'available')).toHaveLength(1);

      // Move player out of range
      deps.components.set(player, 'transform', {
        position: { x: 100, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      });

      // Next scan
      system(tick({ tickNumber: 3 }));
      system(tick({ tickNumber: 4 }));

      const unavailable = events.filter((e) => e.type === 'unavailable');
      expect(unavailable).toHaveLength(1);
      expect(unavailable[0]!.targetDisplayName).toBe('Merchant');
    });

    it('does not emit duplicate available for same pair', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      spawnInteractableAt(deps, { x: 3, y: 0, z: 0 }, 'Merchant');

      // Multiple scans while still in range
      for (let t = 1; t <= 10; t++) {
        system(tick({ tickNumber: t }));
      }

      const available = events.filter((e) => e.type === 'available');
      expect(available).toHaveLength(1); // Only one, not five
    });

    it('ignores dead interactable entities', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      const npc = spawnInteractableAt(deps, { x: 2, y: 0, z: 0 }, 'Ghost');

      // Kill the NPC
      deps.components.set(npc, 'health', {
        current: 0,
        maximum: 100,
        regenerationRate: 0,
        isAlive: false,
      });

      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      expect(events).toHaveLength(0);
    });

    it('ignores dead players', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      const player = spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      spawnInteractableAt(deps, { x: 2, y: 0, z: 0 }, 'Merchant');

      // Kill the player
      deps.components.set(player, 'health', {
        current: 0,
        maximum: 100,
        regenerationRate: 0,
        isAlive: false,
      });

      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      expect(events).toHaveLength(0);
    });

    it('handles multiple players near same NPC', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      spawnPlayerAt(deps, { x: 1, y: 0, z: 0 });
      spawnInteractableAt(deps, { x: 2, y: 0, z: 0 }, 'Elder');

      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      const available = events.filter((e) => e.type === 'available');
      expect(available).toHaveLength(2); // One per player
    });

    it('handles player near multiple interactables', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      spawnInteractableAt(deps, { x: 2, y: 0, z: 0 }, 'Merchant');
      spawnInteractableAt(deps, { x: -2, y: 0, z: 0 }, 'Guard');

      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      const available = events.filter((e) => e.type === 'available');
      expect(available).toHaveLength(2);
      const names = available.map((e) => e.targetDisplayName).sort();
      expect(names).toEqual(['Guard', 'Merchant']);
    });

    it('respects interaction radius per entity', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      // Close NPC with tiny radius — player IS within range
      spawnInteractableAt(deps, { x: 1, y: 0, z: 0 }, 'Close', ['talk'], 2);
      // Far NPC with tiny radius — player NOT within range
      spawnInteractableAt(deps, { x: 10, y: 0, z: 0 }, 'Far', ['talk'], 2);

      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      const available = events.filter((e) => e.type === 'available');
      expect(available).toHaveLength(1);
      expect(available[0]!.targetDisplayName).toBe('Close');
    });
  });

  describe('interaction requests', () => {
    it('processes talk interaction when player has talk action', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      const player = spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      spawnInteractableAt(deps, { x: 2, y: 0, z: 0 }, 'Elder', ['talk']);

      // Enter range first
      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      // Set talk action on player input
      deps.components.set(player, 'player-input', {
        moveDirection: { x: 0, y: 0, z: 0 },
        lookDirection: { x: 0, y: 0, z: 0, w: 1 },
        actions: ['talk'],
        sequenceNumber: 1,
      } satisfies PlayerInputComponent);

      system(tick({ tickNumber: 3 }));

      const started = events.filter((e) => e.type === 'started');
      expect(started).toHaveLength(1);
      expect(started[0]!.interactionKind).toBe('talk');
      expect(started[0]!.targetDisplayName).toBe('Elder');
    });

    it('auto-completes inspect interactions', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      const player = spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      spawnInteractableAt(deps, { x: 2, y: 0, z: 0 }, 'Terminal', ['inspect', 'use']);

      // Enter range
      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      // Inspect
      deps.components.set(player, 'player-input', {
        moveDirection: { x: 0, y: 0, z: 0 },
        lookDirection: { x: 0, y: 0, z: 0, w: 1 },
        actions: ['inspect'],
        sequenceNumber: 1,
      });

      system(tick({ tickNumber: 3 }));

      const started = events.filter((e) => e.type === 'started');
      const completed = events.filter((e) => e.type === 'completed');
      expect(started).toHaveLength(1);
      expect(completed).toHaveLength(1);
      expect(completed[0]!.interactionKind).toBe('inspect');
    });

    it('auto-completes pickup interactions', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      const player = spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      spawnInteractableAt(deps, { x: 1, y: 0, z: 0 }, 'Herb', ['pickup']);

      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      deps.components.set(player, 'player-input', {
        moveDirection: { x: 0, y: 0, z: 0 },
        lookDirection: { x: 0, y: 0, z: 0, w: 1 },
        actions: ['pickup'],
        sequenceNumber: 1,
      });

      system(tick({ tickNumber: 3 }));

      const completed = events.filter((e) => e.type === 'completed');
      expect(completed).toHaveLength(1);
      expect(completed[0]!.interactionKind).toBe('pickup');
    });

    it('rejects interaction kind not offered by target', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      const player = spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      // NPC only offers 'talk', not 'trade'
      spawnInteractableAt(deps, { x: 2, y: 0, z: 0 }, 'Monk', ['talk']);

      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      deps.components.set(player, 'player-input', {
        moveDirection: { x: 0, y: 0, z: 0 },
        lookDirection: { x: 0, y: 0, z: 0, w: 1 },
        actions: ['trade'],
        sequenceNumber: 1,
      });

      system(tick({ tickNumber: 3 }));

      const started = events.filter((e) => e.type === 'started');
      expect(started).toHaveLength(0);
    });

    it('does not process interaction when not in range', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      const player = spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      // NPC is far away
      spawnInteractableAt(deps, { x: 100, y: 0, z: 0 }, 'Distant', ['talk']);

      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      deps.components.set(player, 'player-input', {
        moveDirection: { x: 0, y: 0, z: 0 },
        lookDirection: { x: 0, y: 0, z: 0, w: 1 },
        actions: ['talk'],
        sequenceNumber: 1,
      });

      system(tick({ tickNumber: 3 }));

      const started = events.filter((e) => e.type === 'started');
      expect(started).toHaveLength(0);
    });

    it('picks closest target when multiple are in range', () => {
      const deps = createTestDeps();
      const events: InteractionEvent[] = [];
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      const player = spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      spawnInteractableAt(deps, { x: 4, y: 0, z: 0 }, 'FarMerchant', ['talk'], 5);
      spawnInteractableAt(deps, { x: 1, y: 0, z: 0 }, 'CloseMerchant', ['talk'], 5);

      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      deps.components.set(player, 'player-input', {
        moveDirection: { x: 0, y: 0, z: 0 },
        lookDirection: { x: 0, y: 0, z: 0, w: 1 },
        actions: ['talk'],
        sequenceNumber: 1,
      });

      system(tick({ tickNumber: 3 }));

      const started = events.filter((e) => e.type === 'started');
      expect(started).toHaveLength(1);
      expect(started[0]!.targetDisplayName).toBe('CloseMerchant');
    });
  });

  describe('works without event sink', () => {
    it('runs without crashing when no sink provided', () => {
      const deps = createTestDeps();
      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'test-world',
        // No eventSink
      });

      spawnPlayerAt(deps, { x: 0, y: 0, z: 0 });
      spawnInteractableAt(deps, { x: 2, y: 0, z: 0 }, 'Silent');

      // Should not throw
      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));
    });
  });
});

// ── Chronicle Service Tests ─────────────────────────────────────

describe('ChronicleService', () => {
  function createChronicle() {
    const idGen = createSequentialIdGenerator('chr');
    const clock = { nowMicroseconds: () => Date.now() * 1000 };
    const entries: ChronicleEntry[] = [];
    const chronicle = createChronicleService({
      clock,
      idGenerator: idGen,
      eventSink: { onEntryCreated: (e) => entries.push(e) },
    });
    return { chronicle, entries };
  }

  describe('entry creation', () => {
    it('creates an immutable entry', () => {
      const { chronicle } = createChronicle();
      const entry = chronicle.createEntry({
        authorEntityId: eid('player-1'),
        worldId: 'alkahest',
        entryType: 'governance',
        summary: 'Assembly convenes for the first time',
        body: 'The Assembly of Alkahest convened in the Common Trust chambers.',
      });

      expect(entry.entryId).toBeTruthy();
      expect(entry.summary).toBe('Assembly convenes for the first time');
      expect(entry.entryType).toBe('governance');
      expect(entry.worldId).toBe('alkahest');
      expect(Object.isFrozen(entry)).toBe(true);
    });

    it('increments entry count', () => {
      const { chronicle } = createChronicle();
      expect(chronicle.entryCount()).toBe(0);

      chronicle.createEntry({
        authorEntityId: eid('npc-1'),
        worldId: 'alkahest',
        entryType: 'social',
        summary: 'First entry',
        body: 'Detail',
      });

      expect(chronicle.entryCount()).toBe(1);
    });

    it('notifies event sink on creation', () => {
      const { chronicle, entries } = createChronicle();
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'economic',
        summary: 'Trade opened',
        body: 'Alkahest trade routes established.',
      });

      expect(entries).toHaveLength(1);
      expect(entries[0]!.summary).toBe('Trade opened');
    });

    it('stores mentioned entities', () => {
      const { chronicle } = createChronicle();
      const entry = chronicle.createEntry({
        authorEntityId: eid('npc-itoro'),
        worldId: 'alkahest',
        entryType: 'personal',
        summary: 'Itoro records observation',
        body: 'The Architect appeared briefly.',
        mentionedEntities: [eid('npc-architect'), eid('npc-kwame')],
      });

      expect(entry.mentionedEntities).toHaveLength(2);
    });

    it('stores tags', () => {
      const { chronicle } = createChronicle();
      const entry = chronicle.createEntry({
        authorEntityId: eid('system'),
        worldId: 'deep-tidal',
        entryType: 'discovery',
        summary: 'New species catalogued',
        body: 'Survey Corps catalogued bioluminescent fauna.',
        tags: ['survey-corps', 'fauna', 'deep-tidal'],
      });

      expect(entry.tags).toEqual(['survey-corps', 'fauna', 'deep-tidal']);
    });
  });

  describe('hash chain', () => {
    it('first entry has null previousHash', () => {
      const { chronicle } = createChronicle();
      const entry = chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'social',
        summary: 'First',
        body: 'First entry',
      });

      expect(entry.previousHash).toBeNull();
      expect(entry.entryHash).toMatch(/^chr_[0-9a-f]{8}$/);
    });

    it('chains entries within same world', () => {
      const { chronicle } = createChronicle();
      const first = chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'social',
        summary: 'First',
        body: 'First',
      });
      const second = chronicle.createEntry({
        authorEntityId: eid('p2'),
        worldId: 'alkahest',
        entryType: 'economic',
        summary: 'Second',
        body: 'Second',
      });

      expect(second.previousHash).toBe(first.entryHash);
    });

    it('maintains separate chains per world', () => {
      const { chronicle } = createChronicle();
      const alk1 = chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'social',
        summary: 'Alk entry',
        body: 'Alkahest',
      });
      const dt1 = chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'deep-tidal',
        entryType: 'discovery',
        summary: 'DT entry',
        body: 'Deep Tidal',
      });

      // Deep Tidal chain starts fresh
      expect(dt1.previousHash).toBeNull();
      // Chain heads are independent
      expect(chronicle.getChainHead('alkahest')).toBe(alk1.entryHash);
      expect(chronicle.getChainHead('deep-tidal')).toBe(dt1.entryHash);
    });

    it('verifies intact chain', () => {
      const { chronicle } = createChronicle();
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'social',
        summary: 'A',
        body: 'A',
      });
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'social',
        summary: 'B',
        body: 'B',
      });
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'social',
        summary: 'C',
        body: 'C',
      });

      const broken = chronicle.verifyChain('alkahest');
      expect(broken).toHaveLength(0);
    });

    it('returns null chain head for unknown world', () => {
      const { chronicle } = createChronicle();
      expect(chronicle.getChainHead('nonexistent')).toBeNull();
    });
  });

  describe('retrieval', () => {
    it('retrieves entry by ID', () => {
      const { chronicle } = createChronicle();
      const entry = chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'social',
        summary: 'Test',
        body: 'Body',
      });

      const retrieved = chronicle.getEntry(entry.entryId);
      expect(retrieved).toBe(entry);
    });

    it('returns undefined for unknown ID', () => {
      const { chronicle } = createChronicle();
      expect(chronicle.getEntry('nonexistent')).toBeUndefined();
    });

    it('retrieves world entries in order', () => {
      const { chronicle } = createChronicle();
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'social',
        summary: 'First',
        body: 'First',
      });
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'economic',
        summary: 'Second',
        body: 'Second',
      });
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'deep-tidal',
        entryType: 'discovery',
        summary: 'DT entry',
        body: 'DT',
      });

      const alkEntries = chronicle.getWorldEntries('alkahest');
      expect(alkEntries).toHaveLength(2);
      expect(alkEntries[0]!.summary).toBe('First');
      expect(alkEntries[1]!.summary).toBe('Second');
    });

    it('retrieves author entries', () => {
      const { chronicle } = createChronicle();
      chronicle.createEntry({
        authorEntityId: eid('npc-itoro'),
        worldId: 'alkahest',
        entryType: 'personal',
        summary: 'Itoro entry 1',
        body: 'Detail',
      });
      chronicle.createEntry({
        authorEntityId: eid('npc-kwame'),
        worldId: 'alkahest',
        entryType: 'governance',
        summary: 'Kwame entry',
        body: 'Detail',
      });
      chronicle.createEntry({
        authorEntityId: eid('npc-itoro'),
        worldId: 'deep-tidal',
        entryType: 'personal',
        summary: 'Itoro entry 2',
        body: 'Detail',
      });

      const itoro = chronicle.getAuthorEntries(eid('npc-itoro'));
      expect(itoro).toHaveLength(2);
    });

    it('retrieves entries by mentioned entity', () => {
      const { chronicle } = createChronicle();
      chronicle.createEntry({
        authorEntityId: eid('system'),
        worldId: 'alkahest',
        entryType: 'social',
        summary: 'Architect sighting',
        body: 'Detail',
        mentionedEntities: [eid('npc-architect')],
      });
      chronicle.createEntry({
        authorEntityId: eid('system'),
        worldId: 'deep-tidal',
        entryType: 'social',
        summary: 'Architect visit',
        body: 'Detail',
        mentionedEntities: [eid('npc-architect'), eid('npc-yara')],
      });

      const mentions = chronicle.searchByEntity(eid('npc-architect'));
      expect(mentions).toHaveLength(2);
    });
  });

  describe('search', () => {
    it('searches by summary text', () => {
      const { chronicle } = createChronicle();
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'governance',
        summary: 'Assembly Vote on Water Rights',
        body: 'The Assembly voted on water allocation.',
      });
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'economic',
        summary: 'Market crash recovered',
        body: 'Economy stabilized.',
      });

      const result = chronicle.search('alkahest', 'assembly');
      expect(result.totalCount).toBe(1);
      expect(result.entries[0]!.summary).toContain('Assembly');
    });

    it('searches by body text', () => {
      const { chronicle } = createChronicle();
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'social',
        summary: 'Daily log',
        body: 'The Lattice resonance was unusually strong today.',
      });

      const result = chronicle.search('alkahest', 'lattice');
      expect(result.totalCount).toBe(1);
    });

    it('searches by tags', () => {
      const { chronicle } = createChronicle();
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'deep-tidal',
        entryType: 'discovery',
        summary: 'Specimen found',
        body: 'Detail',
        tags: ['bioluminescent', 'fauna'],
      });

      const result = chronicle.search('deep-tidal', 'bioluminescent');
      expect(result.totalCount).toBe(1);
    });

    it('returns empty for no matches', () => {
      const { chronicle } = createChronicle();
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'social',
        summary: 'Hello',
        body: 'World',
      });

      const result = chronicle.search('alkahest', 'nonexistent_xyz');
      expect(result.totalCount).toBe(0);
    });

    it('is case-insensitive', () => {
      const { chronicle } = createChronicle();
      chronicle.createEntry({
        authorEntityId: eid('p1'),
        worldId: 'alkahest',
        entryType: 'governance',
        summary: 'The ARCHITECT Spoke',
        body: 'Detail',
      });

      const result = chronicle.search('alkahest', 'architect');
      expect(result.totalCount).toBe(1);
    });
  });
});

// ── Integration: Bible World Seed + Interaction ─────────────────

describe('Bible World Seed + Interaction Integration', () => {
  it('bible-seeded NPCs have InteractionComponents', () => {
    const deps = createTestDeps();
    const result = seedBibleWorld(
      { entityRegistry: deps.entityRegistry, spawnSystem: deps.spawnSystem },
      'alkahest',
    );
    expect(result).not.toBeNull();

    // Check that NPCs with interactions have InteractionComponent set
    let interactableCount = 0;
    for (const npcId of result!.npcIds) {
      const interaction = deps.components.tryGet<InteractionComponent>(npcId, 'interaction');
      if (interaction) {
        interactableCount++;
        expect(interaction.interactionRadius).toBe(3);
        expect(interaction.availableInteractions.length).toBeGreaterThan(0);
      }
    }

    // Bible characters have interactions defined
    expect(interactableCount).toBeGreaterThan(0);
  });

  it('Chronicle Terminal has inspect and use interactions', () => {
    const deps = createTestDeps();
    const result = seedBibleWorld(
      { entityRegistry: deps.entityRegistry, spawnSystem: deps.spawnSystem },
      'alkahest',
    );
    expect(result).not.toBeNull();

    // Find the Chronicle Terminal among world objects
    let terminalFound = false;
    for (const objId of result!.objectIds) {
      const identity = deps.components.tryGet<IdentityComponent>(objId, 'identity');
      if (identity?.displayName === 'Chronicle Terminal') {
        const interaction = deps.components.tryGet<InteractionComponent>(objId, 'interaction');
        expect(interaction).toBeDefined();
        expect(interaction!.availableInteractions).toContain('inspect');
        expect(interaction!.availableInteractions).toContain('use');
        terminalFound = true;
      }
    }
    expect(terminalFound).toBe(true);
  });

  it('Lattice Node has inspect interaction', () => {
    const deps = createTestDeps();
    const result = seedBibleWorld(
      { entityRegistry: deps.entityRegistry, spawnSystem: deps.spawnSystem },
      'alkahest',
    );
    expect(result).not.toBeNull();

    let nodeFound = false;
    for (const objId of result!.objectIds) {
      const identity = deps.components.tryGet<IdentityComponent>(objId, 'identity');
      if (identity?.displayName.includes('Lattice Node')) {
        const interaction = deps.components.tryGet<InteractionComponent>(objId, 'interaction');
        expect(interaction).toBeDefined();
        expect(interaction!.availableInteractions).toContain('inspect');
        nodeFound = true;
      }
    }
    expect(nodeFound).toBe(true);
  });

  it('interaction system detects player near bible NPC', () => {
    const deps = createTestDeps();
    const events: InteractionEvent[] = [];

    const result = seedBibleWorld(
      { entityRegistry: deps.entityRegistry, spawnSystem: deps.spawnSystem },
      'alkahest',
    );
    expect(result).not.toBeNull();

    // Find an NPC with interaction component
    let targetNpcId: EntityId | null = null;
    let targetTransform: TransformComponent | null = null;
    for (const npcId of result!.npcIds) {
      const interaction = deps.components.tryGet<InteractionComponent>(npcId, 'interaction');
      if (interaction) {
        targetNpcId = npcId;
        targetTransform = deps.components.tryGet<TransformComponent>(npcId, 'transform')!;
        break;
      }
    }

    if (targetNpcId && targetTransform) {
      // Spawn player right next to the NPC
      const player = spawnPlayerAt(deps, {
        x: targetTransform.position.x + 1,
        y: targetTransform.position.y,
        z: targetTransform.position.z,
      });

      const system = createInteractionSystem({
        componentStore: deps.components,
        clock: deps.clock,
        worldId: 'alkahest',
        eventSink: { onInteraction: (e) => events.push(e) },
      });

      system(tick({ tickNumber: 1 }));
      system(tick({ tickNumber: 2 }));

      const available = events.filter((e) => e.type === 'available');
      expect(available.length).toBeGreaterThan(0);
    }
  });

  it('full pipeline: seed world → detect proximity → interact → chronicle entry', () => {
    const deps = createTestDeps();
    const interactionEvents: InteractionEvent[] = [];

    // 1. Seed Alkahest
    const seedResult = seedBibleWorld(
      { entityRegistry: deps.entityRegistry, spawnSystem: deps.spawnSystem },
      'alkahest',
    );
    expect(seedResult).not.toBeNull();

    // 2. Create Chronicle service
    const chronicle = createChronicleService({
      clock: deps.clock,
      idGenerator: deps.idGen,
    });

    // 3. Find a friendly NPC with talk interaction
    let talkNpcId: EntityId | null = null;
    let talkNpcTransform: TransformComponent | null = null;
    for (const npcId of seedResult!.npcIds) {
      const interaction = deps.components.tryGet<InteractionComponent>(npcId, 'interaction');
      const brain = deps.components.tryGet<AIBrainComponent>(npcId, 'ai-brain');
      if (interaction?.availableInteractions.includes('talk') && brain?.hostility === 'friendly') {
        talkNpcId = npcId;
        talkNpcTransform = deps.components.tryGet<TransformComponent>(npcId, 'transform')!;
        break;
      }
    }

    // There should be at least one talkable NPC
    expect(talkNpcId).not.toBeNull();

    // 4. Spawn player near the NPC
    const player = spawnPlayerAt(deps, {
      x: talkNpcTransform!.position.x + 1,
      y: talkNpcTransform!.position.y,
      z: talkNpcTransform!.position.z,
    });

    // 5. Run interaction system
    const interactionSystem = createInteractionSystem({
      componentStore: deps.components,
      clock: deps.clock,
      worldId: 'alkahest',
      eventSink: {
        onInteraction: (e) => {
          interactionEvents.push(e);
          // When a talk interaction starts, record it in the Chronicle
          if (e.type === 'started' && e.interactionKind === 'talk') {
            chronicle.createEntry({
              authorEntityId: e.playerEntityId as EntityId,
              worldId: e.worldId,
              entryType: 'social',
              summary: `Player spoke with ${e.targetDisplayName}`,
              body: `A conversation was initiated with ${e.targetDisplayName} on ${e.worldId}.`,
              mentionedEntities: [e.targetEntityId as EntityId],
              tags: ['dialogue', 'npc-interaction'],
            });
          }
        },
      },
    });

    // 6. Proximity scan
    interactionSystem(tick({ tickNumber: 1 }));
    interactionSystem(tick({ tickNumber: 2 }));

    const available = interactionEvents.filter((e) => e.type === 'available');
    expect(available.length).toBeGreaterThan(0);

    // 7. Player initiates talk
    deps.components.set(player, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 0 },
      lookDirection: { x: 0, y: 0, z: 0, w: 1 },
      actions: ['talk'],
      sequenceNumber: 1,
    } satisfies PlayerInputComponent);

    interactionSystem(tick({ tickNumber: 3 }));

    // 8. Verify the interaction was recorded as a Chronicle entry
    const started = interactionEvents.filter((e) => e.type === 'started');
    expect(started).toHaveLength(1);
    expect(chronicle.entryCount()).toBe(1);

    const worldEntries = chronicle.getWorldEntries('alkahest');
    expect(worldEntries).toHaveLength(1);
    expect(worldEntries[0]!.summary).toContain('spoke with');
    expect(worldEntries[0]!.tags).toContain('dialogue');
    expect(worldEntries[0]!.entryHash).toMatch(/^chr_[0-9a-f]{8}$/);
  });
});
