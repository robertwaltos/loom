/**
 * World Population Engine — NPC population lifecycle per world.
 *
 * Bible v1.1: Each world maintains NPC populations across four tiers.
 * Population health affects shadow economy productivity, which in turn
 * affects KALON issuance via the Stellar Standard formula.
 *
 * Tier quotas:
 *   Tier 1 (Crowd Agents):      100,000 per world
 *   Tier 2 (Inhabitants):        10,000 per world
 *   Tier 3 (Notable Agents):      1,000 per world
 *   Tier 4 (Architect's Agents): 50 global cap (no per-world quota)
 *
 * Population health = weighted fill ratio across tiers.
 * Health drives the shadow economy's productivity index.
 */

import type { NpcTier } from './npc-tiers.js';

// ─── Types ───────────────────────────────────────────────────────────

export interface WorldPopulationState {
  readonly worldId: string;
  readonly tier1Count: number;
  readonly tier2Count: number;
  readonly tier3Count: number;
  readonly tier4Count: number;
  readonly totalPopulation: number;
  readonly healthIndex: number;
  readonly productivityModifier: number;
}

export interface PopulationDelta {
  readonly worldId: string;
  readonly tier: NpcTier;
  readonly previousCount: number;
  readonly newCount: number;
  readonly healthBefore: number;
  readonly healthAfter: number;
}

export interface WorldPopulationEngine {
  initializeWorld(worldId: string): WorldPopulationState;
  spawn(worldId: string, tier: NpcTier, count: number): PopulationDelta;
  despawn(worldId: string, tier: NpcTier, count: number): PopulationDelta;
  getPopulation(worldId: string): WorldPopulationState;
  tryGetPopulation(worldId: string): WorldPopulationState | undefined;
  getHealth(worldId: string): number;
  getProductivityModifier(worldId: string): number;
  listWorlds(): ReadonlyArray<string>;
  count(): number;
}

// ─── Constants ─────────────────────────────────────────────────────

/** Per-world quotas for each tier. Null means no per-world quota. */
export const TIER_QUOTAS: Readonly<Record<NpcTier, number | null>> = {
  1: 100_000,
  2: 10_000,
  3: 1_000,
  4: null,
};

/** Weights for health calculation — higher tiers matter more per capita. */
const TIER_HEALTH_WEIGHTS: Readonly<Record<NpcTier, number>> = {
  1: 0.4,
  2: 0.3,
  3: 0.2,
  4: 0.1,
};

/** Maps health [0, 1] → productivity modifier [80, 120]. */
const PRODUCTIVITY_MIN = 80;
const PRODUCTIVITY_MAX = 120;
const PRODUCTIVITY_RANGE = PRODUCTIVITY_MAX - PRODUCTIVITY_MIN;

// ─── State ─────────────────────────────────────────────────────────

interface MutablePopulation {
  readonly worldId: string;
  counts: Record<NpcTier, number>;
}

interface EngineState {
  readonly populations: Map<string, MutablePopulation>;
}

// ─── Factory ───────────────────────────────────────────────────────

export function createWorldPopulationEngine(): WorldPopulationEngine {
  const state: EngineState = { populations: new Map() };

  return {
    initializeWorld: (wId) => initWorldImpl(state, wId),
    spawn: (wId, t, c) => spawnImpl(state, wId, t, c),
    despawn: (wId, t, c) => despawnImpl(state, wId, t, c),
    getPopulation: (wId) => getPopImpl(state, wId),
    tryGetPopulation: (wId) => tryGetPopImpl(state, wId),
    getHealth: (wId) => computeHealth(getMutable(state, wId)),
    getProductivityModifier: (wId) => computeProductivity(getMutable(state, wId)),
    listWorlds: () => [...state.populations.keys()],
    count: () => state.populations.size,
  };
}

// ─── Initialize ────────────────────────────────────────────────────

