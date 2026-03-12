/**
 * respawn-system.ts — Handles entity death → respawn lifecycle.
 *
 * Each tick:
 *   1. Finds entities with health.isAlive === false
 *   2. Starts a respawn timer if not already counting
 *   3. When timer expires, restores health and teleports to a spawn point
 *   4. Emits respawn events through the event sink
 *
 * Runs at priority 175 (after action-dispatch at 150, before visual at 200).
 */

import type { ComponentStore } from './component-store.js';
import type { SystemFn, SystemContext } from './system-registry.js';
import type { EntityId } from '@loom/entities-contracts';
import type {
  TransformComponent,
  SpawnPointComponent,
  WorldMembershipComponent,
} from '@loom/entities-contracts';
import type { HealthComponent } from '@loom/entities-contracts';

// ── Types ─────────────────────────────────────────────────────────

export interface RespawnEvent {
  readonly entityId: EntityId;
  readonly spawnPointEntityId: EntityId;
  readonly timestamp: number;
  readonly previousPosition: { readonly x: number; readonly y: number; readonly z: number };
  readonly respawnPosition: { readonly x: number; readonly y: number; readonly z: number };
}

/** Port for external systems to observe respawns. */
export interface RespawnEventSink {
  onRespawn(event: RespawnEvent): void;
}

// ── Config ────────────────────────────────────────────────────────

/** Respawn delay in microseconds (3 seconds). */
const DEFAULT_RESPAWN_DELAY_US = 3_000_000;

/** Priority: after action-dispatch (150), before visual-state-mapper (200). */
export const RESPAWN_SYSTEM_PRIORITY = 175;

// ── Deps ──────────────────────────────────────────────────────────

export interface RespawnSystemDeps {
  readonly componentStore: ComponentStore;
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly respawnDelayUs?: number;
  readonly eventSink?: RespawnEventSink;
}

// ── Internal State ────────────────────────────────────────────────

interface RespawnTimer {
  readonly diedAtUs: number;
  readonly respawnAtUs: number;
}

interface RespawnState {
  readonly store: ComponentStore;
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly respawnDelayUs: number;
  readonly eventSink: RespawnEventSink | undefined;
  readonly timers: Map<string, RespawnTimer>;
}

// ── Spawn Point Selection ─────────────────────────────────────────

function findRespawnPoint(state: RespawnState, entityId: EntityId): EntityId | null {
  const membership = state.store.tryGet(entityId, 'world-membership') as
    | WorldMembershipComponent
    | undefined;
  const worldId = membership?.worldId ?? 'default';

  const spawnEntities = state.store.findEntitiesWith('spawn-point');
  let bestId: EntityId | null = null;
  let bestCapacity = -1;

  for (const spId of spawnEntities) {
    const sp = state.store.tryGet(spId, 'spawn-point') as SpawnPointComponent | undefined;
    if (sp === undefined) continue;
    if (sp.spawnType !== 'player') continue;

    const spMembership = state.store.tryGet(spId, 'world-membership') as
      | WorldMembershipComponent
      | undefined;
    if (spMembership !== undefined && spMembership.worldId !== worldId) continue;

    const remaining = sp.capacity - sp.activeSpawns;
    if (remaining > bestCapacity) {
      bestCapacity = remaining;
      bestId = spId;
    }
  }

  return bestId;
}

function getEntityPosition(state: RespawnState, entityId: EntityId): { x: number; y: number; z: number } {
  const t = state.store.tryGet(entityId, 'transform') as TransformComponent | undefined;
  return t ? { x: t.position.x, y: t.position.y, z: t.position.z } : { x: 0, y: 0, z: 0 };
}

// ── Respawn Logic ─────────────────────────────────────────────────

function processRespawn(state: RespawnState, entityId: EntityId, nowUs: number): void {
  const spawnPointId = findRespawnPoint(state, entityId);
  if (spawnPointId === null) return;

  const prevPos = getEntityPosition(state, entityId);
  const spawnTransform = state.store.tryGet(spawnPointId, 'transform') as
    | TransformComponent
    | undefined;
  const respawnPos = spawnTransform
    ? { x: spawnTransform.position.x, y: spawnTransform.position.y, z: spawnTransform.position.z }
    : { x: 0, y: 0, z: 0 };

  const health = state.store.tryGet(entityId, 'health') as HealthComponent;
  state.store.set(entityId, 'health', {
    current: health.maximum,
    maximum: health.maximum,
    regenerationRate: health.regenerationRate,
    isAlive: true,
  });

  if (spawnTransform) {
    state.store.set(entityId, 'transform', spawnTransform);
  }

  state.timers.delete(entityId as string);

  state.eventSink?.onRespawn({
    entityId,
    spawnPointEntityId: spawnPointId,
    timestamp: nowUs,
    previousPosition: prevPos,
    respawnPosition: respawnPos,
  });
}

// ── Tick ───────────────────────────────────────────────────────────

function tick(state: RespawnState, context: SystemContext): void {
  const nowUs = state.clock.nowMicroseconds();
  const entities = state.store.findEntitiesWith('health');

  for (const entityId of entities) {
    const health = state.store.tryGet(entityId, 'health') as HealthComponent | undefined;
    if (health === undefined) continue;

    if (health.isAlive) {
      state.timers.delete(entityId as string);
      continue;
    }

    const existing = state.timers.get(entityId as string);
    if (existing === undefined) {
      state.timers.set(entityId as string, {
        diedAtUs: nowUs,
        respawnAtUs: nowUs + state.respawnDelayUs,
      });
      continue;
    }

    if (nowUs >= existing.respawnAtUs) {
      processRespawn(state, entityId, nowUs);
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────

function createRespawnSystem(deps: RespawnSystemDeps): SystemFn {
  const state: RespawnState = {
    store: deps.componentStore,
    clock: deps.clock,
    respawnDelayUs: deps.respawnDelayUs ?? DEFAULT_RESPAWN_DELAY_US,
    eventSink: deps.eventSink,
    timers: new Map(),
  };

  return (context: SystemContext) => {
    tick(state, context);
  };
}

// ── Exports ───────────────────────────────────────────────────────

export { createRespawnSystem };
