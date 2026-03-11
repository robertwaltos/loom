/**
 * Transit Capacity Management — Corridor throughput and congestion
 * Tracks active transits, detects congestion, throttles when over capacity
 */

// ============================================================================
// Ports (Duplicated)
// ============================================================================

interface CapacityClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface CapacityLoggerPort {
  readonly info: (message: string, context: Record<string, unknown>) => void;
  readonly warn: (message: string, context: Record<string, unknown>) => void;
  readonly error: (message: string, context: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

export type CongestionLevel = 'CLEAR' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'BLOCKED';

export interface CorridorCapacity {
  readonly corridorId: string;
  readonly maxEntitiesPerHour: number;
  readonly windowMicros: bigint;
}

export interface TransitLoad {
  readonly corridorId: string;
  readonly activeTransits: number;
  readonly utilizationPercent: number;
}

export interface CapacityReport {
  readonly corridorId: string;
  readonly maxEntitiesPerHour: number;
  readonly currentLoad: number;
  readonly availableCapacity: number;
  readonly congestionLevel: CongestionLevel;
  readonly windowStartMicros: bigint;
  readonly windowEndMicros: bigint;
}

interface TransitRecord {
  readonly entityId: string;
  readonly timestampMicros: bigint;
}

// ============================================================================
// State
// ============================================================================

interface TransitCapacityState {
  readonly capacities: Map<string, CorridorCapacity>;
  readonly transits: Map<string, Array<TransitRecord>>;
}

// ============================================================================
// Dependencies
// ============================================================================

export interface TransitCapacityDeps {
  readonly clock: CapacityClockPort;
  readonly logger: CapacityLoggerPort;
}

// ============================================================================
// Module Interface
// ============================================================================

export interface TransitCapacityModule {
  readonly setCapacity: (
    corridorId: string,
    maxEntitiesPerHour: number,
    windowMicros: bigint,
  ) => void;
  readonly recordTransit: (corridorId: string, entityId: string) => RecordTransitResult;
  readonly getCongestionLevel: (corridorId: string) => GetCongestionResult;
  readonly getAvailableCapacity: (corridorId: string) => GetCapacityResult;
  readonly getCapacityReport: (corridorId: string) => GetReportResult;
  readonly pruneOldTransits: (corridorId: string) => number;
}

export type RecordTransitResult =
  | { readonly success: true; readonly currentLoad: number }
  | { readonly success: false; readonly error: string };
export type GetCongestionResult =
  | { readonly found: true; readonly level: CongestionLevel }
  | { readonly found: false; readonly error: string };
export type GetCapacityResult =
  | { readonly found: true; readonly available: number }
  | { readonly found: false; readonly error: string };
export type GetReportResult =
  | { readonly found: true; readonly report: CapacityReport }
  | { readonly found: false; readonly error: string };

// ============================================================================
// Factory
// ============================================================================

export function createTransitCapacityModule(deps: TransitCapacityDeps): TransitCapacityModule {
  const state: TransitCapacityState = {
    capacities: new Map(),
    transits: new Map(),
  };

  return {
    setCapacity: (corridorId, maxEntitiesPerHour, windowMicros) =>
      setCapacity(state, corridorId, maxEntitiesPerHour, windowMicros),
    recordTransit: (corridorId, entityId) => recordTransit(state, deps, corridorId, entityId),
    getCongestionLevel: (corridorId) => getCongestionLevel(state, deps, corridorId),
    getAvailableCapacity: (corridorId) => getAvailableCapacity(state, deps, corridorId),
    getCapacityReport: (corridorId) => getCapacityReport(state, deps, corridorId),
    pruneOldTransits: (corridorId) => pruneOldTransits(state, deps, corridorId),
  };
}

// ============================================================================
// Functions
// ============================================================================

function setCapacity(
  state: TransitCapacityState,
  corridorId: string,
  maxEntitiesPerHour: number,
  windowMicros: bigint,
): void {
  const capacity: CorridorCapacity = {
    corridorId,
    maxEntitiesPerHour,
    windowMicros,
  };
  state.capacities.set(corridorId, capacity);
  const existing = state.transits.get(corridorId);
  if (existing === undefined) {
    state.transits.set(corridorId, []);
  }
}

function recordTransit(
  state: TransitCapacityState,
  deps: TransitCapacityDeps,
  corridorId: string,
  entityId: string,
): RecordTransitResult {
  const capacity = state.capacities.get(corridorId);
  if (capacity === undefined) {
    return { success: false, error: 'Corridor capacity not configured' };
  }

  pruneOldTransits(state, deps, corridorId);

  const nowMicros = deps.clock.nowMicroseconds();
  const record: TransitRecord = {
    entityId,
    timestampMicros: nowMicros,
  };

  const transits = state.transits.get(corridorId);
  if (transits === undefined) {
    state.transits.set(corridorId, [record]);
    deps.logger.info('Transit recorded', { corridorId, entityId, currentLoad: 1 });
    return { success: true, currentLoad: 1 };
  }

  transits.push(record);
  deps.logger.info('Transit recorded', { corridorId, entityId, currentLoad: transits.length });
  return { success: true, currentLoad: transits.length };
}

function getCongestionLevel(
  state: TransitCapacityState,
  deps: TransitCapacityDeps,
  corridorId: string,
): GetCongestionResult {
  const capacity = state.capacities.get(corridorId);
  if (capacity === undefined) {
    return { found: false, error: 'Corridor not found' };
  }

  pruneOldTransits(state, deps, corridorId);

  const transits = state.transits.get(corridorId);
  if (transits === undefined) {
    return { found: true, level: 'CLEAR' };
  }

  const utilizationPercent = (transits.length / capacity.maxEntitiesPerHour) * 100;
  const level = calculateCongestionLevel(utilizationPercent);
  return { found: true, level };
}

function calculateCongestionLevel(utilizationPercent: number): CongestionLevel {
  if (utilizationPercent >= 100) {
    return 'BLOCKED';
  }
  if (utilizationPercent >= 75) {
    return 'HEAVY';
  }
  if (utilizationPercent >= 50) {
    return 'MODERATE';
  }
  if (utilizationPercent >= 25) {
    return 'LIGHT';
  }
  return 'CLEAR';
}

function getAvailableCapacity(
  state: TransitCapacityState,
  deps: TransitCapacityDeps,
  corridorId: string,
): GetCapacityResult {
  const capacity = state.capacities.get(corridorId);
  if (capacity === undefined) {
    return { found: false, error: 'Corridor not found' };
  }

  pruneOldTransits(state, deps, corridorId);

  const transits = state.transits.get(corridorId);
  const currentLoad = transits === undefined ? 0 : transits.length;
  const available = Math.max(0, capacity.maxEntitiesPerHour - currentLoad);
  return { found: true, available };
}

function getCapacityReport(
  state: TransitCapacityState,
  deps: TransitCapacityDeps,
  corridorId: string,
): GetReportResult {
  const capacity = state.capacities.get(corridorId);
  if (capacity === undefined) {
    return { found: false, error: 'Corridor not found' };
  }

  pruneOldTransits(state, deps, corridorId);

  const transits = state.transits.get(corridorId);
  const currentLoad = transits === undefined ? 0 : transits.length;
  const available = Math.max(0, capacity.maxEntitiesPerHour - currentLoad);
  const utilizationPercent = (currentLoad / capacity.maxEntitiesPerHour) * 100;
  const congestionLevel = calculateCongestionLevel(utilizationPercent);
  const nowMicros = deps.clock.nowMicroseconds();
  const windowStartMicros = nowMicros - capacity.windowMicros;

  const report: CapacityReport = {
    corridorId,
    maxEntitiesPerHour: capacity.maxEntitiesPerHour,
    currentLoad,
    availableCapacity: available,
    congestionLevel,
    windowStartMicros,
    windowEndMicros: nowMicros,
  };

  return { found: true, report };
}

function pruneOldTransits(
  state: TransitCapacityState,
  deps: TransitCapacityDeps,
  corridorId: string,
): number {
  const capacity = state.capacities.get(corridorId);
  if (capacity === undefined) {
    return 0;
  }

  const transits = state.transits.get(corridorId);
  if (transits === undefined) {
    return 0;
  }

  const nowMicros = deps.clock.nowMicroseconds();
  const cutoffMicros = nowMicros - capacity.windowMicros;
  const initialCount = transits.length;
  const filtered = transits.filter((t) => t.timestampMicros > cutoffMicros);
  state.transits.set(corridorId, filtered);
  const prunedCount = initialCount - filtered.length;

  if (prunedCount > 0) {
    deps.logger.info('Pruned old transits', {
      corridorId,
      prunedCount,
      remaining: filtered.length,
    });
  }

  return prunedCount;
}
