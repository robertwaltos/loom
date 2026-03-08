/**
 * Selvage Adapters — Bridge loom-core ECS APIs to selvage port interfaces.
 *
 * These adapters close the gap between the networking layer (selvage)
 * and the game state layer (loom-core) without either fabric importing
 * the other. The GameOrchestrator wires them together at composition time.
 *
 * Three adapters:
 *   EntityQueryAdapter — ComponentStore → selvage EntityQueryPort
 *   ComponentQueryAdapter — ComponentStore → selvage ComponentQueryPort
 *   PlayerEntityAdapter — EntityRegistry → selvage PlayerEntityPort
 *
 * Plus: SelvageBroadcastSystem — SystemFn that calls broadcastSnapshot.
 */

import type { EntityId } from '@loom/entities-contracts';
import type { ComponentStore } from './component-store.js';
import type { SystemFn, SystemContext } from './system-registry.js';

// ── Selvage Port Interfaces (duplicated to avoid cross-import) ──

/**
 * Mirrors selvage's EntityQueryPort. Defined here so loom-core
 * never imports the selvage package directly.
 */
export interface SelvageEntityQueryPort {
  queryByWorld(worldId: string): ReadonlyArray<SelvageSnapshotEntity>;
}

export interface SelvageSnapshotEntity {
  readonly id: string;
  readonly type: string;
  readonly worldId: string;
}

/**
 * Mirrors selvage's ComponentQueryPort.
 */
export interface SelvageComponentQueryPort {
  getComponents(entityId: string): Record<string, unknown>;
}

/**
 * Mirrors selvage's PlayerEntityPort.
 */
export interface SelvagePlayerEntityPort {
  spawnPlayer(connectionId: string, worldId: string): string;
  despawnPlayer(entityId: string): void;
}

/**
 * Minimal subset of NetworkServer needed by the broadcast system.
 */
export interface SelvaeBroadcastPort {
  broadcastSnapshot(tick: number, timestamp: number): void;
}

// ── Entity Query Source Port ───────────────────────────────────────

export interface EntityQuerySourcePort {
  readonly queryByWorld: (worldId: string) => ReadonlyArray<{
    readonly id: string;
    readonly type: string;
    readonly worldId: string;
  }>;
}

// ── Entity Query Adapter ───────────────────────────────────────────

function createEntityQueryAdapter(
  source: EntityQuerySourcePort,
): SelvageEntityQueryPort {
  return {
    queryByWorld: (worldId: string): SelvageSnapshotEntity[] => {
      return source.queryByWorld(worldId).map(projectEntity);
    },
  };
}

function projectEntity(entity: {
  readonly id: string;
  readonly type: string;
  readonly worldId: string;
}): SelvageSnapshotEntity {
  return { id: entity.id, type: entity.type, worldId: entity.worldId };
}

// ── Component Query Adapter ────────────────────────────────────────

function createComponentQueryAdapter(
  store: ComponentStore,
): SelvageComponentQueryPort {
  return {
    getComponents: (entityId: string): Record<string, unknown> => {
      return buildComponentMap(store, entityId as EntityId);
    },
  };
}

function buildComponentMap(
  store: ComponentStore,
  entityId: EntityId,
): Record<string, unknown> {
  const types = store.listComponents(entityId);
  const result: Record<string, unknown> = {};

  for (const type of types) {
    result[type] = store.tryGet(entityId, type);
  }

  return result;
}

// ── Player Entity Adapter ──────────────────────────────────────────

export interface PlayerEntityAdapterDeps {
  readonly spawnPlayer: (connectionId: string, worldId: string) => string;
  readonly despawnPlayer: (entityId: string) => void;
}

function createPlayerEntityAdapter(
  deps: PlayerEntityAdapterDeps,
): SelvagePlayerEntityPort {
  return {
    spawnPlayer: deps.spawnPlayer,
    despawnPlayer: deps.despawnPlayer,
  };
}

// ── Broadcast System ───────────────────────────────────────────────

export const SELVAGE_BROADCAST_PRIORITY = 950;

function createSelvageBroadcastSystem(
  broadcast: SelvaeBroadcastPort,
): SystemFn {
  return (ctx: SystemContext): void => {
    const timestampMs = Math.floor(ctx.wallTimeMicroseconds / 1000);
    broadcast.broadcastSnapshot(ctx.tickNumber, timestampMs);
  };
}

// ── Exports ────────────────────────────────────────────────────────

export {
  createEntityQueryAdapter,
  createComponentQueryAdapter,
  createPlayerEntityAdapter,
  createSelvageBroadcastSystem,
};
