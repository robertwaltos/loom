/**
 * Population Economy System — Model population size, growth, and economic productivity per world.
 *
 * Each world tracks its population, tier classification, growth rate, and productivity index.
 * Provides growth simulation (compound annual growth) and economic output computation.
 *
 * growthRateBps: basis points per year (e.g. 200 = 2% growth, -100 = -1% decline)
 * productivityIndex: multiplier in [0.5, 2.0]
 */

export type WorldId = string;
export type PopulationId = string;

export type PopError =
  | 'world-not-found'
  | 'already-registered'
  | 'invalid-population'
  | 'invalid-rate';

export type PopulationTier =
  | 'SUBSISTENCE'
  | 'DEVELOPING'
  | 'ESTABLISHED'
  | 'PROSPEROUS'
  | 'DOMINANT';

export interface PopulationRecord {
  readonly worldId: WorldId;
  readonly totalPopulation: bigint;
  readonly tier: PopulationTier;
  readonly growthRateBps: number;
  readonly productivityIndex: number;
  readonly lastUpdated: bigint;
}

export interface PopulationSnapshot {
  readonly snapshotId: PopulationId;
  readonly worldId: WorldId;
  readonly population: bigint;
  readonly tier: PopulationTier;
  readonly takenAt: bigint;
}

export interface EconomicOutput {
  readonly worldId: WorldId;
  readonly baseOutput: bigint;
  readonly adjustedOutput: bigint;
  readonly productivityMultiplier: number;
  readonly populationMultiplier: number;
}

export interface PopulationEconomySystem {
  registerWorld(
    worldId: WorldId,
    initialPopulation: bigint,
    growthRateBps: number,
  ): PopulationRecord | PopError;
  updatePopulation(
    worldId: WorldId,
    newPopulation: bigint,
  ): { success: true } | { success: false; error: PopError };
  setGrowthRate(
    worldId: WorldId,
    growthRateBps: number,
  ): { success: true } | { success: false; error: PopError };
  setProductivityIndex(
    worldId: WorldId,
    index: number,
  ): { success: true } | { success: false; error: PopError };
  takeSnapshot(worldId: WorldId): PopulationSnapshot | PopError;
  simulateGrowth(
    worldId: WorldId,
    yearsElapsed: number,
  ): { success: true; projectedPopulation: bigint } | { success: false; error: PopError };
  computeEconomicOutput(worldId: WorldId, baseOutputKalon: bigint): EconomicOutput | PopError;
  getRecord(worldId: WorldId): PopulationRecord | undefined;
  listSnapshots(worldId: WorldId): ReadonlyArray<PopulationSnapshot>;
}

interface MutablePopRecord {
  worldId: WorldId;
  totalPopulation: bigint;
  tier: PopulationTier;
  growthRateBps: number;
  productivityIndex: number;
  lastUpdated: bigint;
}

interface PopulationEconomyState {
  readonly worlds: Map<WorldId, MutablePopRecord>;
  readonly snapshots: Map<WorldId, PopulationSnapshot[]>;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: { info(message: string, meta?: Record<string, unknown>): void };
}

const GROWTH_RATE_MIN = -5000;
const GROWTH_RATE_MAX = 10000;
const PRODUCTIVITY_MIN = 0.5;
const PRODUCTIVITY_MAX = 2.0;

export function createPopulationEconomySystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: { info(message: string, meta?: Record<string, unknown>): void };
}): PopulationEconomySystem {
  const state: PopulationEconomyState = {
    worlds: new Map(),
    snapshots: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    registerWorld: (worldId, initialPopulation, growthRateBps) =>
      registerWorldImpl(state, worldId, initialPopulation, growthRateBps),
    updatePopulation: (worldId, newPopulation) =>
      updatePopulationImpl(state, worldId, newPopulation),
    setGrowthRate: (worldId, growthRateBps) => setGrowthRateImpl(state, worldId, growthRateBps),
    setProductivityIndex: (worldId, index) => setProductivityIndexImpl(state, worldId, index),
    takeSnapshot: (worldId) => takeSnapshotImpl(state, worldId),
    simulateGrowth: (worldId, yearsElapsed) => simulateGrowthImpl(state, worldId, yearsElapsed),
    computeEconomicOutput: (worldId, baseOutputKalon) =>
      computeEconomicOutputImpl(state, worldId, baseOutputKalon),
    getRecord: (worldId) => state.worlds.get(worldId),
    listSnapshots: (worldId) => state.snapshots.get(worldId) ?? [],
  };
}

function classifyTier(population: bigint): PopulationTier {
  if (population < 10_000n) return 'SUBSISTENCE';
  if (population < 100_000n) return 'DEVELOPING';
  if (population < 1_000_000n) return 'ESTABLISHED';
  if (population < 10_000_000n) return 'PROSPEROUS';
  return 'DOMINANT';
}

function isValidGrowthRate(bps: number): boolean {
  return bps >= GROWTH_RATE_MIN && bps <= GROWTH_RATE_MAX;
}

