/**
 * corridor-stability.ts — Corridor stability monitoring and maintenance.
 *
 * Tracks the structural integrity of active Silfen Weave corridors.
 * Corridors degrade over time and usage, requiring periodic
 * stabilization. Unstable corridors have higher transit failure
 * rates and may collapse entirely.
 */

// ── Types ────────────────────────────────────────────────────────

export type StabilityGrade = 'pristine' | 'stable' | 'degraded' | 'critical' | 'collapsed';

export interface CorridorStabilityRecord {
  readonly corridorId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly stability: number;
  readonly grade: StabilityGrade;
  readonly lastStabilizedAt: number;
  readonly totalTransits: number;
  readonly degradationRate: number;
  readonly createdAt: number;
}

export interface StabilizationResult {
  readonly corridorId: string;
  readonly previousStability: number;
  readonly newStability: number;
  readonly previousGrade: StabilityGrade;
  readonly newGrade: StabilityGrade;
  readonly costKalon: bigint;
}

export interface DegradationEvent {
  readonly corridorId: string;
  readonly previousStability: number;
  readonly newStability: number;
  readonly cause: DegradationCause;
  readonly timestamp: number;
}

export type DegradationCause = 'transit_wear' | 'time_decay' | 'anomaly' | 'overload' | 'external';

export interface StabilityConfig {
  readonly degradationPerTransit: number;
  readonly timeDecayPerHour: number;
  readonly stabilizationBoost: number;
  readonly criticalThreshold: number;
  readonly collapseThreshold: number;
  readonly maxStability: number;
  readonly baseCostPerPoint: bigint;
}

export interface CorridorStabilityStats {
  readonly totalCorridors: number;
  readonly pristineCount: number;
  readonly stableCount: number;
  readonly degradedCount: number;
  readonly criticalCount: number;
  readonly collapsedCount: number;
  readonly averageStability: number;
}

// ── Port Interfaces ──────────────────────────────────────────────

export interface StabilityClock {
  readonly nowMicroseconds: () => number;
}

export interface StabilityKalonPort {
  readonly debit: (dynastyId: string, amount: bigint) => boolean;
}

// ── Deps ─────────────────────────────────────────────────────────