function initWorldImpl(state: EngineState, worldId: string): WorldPopulationState {
  if (state.populations.has(worldId)) {
    throw new Error('World ' + worldId + ' population already initialized');
  }
  const pop: MutablePopulation = {
    worldId,
    counts: { 1: 0, 2: 0, 3: 0, 4: 0 },
  };
  state.populations.set(worldId, pop);
  return toReadonly(pop);
}

// ─── Spawn / Despawn ───────────────────────────────────────────────

function spawnImpl(
  state: EngineState,
  worldId: string,
  tier: NpcTier,
  count: number,
): PopulationDelta {
  const pop = getMutable(state, worldId);
  const previousCount = pop.counts[tier];
  const healthBefore = computeHealth(pop);

  const quota = TIER_QUOTAS[tier];
  const maxSpawn = quota !== null ? quota - previousCount : count;
  const actualSpawn = Math.max(0, Math.min(count, maxSpawn));

  pop.counts[tier] = previousCount + actualSpawn;
  const healthAfter = computeHealth(pop);

  return {
    worldId,
    tier,
    previousCount,
    newCount: pop.counts[tier],
    healthBefore,
    healthAfter,
  };
}

function despawnImpl(
  state: EngineState,
  worldId: string,
  tier: NpcTier,
  count: number,
): PopulationDelta {
  const pop = getMutable(state, worldId);
  const previousCount = pop.counts[tier];
  const healthBefore = computeHealth(pop);

  const actualDespawn = Math.min(count, previousCount);
  pop.counts[tier] = previousCount - actualDespawn;
  const healthAfter = computeHealth(pop);

  return {
    worldId,
    tier,
    previousCount,
    newCount: pop.counts[tier],
    healthBefore,
    healthAfter,
  };
}

// ─── Queries ───────────────────────────────────────────────────────

function getPopImpl(state: EngineState, worldId: string): WorldPopulationState {
  return toReadonly(getMutable(state, worldId));
}

function tryGetPopImpl(state: EngineState, worldId: string): WorldPopulationState | undefined {
  const pop = state.populations.get(worldId);
  return pop !== undefined ? toReadonly(pop) : undefined;
}

// ─── Health Calculation ────────────────────────────────────────────

function computeHealth(pop: MutablePopulation): number {
  let health = 0;
  const tiers: ReadonlyArray<NpcTier> = [1, 2, 3, 4];
  for (const tier of tiers) {
    health += tierFillRatio(pop, tier) * TIER_HEALTH_WEIGHTS[tier];
  }
  return clampZeroOne(health);
}

function tierFillRatio(pop: MutablePopulation, tier: NpcTier): number {
  const quota = TIER_QUOTAS[tier];
  if (quota === null) return pop.counts[tier] > 0 ? 1.0 : 0.0;
  if (quota === 0) return 0;
  return Math.min(1.0, pop.counts[tier] / quota);
}

// ─── Productivity ──────────────────────────────────────────────────

function computeProductivity(pop: MutablePopulation): number {
  const health = computeHealth(pop);
  return Math.round(PRODUCTIVITY_MIN + health * PRODUCTIVITY_RANGE);
}

// ─── Helpers ───────────────────────────────────────────────────────

function getMutable(state: EngineState, worldId: string): MutablePopulation {
  const pop = state.populations.get(worldId);
  if (pop === undefined) {
    throw new Error('World ' + worldId + ' population not initialized');
  }
  return pop;
}

function clampZeroOne(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function totalPopulation(pop: MutablePopulation): number {
  return pop.counts[1] + pop.counts[2] + pop.counts[3] + pop.counts[4];
}

function toReadonly(pop: MutablePopulation): WorldPopulationState {
  return {
    worldId: pop.worldId,
    tier1Count: pop.counts[1],
    tier2Count: pop.counts[2],
    tier3Count: pop.counts[3],
    tier4Count: pop.counts[4],
    totalPopulation: totalPopulation(pop),
    healthIndex: computeHealth(pop),
    productivityModifier: computeProductivity(pop),
  };
}