function isValidProductivity(index: number): boolean {
  return index >= PRODUCTIVITY_MIN && index <= PRODUCTIVITY_MAX;
}

function registerWorldImpl(
  state: PopulationEconomyState,
  worldId: WorldId,
  initialPopulation: bigint,
  growthRateBps: number,
): PopulationRecord | PopError {
  if (state.worlds.has(worldId)) return 'already-registered';
  if (initialPopulation < 0n) return 'invalid-population';
  if (!isValidGrowthRate(growthRateBps)) return 'invalid-rate';

  const now = state.clock.nowMicroseconds();
  const record: MutablePopRecord = {
    worldId,
    totalPopulation: initialPopulation,
    tier: classifyTier(initialPopulation),
    growthRateBps,
    productivityIndex: 1.0,
    lastUpdated: now,
  };
  state.worlds.set(worldId, record);
  state.snapshots.set(worldId, []);
  state.logger.info('World registered for population tracking', {
    worldId,
    initialPopulation: String(initialPopulation),
    growthRateBps,
  });
  return record;
}

function updatePopulationImpl(
  state: PopulationEconomyState,
  worldId: WorldId,
  newPopulation: bigint,
): { success: true } | { success: false; error: PopError } {
  const record = state.worlds.get(worldId);
  if (!record) return { success: false, error: 'world-not-found' };
  if (newPopulation < 0n) return { success: false, error: 'invalid-population' };

  record.totalPopulation = newPopulation;
  record.tier = classifyTier(newPopulation);
  record.lastUpdated = state.clock.nowMicroseconds();
  state.logger.info('Population updated', { worldId, newPopulation: String(newPopulation) });
  return { success: true };
}

function setGrowthRateImpl(
  state: PopulationEconomyState,
  worldId: WorldId,
  growthRateBps: number,
): { success: true } | { success: false; error: PopError } {
  const record = state.worlds.get(worldId);
  if (!record) return { success: false, error: 'world-not-found' };
  if (!isValidGrowthRate(growthRateBps)) return { success: false, error: 'invalid-rate' };

  record.growthRateBps = growthRateBps;
  record.lastUpdated = state.clock.nowMicroseconds();
  return { success: true };
}

function setProductivityIndexImpl(
  state: PopulationEconomyState,
  worldId: WorldId,
  index: number,
): { success: true } | { success: false; error: PopError } {
  const record = state.worlds.get(worldId);
  if (!record) return { success: false, error: 'world-not-found' };
  if (!isValidProductivity(index)) return { success: false, error: 'invalid-rate' };

  record.productivityIndex = index;
  record.lastUpdated = state.clock.nowMicroseconds();
  return { success: true };
}

function takeSnapshotImpl(
  state: PopulationEconomyState,
  worldId: WorldId,
): PopulationSnapshot | PopError {
  const record = state.worlds.get(worldId);
  if (!record) return 'world-not-found';

  const snapshot: PopulationSnapshot = {
    snapshotId: state.idGen.generateId(),
    worldId,
    population: record.totalPopulation,
    tier: record.tier,
    takenAt: state.clock.nowMicroseconds(),
  };
  state.snapshots.get(worldId)?.push(snapshot);
  return snapshot;
}

function simulateGrowthImpl(
  state: PopulationEconomyState,
  worldId: WorldId,
  yearsElapsed: number,
): { success: true; projectedPopulation: bigint } | { success: false; error: PopError } {
  const record = state.worlds.get(worldId);
  if (!record) return { success: false, error: 'world-not-found' };
  if (yearsElapsed < 0) return { success: false, error: 'invalid-rate' };

  const annualRate = record.growthRateBps / 10000;
  const growthFactor = Math.pow(1 + annualRate, yearsElapsed);
  const projected = Math.round(Number(record.totalPopulation) * growthFactor);
  const projectedPopulation = BigInt(projected < 0 ? 0 : projected);
  return { success: true, projectedPopulation };
}

function computePopulationMultiplier(population: bigint): number {
  const raw = Math.log10(Number(population) + 1) / 7 + 0.5;
  return Math.min(PRODUCTIVITY_MAX, Math.max(PRODUCTIVITY_MIN, raw));
}

function computeEconomicOutputImpl(
  state: PopulationEconomyState,
  worldId: WorldId,
  baseOutputKalon: bigint,
): EconomicOutput | PopError {
  const record = state.worlds.get(worldId);
  if (!record) return 'world-not-found';

  const populationMultiplier = computePopulationMultiplier(record.totalPopulation);
  const combinedFactor = record.productivityIndex * populationMultiplier;
  const adjustedOutput = (baseOutputKalon * BigInt(Math.round(combinedFactor * 100))) / 100n;

  return {
    worldId,
    baseOutput: baseOutputKalon,
    adjustedOutput,
    productivityMultiplier: record.productivityIndex,
    populationMultiplier,
  };
}