export interface CorridorStabilityDeps {
  readonly clock: StabilityClock;
  readonly kalon: StabilityKalonPort;
  readonly config?: Partial<StabilityConfig>;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_CONFIG: StabilityConfig = {
  degradationPerTransit: 0.5,
  timeDecayPerHour: 0.01,
  stabilizationBoost: 25.0,
  criticalThreshold: 20.0,
  collapseThreshold: 5.0,
  maxStability: 100.0,
  baseCostPerPoint: 50n,
};

export { DEFAULT_CONFIG as DEFAULT_STABILITY_CONFIG };

// ── State ────────────────────────────────────────────────────────

interface StabilityState {
  readonly deps: CorridorStabilityDeps;
  readonly config: StabilityConfig;
  readonly corridors: Map<string, MutableStabilityRecord>;
  readonly events: DegradationEvent[];
}

interface MutableStabilityRecord {
  readonly corridorId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  stability: number;
  lastStabilizedAt: number;
  totalTransits: number;
  degradationRate: number;
  readonly createdAt: number;
}

// ── Grade Classification ─────────────────────────────────────────

function classifyGrade(stability: number, config: StabilityConfig): StabilityGrade {
  if (stability <= config.collapseThreshold) return 'collapsed';
  if (stability <= config.criticalThreshold) return 'critical';
  if (stability <= 50) return 'degraded';
  if (stability <= 80) return 'stable';
  return 'pristine';
}

// ── Corridor Registration ────────────────────────────────────────

function registerCorridor(
  state: StabilityState,
  corridorId: string,
  fromWorldId: string,
  toWorldId: string,
): CorridorStabilityRecord {
  const now = state.deps.clock.nowMicroseconds();
  const record: MutableStabilityRecord = {
    corridorId,
    fromWorldId,
    toWorldId,
    stability: state.config.maxStability,
    lastStabilizedAt: now,
    totalTransits: 0,
    degradationRate: state.config.degradationPerTransit,
    createdAt: now,
  };
  state.corridors.set(corridorId, record);
  return toReadonly(record, state.config);
}

function removeCorridor(state: StabilityState, corridorId: string): boolean {
  return state.corridors.delete(corridorId);
}

// ── Transit Degradation ──────────────────────────────────────────

function recordTransit(state: StabilityState, corridorId: string): DegradationEvent | null {
  const record = state.corridors.get(corridorId);
  if (record === undefined) return null;
  const previous = record.stability;
  record.totalTransits += 1;
  record.stability = Math.max(0, record.stability - record.degradationRate);
  const event: DegradationEvent = {
    corridorId,
    previousStability: previous,
    newStability: record.stability,
    cause: 'transit_wear',
    timestamp: state.deps.clock.nowMicroseconds(),
  };
  state.events.push(event);
  return event;
}

// ── Time Decay ───────────────────────────────────────────────────

function applyTimeDecay(state: StabilityState): readonly DegradationEvent[] {
  const now = state.deps.clock.nowMicroseconds();
  const events: DegradationEvent[] = [];
  for (const record of state.corridors.values()) {
    const elapsed = now - record.lastStabilizedAt;
    const hours = elapsed / 3_600_000_000;
    if (hours < 1) continue;
    const decay = hours * state.config.timeDecayPerHour;
    const previous = record.stability;
    record.stability = Math.max(0, record.stability - decay);
    const event: DegradationEvent = {
      corridorId: record.corridorId,
      previousStability: previous,
      newStability: record.stability,
      cause: 'time_decay',
      timestamp: now,
    };
    events.push(event);
    state.events.push(event);
  }
  return events;
}

// ── Stabilization ────────────────────────────────────────────────

function stabilize(
  state: StabilityState,
  corridorId: string,
  dynastyId: string,
): StabilizationResult | string {
  const record = state.corridors.get(corridorId);
  if (record === undefined) return 'corridor_not_found';
  const grade = classifyGrade(record.stability, state.config);
  if (grade === 'collapsed') return 'corridor_collapsed';
  const deficit = state.config.maxStability - record.stability;
  const boost = Math.min(state.config.stabilizationBoost, deficit);
  const cost = state.config.baseCostPerPoint * BigInt(Math.ceil(boost));
  if (!state.deps.kalon.debit(dynastyId, cost)) return 'insufficient_kalon';
  return applyStabilization(state, record, boost, cost);
}

function applyStabilization(
  state: StabilityState,
  record: MutableStabilityRecord,
  boost: number,
  cost: bigint,
): StabilizationResult {
  const previousStability = record.stability;
  const previousGrade = classifyGrade(record.stability, state.config);
  record.stability = Math.min(state.config.maxStability, record.stability + boost);
  record.lastStabilizedAt = state.deps.clock.nowMicroseconds();
  return {
    corridorId: record.corridorId,
    previousStability,
    newStability: record.stability,
    previousGrade,
    newGrade: classifyGrade(record.stability, state.config),
    costKalon: cost,
  };
}

// ── External Degradation ─────────────────────────────────────────

function applyDegradation(
  state: StabilityState,
  corridorId: string,
  amount: number,
  cause: DegradationCause,
): DegradationEvent | null {
  const record = state.corridors.get(corridorId);
  if (record === undefined) return null;
  const previous = record.stability;
  record.stability = Math.max(0, record.stability - amount);
  const event: DegradationEvent = {
    corridorId,
    previousStability: previous,
    newStability: record.stability,
    cause,
    timestamp: state.deps.clock.nowMicroseconds(),
  };
  state.events.push(event);
  return event;
}

// ── Queries ──────────────────────────────────────────────────────

function getCorridor(
  state: StabilityState,
  corridorId: string,
): CorridorStabilityRecord | undefined {
  const record = state.corridors.get(corridorId);
  if (record === undefined) return undefined;
  return toReadonly(record, state.config);
}

function getCorridorsByGrade(
  state: StabilityState,
  grade: StabilityGrade,
): readonly CorridorStabilityRecord[] {
  const result: CorridorStabilityRecord[] = [];
  for (const record of state.corridors.values()) {
    if (classifyGrade(record.stability, state.config) === grade) {
      result.push(toReadonly(record, state.config));
    }
  }
  return result;
}

function getCriticalCorridors(state: StabilityState): readonly CorridorStabilityRecord[] {
  const result: CorridorStabilityRecord[] = [];
  for (const record of state.corridors.values()) {
    const grade = classifyGrade(record.stability, state.config);
    if (grade === 'critical' || grade === 'collapsed') {
      result.push(toReadonly(record, state.config));
    }
  }
  return result;
}

function getRecentEvents(state: StabilityState, count: number): readonly DegradationEvent[] {
  const start = Math.max(0, state.events.length - count);
  return state.events.slice(start);
}

function getStats(state: StabilityState): CorridorStabilityStats {
  let pristine = 0;
  let stable = 0;
  let degraded = 0;
  let critical = 0;
  let collapsed = 0;
  let totalStability = 0;
  for (const record of state.corridors.values()) {
    totalStability += record.stability;
    const grade = classifyGrade(record.stability, state.config);
    if (grade === 'pristine') pristine += 1;
    else if (grade === 'stable') stable += 1;
    else if (grade === 'degraded') degraded += 1;
    else if (grade === 'critical') critical += 1;
    else collapsed += 1;
  }
  const total = state.corridors.size;
  return {
    totalCorridors: total,
    pristineCount: pristine,
    stableCount: stable,
    degradedCount: degraded,
    criticalCount: critical,
    collapsedCount: collapsed,
    averageStability: total > 0 ? totalStability / total : 0,
  };
}

function toReadonly(
  record: MutableStabilityRecord,
  config: StabilityConfig,
): CorridorStabilityRecord {
  return {
    corridorId: record.corridorId,
    fromWorldId: record.fromWorldId,
    toWorldId: record.toWorldId,
    stability: record.stability,
    grade: classifyGrade(record.stability, config),
    lastStabilizedAt: record.lastStabilizedAt,
    totalTransits: record.totalTransits,
    degradationRate: record.degradationRate,
    createdAt: record.createdAt,
  };
}

// ── Public API ──────────────────────────────────────────────────

export interface CorridorStabilityService {
  readonly registerCorridor: (
    corridorId: string,
    fromWorldId: string,
    toWorldId: string,
  ) => CorridorStabilityRecord;
  readonly removeCorridor: (corridorId: string) => boolean;
  readonly recordTransit: (corridorId: string) => DegradationEvent | null;
  readonly applyTimeDecay: () => readonly DegradationEvent[];
  readonly stabilize: (corridorId: string, dynastyId: string) => StabilizationResult | string;
  readonly applyDegradation: (
    corridorId: string,
    amount: number,
    cause: DegradationCause,
  ) => DegradationEvent | null;
  readonly getCorridor: (corridorId: string) => CorridorStabilityRecord | undefined;
  readonly getCorridorsByGrade: (grade: StabilityGrade) => readonly CorridorStabilityRecord[];
  readonly getCriticalCorridors: () => readonly CorridorStabilityRecord[];
  readonly getRecentEvents: (count: number) => readonly DegradationEvent[];
  readonly getStats: () => CorridorStabilityStats;
}

// ── Factory ─────────────────────────────────────────────────────

function createCorridorStabilityService(deps: CorridorStabilityDeps): CorridorStabilityService {
  const config: StabilityConfig = { ...DEFAULT_CONFIG, ...deps.config };
  const state: StabilityState = {
    deps,
    config,
    corridors: new Map(),
    events: [],
  };

  return {
    registerCorridor: (id, from, to) => registerCorridor(state, id, from, to),
    removeCorridor: (id) => removeCorridor(state, id),
    recordTransit: (id) => recordTransit(state, id),
    applyTimeDecay: () => applyTimeDecay(state),
    stabilize: (id, dynastyId) => stabilize(state, id, dynastyId),
    applyDegradation: (id, amount, cause) => applyDegradation(state, id, amount, cause),
    getCorridor: (id) => getCorridor(state, id),
    getCorridorsByGrade: (grade) => getCorridorsByGrade(state, grade),
    getCriticalCorridors: () => getCriticalCorridors(state),
    getRecentEvents: (count) => getRecentEvents(state, count),
    getStats: () => getStats(state),
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createCorridorStabilityService };
