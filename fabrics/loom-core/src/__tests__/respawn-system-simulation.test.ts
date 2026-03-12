/**
 * respawn-system-simulation.test.ts
 *
 * Tests for the respawn system: death detection, timer-based respawn,
 * spawn point selection (best-fit), health restoration, teleportation,
 * and event emission.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentStore } from '../component-store.js';
import type { ComponentStore } from '../component-store.js';
import { createRespawnSystem, RESPAWN_SYSTEM_PRIORITY } from '../respawn-system.js';
import type { RespawnEventSink, RespawnEvent, RespawnSystemDeps } from '../respawn-system.js';
import type { SystemContext } from '../system-registry.js';
import type {
  EntityId,
  HealthComponent,
  TransformComponent,
  SpawnPointComponent,
  WorldMembershipComponent,
} from '@loom/entities-contracts';

// ── Helpers ───────────────────────────────────────────────────────

function makeClock(startUs: number = 0): {
  nowMicroseconds: () => number;
  advance: (us: number) => void;
} {
  let now = startUs;
  return {
    nowMicroseconds: () => now,
    advance: (us: number) => { now += us; },
  };
}

function makeContext(tickNumber: number): SystemContext {
  return { deltaMs: 16.67, tickNumber, wallTimeMicroseconds: BigInt(tickNumber * 16667) };
}

function createSink(): RespawnEventSink & { events: RespawnEvent[] } {
  const events: RespawnEvent[] = [];
  return {
    events,
    onRespawn(event: RespawnEvent): void {
      events.push(event);
    },
  };
}

function setupWorld(overrides: Partial<RespawnSystemDeps> = {}): {
  store: ComponentStore;
  clock: ReturnType<typeof makeClock>;
  sink: ReturnType<typeof createSink>;
  system: (ctx: SystemContext) => void;
} {
  const store = (overrides.componentStore as ComponentStore) ?? createComponentStore();
  const clock = (overrides.clock as ReturnType<typeof makeClock>) ?? makeClock();
  const sink = createSink();

  const system = createRespawnSystem({
    componentStore: store,
    clock,
    respawnDelayUs: overrides.respawnDelayUs,
    eventSink: overrides.eventSink ?? sink,
  });

  return { store, clock, sink, system };
}

function makeHealth(current: number, maximum: number, isAlive: boolean): HealthComponent {
  return { current, maximum, regenerationRate: 1, isAlive };
}

function makeTransform(x: number, y: number, z: number): TransformComponent {
  return {
    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

function makeSpawnPoint(capacity: number, activeSpawns: number): SpawnPointComponent {
  return { spawnType: 'player', capacity, activeSpawns, cooldownMicroseconds: 0 };
}

function makeWorldMembership(worldId: string): WorldMembershipComponent {
  return { worldId, enteredAt: 0, isTransitioning: false, transitionTargetWorldId: null };
}

// ── Tests ─────────────────────────────────────────────────────────

describe('Respawn System', () => {
  // ── Constants ─────────────────────────────────────────────────

  describe('constants', () => {
    it('runs at priority 175', () => {
      expect(RESPAWN_SYSTEM_PRIORITY).toBe(175);
    });
  });

  // ── Death Detection ───────────────────────────────────────────

  describe('death detection', () => {
    it('ignores alive entities', () => {
      const { store, clock, sink, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(100, 100, true));

      system(makeContext(1));
      clock.advance(10_000_000); // well past default 3s delay
      system(makeContext(2));

      expect(sink.events).toHaveLength(0);
    });

    it('starts respawn timer on death', () => {
      const { store, clock, sink, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(100, 0, 100));

      // First tick — starts timer
      system(makeContext(1));
      expect(sink.events).toHaveLength(0); // not yet respawned

      // Advance past 3s delay
      clock.advance(3_000_001);
      system(makeContext(2));
      expect(sink.events).toHaveLength(1);
    });

    it('does not respawn before delay expires', () => {
      const { store, clock, sink, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(50, 0, 50));

      system(makeContext(1)); // register death
      clock.advance(2_999_999); // just under 3s
      system(makeContext(2));
      expect(sink.events).toHaveLength(0);
    });
  });

  // ── Health Restoration ────────────────────────────────────────

  describe('health restoration', () => {
    it('restores health to maximum on respawn', () => {
      const { store, clock, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 200, false));
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(0, 0, 0));

      system(makeContext(1));
      clock.advance(3_000_001);
      system(makeContext(2));

      const health = store.tryGet('e1' as EntityId, 'health') as HealthComponent;
      expect(health.current).toBe(200);
      expect(health.maximum).toBe(200);
      expect(health.isAlive).toBe(true);
    });

    it('preserves regeneration rate after respawn', () => {
      const { store, clock, system } = setupWorld();

      store.set('e1' as EntityId, 'health', {
        current: 0, maximum: 150, regenerationRate: 5, isAlive: false,
      });
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(0, 0, 0));

      system(makeContext(1));
      clock.advance(3_000_001);
      system(makeContext(2));

      const health = store.tryGet('e1' as EntityId, 'health') as HealthComponent;
      expect(health.regenerationRate).toBe(5);
    });
  });

  // ── Teleportation ─────────────────────────────────────────────

  describe('teleportation', () => {
    it('teleports entity to spawn point position', () => {
      const { store, clock, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      store.set('e1' as EntityId, 'transform', makeTransform(10, 20, 30));
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(500, 0, 500));

      system(makeContext(1));
      clock.advance(3_000_001);
      system(makeContext(2));

      const transform = store.tryGet('e1' as EntityId, 'transform') as TransformComponent;
      expect(transform.position.x).toBe(500);
      expect(transform.position.y).toBe(0);
      expect(transform.position.z).toBe(500);
    });
  });

  // ── Spawn Point Selection ─────────────────────────────────────

  describe('spawn point selection', () => {
    it('selects spawn point with most remaining capacity', () => {
      const { store, clock, sink, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));

      // sp1: capacity 5, active 4 → remaining 1
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(5, 4));
      store.set('sp1' as EntityId, 'transform', makeTransform(100, 0, 0));

      // sp2: capacity 10, active 2 → remaining 8 (best)
      store.set('sp2' as EntityId, 'spawn-point', makeSpawnPoint(10, 2));
      store.set('sp2' as EntityId, 'transform', makeTransform(200, 0, 0));

      system(makeContext(1));
      clock.advance(3_000_001);
      system(makeContext(2));

      expect(sink.events).toHaveLength(1);
      expect(sink.events[0].spawnPointEntityId).toBe('sp2');
      expect(sink.events[0].respawnPosition.x).toBe(200);
    });

    it('only considers player spawn points', () => {
      const { store, clock, sink, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));

      // NPC spawn point (should be skipped)
      store.set('sp-npc' as EntityId, 'spawn-point', {
        spawnType: 'npc', capacity: 100, activeSpawns: 0, cooldownMicroseconds: 0,
      });
      store.set('sp-npc' as EntityId, 'transform', makeTransform(999, 0, 999));

      // Player spawn point
      store.set('sp-player' as EntityId, 'spawn-point', makeSpawnPoint(5, 0));
      store.set('sp-player' as EntityId, 'transform', makeTransform(50, 0, 50));

      system(makeContext(1));
      clock.advance(3_000_001);
      system(makeContext(2));

      expect(sink.events[0].spawnPointEntityId).toBe('sp-player');
    });

    it('filters spawn points by world membership', () => {
      const { store, clock, sink, system } = setupWorld();

      // Entity in world-A
      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      store.set('e1' as EntityId, 'world-membership', makeWorldMembership('world-A'));

      // Spawn in world-B (should be skipped)
      store.set('sp-B' as EntityId, 'spawn-point', makeSpawnPoint(100, 0));
      store.set('sp-B' as EntityId, 'transform', makeTransform(999, 0, 999));
      store.set('sp-B' as EntityId, 'world-membership', makeWorldMembership('world-B'));

      // Spawn in world-A (should be selected)
      store.set('sp-A' as EntityId, 'spawn-point', makeSpawnPoint(5, 0));
      store.set('sp-A' as EntityId, 'transform', makeTransform(42, 0, 42));
      store.set('sp-A' as EntityId, 'world-membership', makeWorldMembership('world-A'));

      system(makeContext(1));
      clock.advance(3_000_001);
      system(makeContext(2));

      expect(sink.events).toHaveLength(1);
      expect(sink.events[0].spawnPointEntityId).toBe('sp-A');
    });

    it('does not respawn if no valid spawn point exists', () => {
      const { store, clock, sink, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      // No spawn points at all

      system(makeContext(1));
      clock.advance(10_000_000);
      system(makeContext(2));

      expect(sink.events).toHaveLength(0);

      // Entity stays dead
      const health = store.tryGet('e1' as EntityId, 'health') as HealthComponent;
      expect(health.isAlive).toBe(false);
    });

    it('accepts spawn points without world membership (universal)', () => {
      const { store, clock, sink, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      store.set('e1' as EntityId, 'world-membership', makeWorldMembership('world-A'));

      // Spawn with no world membership — universal
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(77, 0, 77));

      system(makeContext(1));
      clock.advance(3_000_001);
      system(makeContext(2));

      expect(sink.events).toHaveLength(1);
      expect(sink.events[0].spawnPointEntityId).toBe('sp1');
    });
  });

  // ── Event Emission ────────────────────────────────────────────

  describe('event emission', () => {
    it('emits respawn event with correct data', () => {
      const { store, clock, sink, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      store.set('e1' as EntityId, 'transform', makeTransform(10, 20, 30));
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(500, 50, 500));

      system(makeContext(1));
      clock.advance(3_000_001);
      system(makeContext(2));

      const event = sink.events[0];
      expect(event.entityId).toBe('e1');
      expect(event.spawnPointEntityId).toBe('sp1');
      expect(event.previousPosition).toEqual({ x: 10, y: 20, z: 30 });
      expect(event.respawnPosition).toEqual({ x: 500, y: 50, z: 500 });
    });

    it('includes timestamp in event', () => {
      const { store, clock, sink, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(0, 0, 0));

      clock.advance(1_000_000);
      system(makeContext(1));
      clock.advance(3_000_001);
      system(makeContext(2));

      expect(sink.events[0].timestamp).toBe(4_000_001);
    });
  });

  // ── Custom Delay ──────────────────────────────────────────────

  describe('custom respawn delay', () => {
    it('respects custom delay', () => {
      const store = createComponentStore();
      const clock = makeClock();
      const sink = createSink();

      const system = createRespawnSystem({
        componentStore: store,
        clock,
        respawnDelayUs: 1_000_000, // 1 second
        eventSink: sink,
      });

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(0, 0, 0));

      system(makeContext(1));
      clock.advance(1_000_001);
      system(makeContext(2));

      expect(sink.events).toHaveLength(1);
    });
  });

  // ── Timer Reset ───────────────────────────────────────────────

  describe('timer management', () => {
    it('clears timer when entity becomes alive externally', () => {
      const { store, clock, sink, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(0, 0, 0));

      // Start timer
      system(makeContext(1));

      // Externally revive before delay expires
      store.set('e1' as EntityId, 'health', makeHealth(100, 100, true));
      clock.advance(5_000_000);
      system(makeContext(2));

      expect(sink.events).toHaveLength(0); // no respawn event

      // Kill again — should start a fresh timer
      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      system(makeContext(3));
      clock.advance(2_999_999);
      system(makeContext(4));
      expect(sink.events).toHaveLength(0); // not yet

      clock.advance(2);
      system(makeContext(5));
      expect(sink.events).toHaveLength(1); // now
    });

    it('handles multiple deaths independently', () => {
      const { store, clock, sink, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      store.set('e2' as EntityId, 'health', makeHealth(0, 200, false));
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(0, 0, 0));

      // Both start timers
      system(makeContext(1));

      // Only e1 respawns (3s delay)
      clock.advance(3_000_001);
      system(makeContext(2));

      expect(sink.events).toHaveLength(2); // both respawn at same time
      const e1Event = sink.events.find(e => e.entityId === 'e1');
      const e2Event = sink.events.find(e => e.entityId === 'e2');
      expect(e1Event).toBeDefined();
      expect(e2Event).toBeDefined();
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────

  describe('edge cases', () => {
    it('uses {0,0,0} for entity with no transform', () => {
      const { store, clock, sink, system } = setupWorld();

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      // No transform on e1
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(50, 50, 50));

      system(makeContext(1));
      clock.advance(3_000_001);
      system(makeContext(2));

      expect(sink.events[0].previousPosition).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('works without event sink', () => {
      const store = createComponentStore();
      const clock = makeClock();

      const system = createRespawnSystem({
        componentStore: store,
        clock,
        // no eventSink
      });

      store.set('e1' as EntityId, 'health', makeHealth(0, 100, false));
      store.set('sp1' as EntityId, 'spawn-point', makeSpawnPoint(10, 0));
      store.set('sp1' as EntityId, 'transform', makeTransform(0, 0, 0));

      system(makeContext(1));
      clock.advance(3_000_001);
      // Should not throw
      system(makeContext(2));

      const health = store.tryGet('e1' as EntityId, 'health') as HealthComponent;
      expect(health.isAlive).toBe(true);
    });

    it('no-ops on empty world', () => {
      const { system } = setupWorld();
      // No entities — should not throw
      system(makeContext(1));
      system(makeContext(2));
    });
  });
});
