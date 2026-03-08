/**
 * Shuttle System — Bridges the ShuttleOrchestrator into the ECS tick loop.
 *
 * Runs at priority 400 (after movement, before bridge) so that NPC
 * decisions feed into the visual pipeline for the same frame.
 *
 * The key adapter responsibility: query the ComponentStore for entities
 * with `npc-tier` + `world-membership` components and present them as
 * the ShuttlePopulationPort that the orchestrator requires. This bridges
 * the ECS data model to the shuttle's port-based interface.
 */

import type { EntityId, NpcTierComponent, WorldMembershipComponent, IdentityComponent } from '@loom/entities-contracts';
import type { ComponentStore } from './component-store.js';
import type { SystemFn, SystemContext } from './system-registry.js';

// ── Ports ──────────────────────────────────────────────────────────

/**
 * The subset of ShuttleOrchestrator this adapter needs.
 * Defined here so loom-core never imports shuttle directly.
 */
export interface ShuttleSystemOrchestrator {
  readonly tick: (worldId: string, deltaUs: number) => ShuttleSystemTickResult;
}

export interface ShuttleSystemTickResult {
  readonly npcsProcessed: number;
  readonly decisionsActed: number;
  readonly tickNumber: number;
}

/** Port to discover which worlds have active NPCs. */
export interface ShuttleWorldListPort {
  readonly listWorldIds: () => ReadonlyArray<string>;
}

export interface ShuttleSystemDeps {
  readonly orchestrator: ShuttleSystemOrchestrator;
  readonly componentStore: ComponentStore;
  readonly worldList: ShuttleWorldListPort;
}

// ── Priority ───────────────────────────────────────────────────────

export const SHUTTLE_SYSTEM_PRIORITY = 400;

// ── NPC Record (matches shuttle port) ──────────────────────────────

export interface ShuttleEcsNpcRecord {
  readonly npcId: string;
  readonly worldId: string;
  readonly tier: number;
  readonly displayName: string;
}

// ── Factory ────────────────────────────────────────────────────────

function createShuttleSystem(deps: ShuttleSystemDeps): SystemFn {
  return (ctx: SystemContext): void => {
    const deltaUs = ctx.deltaMs * 1000;
    const worlds = deps.worldList.listWorldIds();

    for (const worldId of worlds) {
      deps.orchestrator.tick(worldId, deltaUs);
    }
  };
}

// ── ECS Population Adapter ─────────────────────────────────────────

/**
 * Builds a ShuttlePopulationPort from the ComponentStore.
 * Queries entities with `npc-tier` + `world-membership` components
 * and maps them into the format the shuttle orchestrator expects.
 */
function createEcsPopulationAdapter(
  store: ComponentStore,
): { readonly listActiveNpcs: (worldId: string) => ReadonlyArray<ShuttleEcsNpcRecord> } {
  return {
    listActiveNpcs: (worldId: string): ShuttleEcsNpcRecord[] => {
      return queryNpcsInWorld(store, worldId);
    },
  };
}

function queryNpcsInWorld(
  store: ComponentStore,
  worldId: string,
): ShuttleEcsNpcRecord[] {
  const npcEntities = store.findEntitiesWith('npc-tier');
  const results: ShuttleEcsNpcRecord[] = [];

  for (const entityId of npcEntities) {
    const record = tryBuildNpcRecord(store, entityId, worldId);
    if (record !== undefined) results.push(record);
  }

  return results;
}

function tryBuildNpcRecord(
  store: ComponentStore,
  entityId: EntityId,
  worldId: string,
): ShuttleEcsNpcRecord | undefined {
  if (!store.has(entityId, 'world-membership')) return undefined;

  const membership = store.get(entityId, 'world-membership') as WorldMembershipComponent;
  if (membership.worldId !== worldId) return undefined;

  const tierComp = store.get(entityId, 'npc-tier') as NpcTierComponent;
  const identity = store.tryGet(entityId, 'identity') as IdentityComponent | undefined;

  return {
    npcId: entityId,
    worldId,
    tier: tierComp.tier,
    displayName: identity?.displayName ?? entityId,
  };
}

// ── Exports ────────────────────────────────────────────────────────

export { createShuttleSystem, createEcsPopulationAdapter };
