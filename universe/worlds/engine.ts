/**
 * Worlds Query Engine — Koydo Worlds
 *
 * Injected-deps query layer over WorldDefinition data.
 * Adds threadway graph traversal, entry-index lookups,
 * and The Fading luminance-to-stage computation.
 */

import type { WorldDefinition, FadingStage, Realm } from './types.js';

// ─── Public Types ──────────────────────────────────────────────────

export interface WorldsEngineDeps {
  readonly worlds: readonly WorldDefinition[];
}

export interface WorldsEngineStats {
  readonly totalWorlds: number;
  readonly worldsByRealm: Record<Realm, number>;
}

export interface WorldsEngine {
  getWorldById(worldId: string): WorldDefinition | undefined;
  getWorldsByRealm(realm: Realm): readonly WorldDefinition[];
  getThreadwayNeighbors(worldId: string): readonly WorldDefinition[];
  getWorldsContainingEntry(entryId: string): readonly WorldDefinition[];
  computeFadingStage(luminance: number): FadingStage;
  getWorldsNeedingRestoration(
    luminanceMap: ReadonlyMap<string, number>,
    threshold: number,
  ): readonly WorldDefinition[];
  getStats(): WorldsEngineStats;
}

// ─── Internal Context ──────────────────────────────────────────────

interface WorldsContext {
  readonly deps: WorldsEngineDeps;
  readonly index: ReadonlyMap<string, WorldDefinition>;
}

function buildIndex(worlds: readonly WorldDefinition[]): ReadonlyMap<string, WorldDefinition> {
  return new Map(worlds.map(w => [w.id, w]));
}

// ─── Query Implementations ─────────────────────────────────────────

function realmWorlds(ctx: WorldsContext, realm: Realm): readonly WorldDefinition[] {
  return ctx.deps.worlds.filter(w => w.realm === realm);
}

function threadwayNeighbors(ctx: WorldsContext, worldId: string): readonly WorldDefinition[] {
  const world = ctx.index.get(worldId);
  if (world === undefined) return [];
  return world.threadwayConnections
    .map(id => ctx.index.get(id))
    .filter((w): w is WorldDefinition => w !== undefined);
}

function worldsForEntry(ctx: WorldsContext, entryId: string): readonly WorldDefinition[] {
  return ctx.deps.worlds.filter(w => w.entryIds.includes(entryId));
}

function worldsNeedingRestoration(
  ctx: WorldsContext,
  luminanceMap: ReadonlyMap<string, number>,
  threshold: number,
): readonly WorldDefinition[] {
  return ctx.deps.worlds.filter(w => (luminanceMap.get(w.id) ?? 0) < threshold);
}

function worldStats(ctx: WorldsContext): WorldsEngineStats {
  const realms: readonly Realm[] = ['discovery', 'expression', 'exchange', 'crossroads'];
  const worldsByRealm = Object.fromEntries(
    realms.map(r => [r, ctx.deps.worlds.filter(w => w.realm === r).length]),
  ) as Record<Realm, number>;
  return { totalWorlds: ctx.deps.worlds.length, worldsByRealm };
}

// ─── Pure Fading Stage Computation ────────────────────────────────

export function computeFadingStage(luminance: number): FadingStage {
  if (luminance >= 0.8) return 'radiant';
  if (luminance >= 0.6) return 'glowing';
  if (luminance >= 0.4) return 'dimming';
  if (luminance >= 0.2) return 'fading';
  return 'deep_fade';
}

// ─── Factory ───────────────────────────────────────────────────────

export function createWorldsEngine(deps: WorldsEngineDeps): WorldsEngine {
  const index = buildIndex(deps.worlds);
  const ctx: WorldsContext = { deps, index };
  return {
    getWorldById: (id) => ctx.index.get(id),
    getWorldsByRealm: (realm) => realmWorlds(ctx, realm),
    getThreadwayNeighbors: (id) => threadwayNeighbors(ctx, id),
    getWorldsContainingEntry: (entryId) => worldsForEntry(ctx, entryId),
    computeFadingStage: (luminance) => computeFadingStage(luminance),
    getWorldsNeedingRestoration: (map, threshold) => worldsNeedingRestoration(ctx, map, threshold),
    getStats: () => worldStats(ctx),
  };
}
