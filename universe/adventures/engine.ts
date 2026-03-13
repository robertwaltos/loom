/**
 * Adventures Engine — Koydo Worlds
 *
 * Query and state-resolution layer over AdventureConfig data.
 * Computes adventure state from prerequisite data + progress records.
 */

import type { AdventureConfig, AdventureProgress, AdventureState } from './types.js';

// ─── Public Types ──────────────────────────────────────────────────

export interface AdventuresEngineDeps {
  readonly configs: readonly AdventureConfig[];
  /**
   * Optional prerequisite map: entryId → ids that must be completed first.
   * When absent all entries are treated as having no prerequisites.
   */
  readonly entryPrereqs?: ReadonlyMap<string, readonly string[]>;
}

export interface AdventuresEngineStats {
  readonly totalConfigs: number;
  readonly totalEstimatedMinutes: number;
  readonly configsByWorld: ReadonlyMap<string, number>;
  readonly configsByType: ReadonlyMap<string, number>;
}

export interface AdventuresEngine {
  getConfigForEntry(entryId: string): AdventureConfig | undefined;
  getConfigsForWorld(worldId: string): readonly AdventureConfig[];
  getConfigsForGuide(guideId: string): readonly AdventureConfig[];
  computeAdventureState(
    entryId: string,
    completedEntryIds: readonly string[],
    progress?: AdventureProgress,
  ): AdventureState;
  getTotalEstimatedMinutes(worldId: string): number;
  getStats(): AdventuresEngineStats;
}

// ─── Internal Context ──────────────────────────────────────────────

interface AdventuresContext {
  readonly deps: AdventuresEngineDeps;
}

// ─── State Resolution ──────────────────────────────────────────────

function prereqsMet(
  ctx: AdventuresContext,
  entryId: string,
  completedEntryIds: readonly string[],
): boolean {
  const prereqs = ctx.deps.entryPrereqs?.get(entryId) ?? [];
  if (prereqs.length === 0) return true;
  const done = new Set(completedEntryIds);
  return prereqs.every(p => done.has(p));
}

function resolveState(
  ctx: AdventuresContext,
  entryId: string,
  completedEntryIds: readonly string[],
  progress: AdventureProgress | undefined,
): AdventureState {
  if (!prereqsMet(ctx, entryId, completedEntryIds)) return 'locked';
  if (progress === undefined) return 'available';
  return progress.state;
}

// ─── Stat Computation ─────────────────────────────────────────────

function buildStats(ctx: AdventuresContext): AdventuresEngineStats {
  const configsByWorld = new Map<string, number>();
  const configsByType = new Map<string, number>();
  let totalMinutes = 0;
  for (const c of ctx.deps.configs) {
    configsByWorld.set(c.worldId, (configsByWorld.get(c.worldId) ?? 0) + 1);
    configsByType.set(c.type, (configsByType.get(c.type) ?? 0) + 1);
    totalMinutes += c.estimatedMinutes;
  }
  return {
    totalConfigs: ctx.deps.configs.length,
    totalEstimatedMinutes: totalMinutes,
    configsByWorld,
    configsByType,
  };
}

// ─── Factory ───────────────────────────────────────────────────────

export function createAdventuresEngine(deps: AdventuresEngineDeps): AdventuresEngine {
  const ctx: AdventuresContext = { deps };
  return {
    getConfigForEntry: (id) => ctx.deps.configs.find(c => c.entryId === id),
    getConfigsForWorld: (worldId) => ctx.deps.configs.filter(c => c.worldId === worldId),
    getConfigsForGuide: (guideId) => ctx.deps.configs.filter(c => c.guideId === guideId),
    computeAdventureState: (entryId, completed, progress) =>
      resolveState(ctx, entryId, completed, progress),
    getTotalEstimatedMinutes: (worldId) =>
      ctx.deps.configs
        .filter(c => c.worldId === worldId)
        .reduce((sum, c) => sum + c.estimatedMinutes, 0),
    getStats: () => buildStats(ctx),
  };
}
