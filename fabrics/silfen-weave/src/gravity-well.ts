/**
 * gravity-well.ts — Gravitational influence zones affecting transit costs and ship behavior.
 *
 * Each world may have at most one gravity well. Wells affect transit cost multipliers
 * based on mass and escape velocity. Transit costs use the maximum multiplier of
 * the source and destination wells.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface GravityClockPort {
  now(): bigint;
}

export interface GravityIdGeneratorPort {
  generate(): string;
}

export interface GravityLoggerPort {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ── Types ────────────────────────────────────────────────────────

export type WellId = string;
export type WorldId = string;

export type GravityError =
  | 'well-not-found'
  | 'world-not-found'
  | 'already-registered'
  | 'invalid-mass'
  | 'invalid-radius';

export type WellStrength = 'NEGLIGIBLE' | 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME';

export interface GravityWell {
  readonly wellId: WellId;
  readonly worldId: WorldId;
  readonly massKg: bigint;
  readonly radiusKm: number;
  readonly strength: WellStrength;
  readonly escapeVelocityKms: number;
  readonly transitCostMultiplier: number;
  readonly registeredAt: bigint;
}

export interface TransitCostCalc {
  readonly fromWellId: WellId | null;
  readonly toWellId: WellId | null;
  readonly baseCost: bigint;
  readonly adjustedCost: bigint;
  readonly multiplier: number;
}

export interface WellStats {
  readonly totalWells: number;
  readonly byStrength: Record<WellStrength, number>;
  readonly avgEscapeVelocity: number;
}

// ── System Interface ──────────────────────────────────────────────

export interface GravityWellSystem {
  readonly registerWorld: (
    worldId: WorldId,
  ) => { success: true } | { success: false; error: GravityError };
  readonly createWell: (
    worldId: WorldId,
    massKg: bigint,
    radiusKm: number,
  ) => GravityWell | GravityError;
  readonly calculateTransitCost: (
    fromWorldId: WorldId | null,
    toWorldId: WorldId | null,
    baseCostKalon: bigint,
  ) => TransitCostCalc;
  readonly getWellForWorld: (worldId: WorldId) => GravityWell | undefined;
  readonly getWell: (wellId: WellId) => GravityWell | undefined;
  readonly listWells: () => ReadonlyArray<GravityWell>;
  readonly getStats: () => WellStats;
}

// ── State ────────────────────────────────────────────────────────

interface GravityWellState {
  readonly worlds: Set<WorldId>;
  readonly wells: Map<WellId, GravityWell>;
  readonly worldToWell: Map<WorldId, WellId>;
  readonly clock: GravityClockPort;
  readonly idGen: GravityIdGeneratorPort;
  readonly logger: GravityLoggerPort;
}

// ── Constants ────────────────────────────────────────────────────

const G = 6.674e-11;

const STRENGTH_MULTIPLIERS: Record<WellStrength, number> = {
  NEGLIGIBLE: 1.0,
  WEAK: 1.1,
  MODERATE: 1.3,
  STRONG: 1.7,
  EXTREME: 2.5,
};

// ── Helpers ──────────────────────────────────────────────────────

function classifyStrength(massKg: bigint): WellStrength {
  if (massKg < 100_000_000_000_000_000_000_000n) return 'NEGLIGIBLE'; // < 1e23
  if (massKg < 1_000_000_000_000_000_000_000_000n) return 'WEAK'; // < 1e24
  if (massKg < 10_000_000_000_000_000_000_000_000n) return 'MODERATE'; // < 1e25
  if (massKg < 100_000_000_000_000_000_000_000_000n) return 'STRONG'; // < 1e26
  return 'EXTREME';
}

function computeEscapeVelocityKms(massKg: bigint, radiusKm: number): number {
  const massNum = Number(massKg);
  const radiusM = radiusKm * 1000;
  return Math.sqrt((2 * G * massNum) / radiusM) / 1000;
}

function applyMultiplier(baseCost: bigint, multiplier: number): bigint {
  return (baseCost * BigInt(Math.round(multiplier * 100))) / 100n;
}

// ── Operations ───────────────────────────────────────────────────

function registerWorld(
  state: GravityWellState,
  worldId: WorldId,
): { success: true } | { success: false; error: GravityError } {
  if (state.worlds.has(worldId)) {
    state.logger.warn('World already registered: ' + worldId);
    return { success: false, error: 'already-registered' };
  }
  state.worlds.add(worldId);
  state.logger.info('World registered for gravity well: ' + worldId);
  return { success: true };
}

function validateWellInputs(
  state: GravityWellState,
  worldId: WorldId,
  massKg: bigint,
  radiusKm: number,
): GravityError | null {
  if (!state.worlds.has(worldId)) {
    state.logger.error('World not found: ' + worldId);
    return 'world-not-found';
  }
  if (state.worldToWell.has(worldId)) {
    state.logger.warn('World already has a gravity well: ' + worldId);
    return 'already-registered';
  }
  if (massKg <= 0n) {
    state.logger.error('Invalid mass for world: ' + worldId);
    return 'invalid-mass';
  }
  if (radiusKm <= 0) {
    state.logger.error('Invalid radius for world: ' + worldId);
    return 'invalid-radius';
  }
  return null;
}

function buildGravityWell(
  state: GravityWellState,
  worldId: WorldId,
  massKg: bigint,
  radiusKm: number,
): GravityWell {
  const strength = classifyStrength(massKg);
  return {
    wellId: state.idGen.generate(),
    worldId,
    massKg,
    radiusKm,
    strength,
    escapeVelocityKms: computeEscapeVelocityKms(massKg, radiusKm),
    transitCostMultiplier: STRENGTH_MULTIPLIERS[strength],
    registeredAt: state.clock.now(),
  };
}

function createWell(
  state: GravityWellState,
  worldId: WorldId,
  massKg: bigint,
  radiusKm: number,
): GravityWell | GravityError {
  const err = validateWellInputs(state, worldId, massKg, radiusKm);
  if (err !== null) return err;
  const well = buildGravityWell(state, worldId, massKg, radiusKm);
  state.wells.set(well.wellId, well);
  state.worldToWell.set(worldId, well.wellId);
  state.logger.info('Gravity well created for world ' + worldId + ' strength=' + well.strength);
  return well;
}

function calculateTransitCost(
  state: GravityWellState,
  fromWorldId: WorldId | null,
  toWorldId: WorldId | null,
  baseCostKalon: bigint,
): TransitCostCalc {
  const fromWellId = fromWorldId !== null ? (state.worldToWell.get(fromWorldId) ?? null) : null;
  const toWellId = toWorldId !== null ? (state.worldToWell.get(toWorldId) ?? null) : null;
  const fromWell = fromWellId !== null ? state.wells.get(fromWellId) : undefined;
  const toWell = toWellId !== null ? state.wells.get(toWellId) : undefined;
  const fromMult = fromWell !== undefined ? fromWell.transitCostMultiplier : 1.0;
  const toMult = toWell !== undefined ? toWell.transitCostMultiplier : 1.0;
  const multiplier = Math.max(fromMult, toMult);
  return {
    fromWellId,
    toWellId,
    baseCost: baseCostKalon,
    adjustedCost: applyMultiplier(baseCostKalon, multiplier),
    multiplier,
  };
}

function getWellForWorld(state: GravityWellState, worldId: WorldId): GravityWell | undefined {
  const wellId = state.worldToWell.get(worldId);
  if (wellId === undefined) return undefined;
  return state.wells.get(wellId);
}

function getWell(state: GravityWellState, wellId: WellId): GravityWell | undefined {
  return state.wells.get(wellId);
}

function listWells(state: GravityWellState): ReadonlyArray<GravityWell> {
  return [...state.wells.values()];
}

function getStats(state: GravityWellState): WellStats {
  const byStrength: Record<WellStrength, number> = {
    NEGLIGIBLE: 0,
    WEAK: 0,
    MODERATE: 0,
    STRONG: 0,
    EXTREME: 0,
  };
  let totalEscapeVelocity = 0;
  for (const well of state.wells.values()) {
    byStrength[well.strength]++;
    totalEscapeVelocity += well.escapeVelocityKms;
  }
  const totalWells = state.wells.size;
  return {
    totalWells,
    byStrength,
    avgEscapeVelocity: totalWells > 0 ? totalEscapeVelocity / totalWells : 0,
  };
}

// ── Factory ──────────────────────────────────────────────────────

export function createGravityWellSystem(deps: {
  clock: GravityClockPort;
  idGen: GravityIdGeneratorPort;
  logger: GravityLoggerPort;
}): GravityWellSystem {
  const state: GravityWellState = {
    worlds: new Set(),
    wells: new Map(),
    worldToWell: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    registerWorld: (worldId) => registerWorld(state, worldId),
    createWell: (worldId, massKg, radiusKm) => createWell(state, worldId, massKg, radiusKm),
    calculateTransitCost: (fromWorldId, toWorldId, baseCostKalon) =>
      calculateTransitCost(state, fromWorldId, toWorldId, baseCostKalon),
    getWellForWorld: (worldId) => getWellForWorld(state, worldId),
    getWell: (wellId) => getWell(state, wellId),
    listWells: () => listWells(state),
    getStats: () => getStats(state),
  };
}
