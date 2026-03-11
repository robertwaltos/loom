/**
 * Wormhole Stabilizer
 *
 * Manages wormhole creation, stability tracking, energy injection, and collapse prediction.
 * Wormholes are unstable transit points requiring active stabilization energy.
 */

// Ports
export interface Clock {
  now(): bigint;
}

export interface IdGenerator {
  generate(): string;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// Types
export type StabilityLevel = 'STABLE' | 'DEGRADING' | 'UNSTABLE' | 'CRITICAL' | 'COLLAPSED';

export interface Wormhole {
  readonly id: string;
  readonly originWorldId: string;
  readonly destinationWorldId: string;
  readonly createdAt: bigint;
  stability: bigint; // 0-100 scale
  energy: bigint; // Current stabilization energy
  readonly baseDecayRate: bigint; // Energy loss per tick
  collapsedAt?: bigint;
}

export interface StabilizationEvent {
  readonly wormholeId: string;
  readonly timestamp: bigint;
  readonly energyInjected: bigint;
  readonly stabilityBefore: bigint;
  readonly stabilityAfter: bigint;
}

export interface CollapseRecord {
  readonly wormholeId: string;
  readonly collapsedAt: bigint;
  readonly finalStability: bigint;
  readonly totalEnergySpent: bigint;
  readonly lifespan: bigint;
}

export interface EnergyReport {
  readonly wormholeId: string;
  readonly currentEnergy: bigint;
  readonly energyDrained: bigint;
  readonly stability: bigint;
  readonly level: StabilityLevel;
  readonly timeToCollapse: bigint | 'COLLAPSED' | 'STABLE';
}

export interface WormholeState {
  readonly wormholes: Map<string, Wormhole>;
  readonly events: StabilizationEvent[];
  readonly collapses: CollapseRecord[];
  totalEnergySpent: bigint;
  decayMultiplier: bigint; // 100 = 1.0x, 150 = 1.5x
}

// Error types
export type WormholeError =
  | 'wormhole-not-found'
  | 'wormhole-collapsed'
  | 'invalid-energy'
  | 'invalid-stability'
  | 'already-exists'
  | 'invalid-decay-rate';

// Factory
export function createWormholeState(): WormholeState {
  return {
    wormholes: new Map(),
    events: [],
    collapses: [],
    totalEnergySpent: 0n,
    decayMultiplier: 100n,
  };
}

// Core Functions

export function createWormhole(
  state: WormholeState,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
  originWorldId: string,
  destinationWorldId: string,
  initialEnergy: bigint,
  baseDecayRate: bigint,
): string | WormholeError {
  if (initialEnergy <= 0n) {
    logger.error('Invalid initial energy for wormhole creation');
    return 'invalid-energy';
  }

  if (baseDecayRate <= 0n) {
    logger.error('Invalid decay rate for wormhole creation');
    return 'invalid-decay-rate';
  }

  const id = idGen.generate();
  const now = clock.now();

  const wormhole: Wormhole = {
    id,
    originWorldId,
    destinationWorldId,
    createdAt: now,
    stability: 100n,
    energy: initialEnergy,
    baseDecayRate,
  };

  state.wormholes.set(id, wormhole);
  logger.info('Created wormhole: ' + id);

  return id;
}

export function injectEnergy(
  state: WormholeState,
  clock: Clock,
  logger: Logger,
  wormholeId: string,
  energyAmount: bigint,
): 'success' | WormholeError {
  if (energyAmount <= 0n) {
    logger.error('Invalid energy amount for injection');
    return 'invalid-energy';
  }

  const wormhole = state.wormholes.get(wormholeId);
  if (wormhole === undefined) {
    logger.error('Wormhole not found: ' + wormholeId);
    return 'wormhole-not-found';
  }

  if (wormhole.collapsedAt !== undefined) {
    logger.error('Cannot inject energy into collapsed wormhole');
    return 'wormhole-collapsed';
  }

  const stabilityBefore = wormhole.stability;
  wormhole.energy = wormhole.energy + energyAmount;

  const stabilityGain = calculateStabilityGain(energyAmount);
  const newStability = wormhole.stability + stabilityGain;
  wormhole.stability = newStability > 100n ? 100n : newStability;

  const event: StabilizationEvent = {
    wormholeId,
    timestamp: clock.now(),
    energyInjected: energyAmount,
    stabilityBefore,
    stabilityAfter: wormhole.stability,
  };

  state.events.push(event);
  state.totalEnergySpent = state.totalEnergySpent + energyAmount;

  logger.info('Injected energy into wormhole: ' + wormholeId);
  return 'success';
}

function calculateStabilityGain(energy: bigint): bigint {
  // 1000 energy = 1 stability point
  return energy / 1000n;
}

export function degradeStability(
  state: WormholeState,
  clock: Clock,
  logger: Logger,
  wormholeId: string,
): 'success' | WormholeError {
  const wormhole = state.wormholes.get(wormholeId);
  if (wormhole === undefined) {
    return 'wormhole-not-found';
  }

  if (wormhole.collapsedAt !== undefined) {
    return 'wormhole-collapsed';
  }

  const decayAmount = calculateDecay(wormhole.baseDecayRate, state.decayMultiplier);

  const newEnergy = wormhole.energy - decayAmount;
  wormhole.energy = newEnergy < 0n ? 0n : newEnergy;

  const stabilityLoss = calculateStabilityLoss(wormhole.energy);
  const newStability = wormhole.stability - stabilityLoss;
  wormhole.stability = newStability < 0n ? 0n : newStability;

  if (wormhole.stability === 0n) {
    wormhole.collapsedAt = clock.now();
    recordCollapse(state, clock, wormhole);
    logger.warn('Wormhole collapsed: ' + wormholeId);
  }

  return 'success';
}

function calculateDecay(base: bigint, multiplier: bigint): bigint {
  return (base * multiplier) / 100n;
}

function calculateStabilityLoss(currentEnergy: bigint): bigint {
  if (currentEnergy >= 10000n) return 0n;
  if (currentEnergy >= 5000n) return 1n;
  if (currentEnergy >= 2000n) return 2n;
  if (currentEnergy >= 500n) return 5n;
  return 10n;
}

function recordCollapse(state: WormholeState, clock: Clock, wormhole: Wormhole): void {
  const now = clock.now();
  const lifespan = now - wormhole.createdAt;

  const totalSpent = calculateTotalEnergyForWormhole(state.events, wormhole.id);

  const record: CollapseRecord = {
    wormholeId: wormhole.id,
    collapsedAt: now,
    finalStability: wormhole.stability,
    totalEnergySpent: totalSpent,
    lifespan,
  };

  state.collapses.push(record);
}

function calculateTotalEnergyForWormhole(events: StabilizationEvent[], wormholeId: string): bigint {
  let total = 0n;

  for (let i = 0; i < events.length; i = i + 1) {
    const event = events[i];
    if (event === undefined) continue;
    if (event.wormholeId === wormholeId) {
      total = total + event.energyInjected;
    }
  }

  return total;
}

export function checkCollapse(state: WormholeState, wormholeId: string): boolean | WormholeError {
  const wormhole = state.wormholes.get(wormholeId);
  if (wormhole === undefined) {
    return 'wormhole-not-found';
  }

  return wormhole.collapsedAt !== undefined;
}

export function getStabilityLevel(stability: bigint): StabilityLevel {
  if (stability === 0n) return 'COLLAPSED';
  if (stability < 20n) return 'CRITICAL';
  if (stability < 40n) return 'UNSTABLE';
  if (stability < 70n) return 'DEGRADING';
  return 'STABLE';
}

export function getStabilityReport(
  state: WormholeState,
  wormholeId: string,
): EnergyReport | WormholeError {
  const wormhole = state.wormholes.get(wormholeId);
  if (wormhole === undefined) {
    return 'wormhole-not-found';
  }

  const level = getStabilityLevel(wormhole.stability);
  const decayRate = calculateDecay(wormhole.baseDecayRate, state.decayMultiplier);

  let timeToCollapse: bigint | 'COLLAPSED' | 'STABLE';

  if (wormhole.collapsedAt !== undefined) {
    timeToCollapse = 'COLLAPSED';
  } else if (wormhole.stability >= 70n && wormhole.energy >= 10000n) {
    timeToCollapse = 'STABLE';
  } else {
    timeToCollapse = estimateTimeToCollapse(wormhole.energy, wormhole.stability, decayRate);
  }

  return {
    wormholeId,
    currentEnergy: wormhole.energy,
    energyDrained: decayRate,
    stability: wormhole.stability,
    level,
    timeToCollapse,
  };
}

function estimateTimeToCollapse(energy: bigint, stability: bigint, decayRate: bigint): bigint {
  if (decayRate === 0n) return 999999999n;

  const energyTicks = energy / decayRate;
  const stabilityTicks = stability * 2n;

  return energyTicks < stabilityTicks ? energyTicks : stabilityTicks;
}

export function getCollapseHistory(state: WormholeState): readonly CollapseRecord[] {
  return [...state.collapses];
}

export function getCollapseHistoryForWorld(
  state: WormholeState,
  worldId: string,
): readonly CollapseRecord[] {
  const results: CollapseRecord[] = [];

  for (let i = 0; i < state.collapses.length; i = i + 1) {
    const record = state.collapses[i];
    if (record === undefined) continue;

    const wormhole = state.wormholes.get(record.wormholeId);
    if (wormhole === undefined) continue;

    if (wormhole.originWorldId === worldId || wormhole.destinationWorldId === worldId) {
      results.push(record);
    }
  }

  return results;
}

export function setDecayRate(
  state: WormholeState,
  logger: Logger,
  multiplier: bigint,
): 'success' | WormholeError {
  if (multiplier <= 0n) {
    logger.error('Invalid decay multiplier');
    return 'invalid-decay-rate';
  }

  state.decayMultiplier = multiplier;
  logger.info('Set decay multiplier to: ' + String(multiplier));
  return 'success';
}

export function getAllWormholes(state: WormholeState): readonly Wormhole[] {
  return Array.from(state.wormholes.values());
}

export function getActiveWormholes(state: WormholeState): readonly Wormhole[] {
  const results: Wormhole[] = [];
  const all = state.wormholes.values();

  for (const wormhole of all) {
    if (wormhole.collapsedAt === undefined) {
      results.push(wormhole);
    }
  }

  return results;
}

export function getCriticalWormholes(state: WormholeState): readonly Wormhole[] {
  const results: Wormhole[] = [];
  const all = state.wormholes.values();

  for (const wormhole of all) {
    if (wormhole.collapsedAt === undefined && wormhole.stability < 20n) {
      results.push(wormhole);
    }
  }

  return results;
}

export function getStabilizationEvents(
  state: WormholeState,
  wormholeId: string,
): readonly StabilizationEvent[] {
  const results: StabilizationEvent[] = [];

  for (let i = 0; i < state.events.length; i = i + 1) {
    const event = state.events[i];
    if (event === undefined) continue;
    if (event.wormholeId === wormholeId) {
      results.push(event);
    }
  }

  return results;
}

export function getTotalEnergySpent(state: WormholeState): bigint {
  return state.totalEnergySpent;
}

export function getWormholeCount(state: WormholeState): number {
  return state.wormholes.size;
}

export function getCollapseCount(state: WormholeState): number {
  return state.collapses.length;
}

export function getWormhole(state: WormholeState, wormholeId: string): Wormhole | WormholeError {
  const wormhole = state.wormholes.get(wormholeId);
  if (wormhole === undefined) {
    return 'wormhole-not-found';
  }
  return wormhole;
}

export function emergencyStabilization(
  state: WormholeState,
  clock: Clock,
  logger: Logger,
  wormholeId: string,
): 'success' | WormholeError {
  const wormhole = state.wormholes.get(wormholeId);
  if (wormhole === undefined) {
    return 'wormhole-not-found';
  }

  if (wormhole.collapsedAt !== undefined) {
    return 'wormhole-collapsed';
  }

  const emergencyEnergy = 50000n;
  const result = injectEnergy(state, clock, logger, wormholeId, emergencyEnergy);

  if (result === 'success') {
    logger.warn('Emergency stabilization: ' + wormholeId);
  }

  return result;
}

export function batchDegrade(state: WormholeState, clock: Clock, logger: Logger): number {
  let degraded = 0;
  const all = state.wormholes.values();

  for (const wormhole of all) {
    if (wormhole.collapsedAt === undefined) {
      degradeStability(state, clock, logger, wormhole.id);
      degraded = degraded + 1;
    }
  }

  return degraded;
}

export function getWormholesForWorld(state: WormholeState, worldId: string): readonly Wormhole[] {
  const results: Wormhole[] = [];
  const all = state.wormholes.values();

  for (const wormhole of all) {
    if (wormhole.originWorldId === worldId || wormhole.destinationWorldId === worldId) {
      results.push(wormhole);
    }
  }

  return results;
}

export function getAverageStability(state: WormholeState): bigint {
  const active = getActiveWormholes(state);
  if (active.length === 0) return 0n;

  let total = 0n;
  for (let i = 0; i < active.length; i = i + 1) {
    const wormhole = active[i];
    if (wormhole === undefined) continue;
    total = total + wormhole.stability;
  }

  return total / BigInt(active.length);
}
