/**
 * Terrain Erosion — loom-core fabric
 * Tracks terrain cell degradation from weather, entity traffic, and time.
 * Restoration mechanics for terrain quality recovery.
 */

// Port interfaces (duplicated, never imported from other fabrics)
interface ErosionClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface ErosionLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// Core types
export type TerrainQuality = 'PRISTINE' | 'WORN' | 'DEGRADED' | 'DAMAGED' | 'DESTROYED';

export type ErosionFactorType = 'WEATHER' | 'TRAFFIC' | 'TIME';

export interface ErosionFactor {
  readonly type: ErosionFactorType;
  readonly intensity: number;
}

export interface TerrainCell {
  readonly cellId: string;
  readonly worldId: string;
  quality: TerrainQuality;
  erosionScore: number;
  lastUpdateMicros: bigint;
}

export interface ErosionRecord {
  readonly cellId: string;
  readonly timestampMicros: bigint;
  readonly factor: ErosionFactor;
  readonly qualityBefore: TerrainQuality;
  readonly qualityAfter: TerrainQuality;
  readonly scoreChange: number;
}

export interface RestorationEvent {
  readonly cellId: string;
  readonly scheduledAtMicros: bigint;
  readonly completesAtMicros: bigint;
  readonly targetQuality: TerrainQuality;
}

export interface ErosionReport {
  readonly cellId: string;
  readonly currentQuality: TerrainQuality;
  readonly erosionScore: number;
  readonly history: readonly ErosionRecord[];
  readonly pendingRestoration: RestorationEvent | null;
}

// State
interface TerrainErosionState {
  readonly cells: Map<string, TerrainCell>;
  readonly erosionHistory: Map<string, ErosionRecord[]>;
  readonly restorationQueue: RestorationEvent[];
}

// Dependencies
export interface TerrainErosionDeps {
  readonly clock: ErosionClockPort;
  readonly logger: ErosionLoggerPort;
}

// Public API
export interface TerrainErosion {
  readonly registerCell: (cellId: string, worldId: string) => string | 'OK';
  readonly applyErosion: (cellId: string, factor: ErosionFactor) => string | 'OK';
  readonly recordTraffic: (cellId: string, trafficIntensity: number) => string | 'OK';
  readonly getTerrainQuality: (cellId: string) => string | TerrainQuality;
  readonly scheduleRestoration: (
    cellId: string,
    targetQuality: TerrainQuality,
    durationMicros: bigint,
  ) => string | 'OK';
  readonly processRestorations: () => number;
  readonly getErosionReport: (cellId: string) => string | ErosionReport;
  readonly getAllCells: () => readonly TerrainCell[];
}

// Factory
export function createTerrainErosion(deps: TerrainErosionDeps): TerrainErosion {
  const state: TerrainErosionState = {
    cells: new Map(),
    erosionHistory: new Map(),
    restorationQueue: [],
  };

  return {
    registerCell: (cellId, worldId) => registerCell(state, deps, cellId, worldId),
    applyErosion: (cellId, factor) => applyErosion(state, deps, cellId, factor),
    recordTraffic: (cellId, intensity) => recordTraffic(state, deps, cellId, intensity),
    getTerrainQuality: (cellId) => getTerrainQuality(state, cellId),
    scheduleRestoration: (cellId, targetQuality, durationMicros) =>
      scheduleRestoration(state, deps, cellId, targetQuality, durationMicros),
    processRestorations: () => processRestorations(state, deps),
    getErosionReport: (cellId) => getErosionReport(state, cellId),
    getAllCells: () => getAllCells(state),
  };
}

// Implementation functions
function registerCell(
  state: TerrainErosionState,
  deps: TerrainErosionDeps,
  cellId: string,
  worldId: string,
): string | 'OK' {
  if (state.cells.has(cellId)) {
    return 'CELL_ALREADY_REGISTERED';
  }

  const cell: TerrainCell = {
    cellId,
    worldId,
    quality: 'PRISTINE',
    erosionScore: 0,
    lastUpdateMicros: deps.clock.nowMicroseconds(),
  };

  state.cells.set(cellId, cell);
  state.erosionHistory.set(cellId, []);

  deps.logger.info('terrain_cell_registered', {
    cellId,
    worldId,
  });

  return 'OK';
}

function applyErosion(
  state: TerrainErosionState,
  deps: TerrainErosionDeps,
  cellId: string,
  factor: ErosionFactor,
): string | 'OK' {
  const cell = state.cells.get(cellId);
  if (cell === undefined) {
    return 'CELL_NOT_FOUND';
  }

  if (factor.intensity < 0 || factor.intensity > 1) {
    return 'INVALID_INTENSITY';
  }

  const qualityBefore = cell.quality;
  const scoreBefore = cell.erosionScore;
  const scoreIncrease = calculateErosionIncrease(factor);
  const newScore = Math.min(100, scoreBefore + scoreIncrease);

  cell.erosionScore = newScore;
  cell.quality = qualityFromScore(newScore);
  cell.lastUpdateMicros = deps.clock.nowMicroseconds();

  recordErosionHistory(state, deps, cell, factor, qualityBefore, scoreIncrease);

  return 'OK';
}

function calculateErosionIncrease(factor: ErosionFactor): number {
  const baseRate = getBaseErosionRate(factor.type);
  return baseRate * factor.intensity;
}

function getBaseErosionRate(type: ErosionFactorType): number {
  if (type === 'WEATHER') {
    return 5;
  }
  if (type === 'TRAFFIC') {
    return 10;
  }
  return 2;
}

function qualityFromScore(score: number): TerrainQuality {
  if (score <= 20) {
    return 'PRISTINE';
  }
  if (score <= 40) {
    return 'WORN';
  }
  if (score <= 60) {
    return 'DEGRADED';
  }
  if (score <= 80) {
    return 'DAMAGED';
  }
  return 'DESTROYED';
}

function recordErosionHistory(
  state: TerrainErosionState,
  deps: TerrainErosionDeps,
  cell: TerrainCell,
  factor: ErosionFactor,
  qualityBefore: TerrainQuality,
  scoreChange: number,
): void {
  const record: ErosionRecord = {
    cellId: cell.cellId,
    timestampMicros: deps.clock.nowMicroseconds(),
    factor,
    qualityBefore,
    qualityAfter: cell.quality,
    scoreChange,
  };

  const history = state.erosionHistory.get(cell.cellId);
  if (history !== undefined) {
    history.push(record);
    if (history.length > 100) {
      history.shift();
    }
  }

  if (qualityBefore !== cell.quality) {
    deps.logger.warn('terrain_quality_degraded', {
      cellId: cell.cellId,
      worldId: cell.worldId,
      from: qualityBefore,
      to: cell.quality,
      score: cell.erosionScore,
    });
  }
}

function recordTraffic(
  state: TerrainErosionState,
  deps: TerrainErosionDeps,
  cellId: string,
  trafficIntensity: number,
): string | 'OK' {
  if (trafficIntensity < 0 || trafficIntensity > 1) {
    return 'INVALID_TRAFFIC_INTENSITY';
  }

  const factor: ErosionFactor = {
    type: 'TRAFFIC',
    intensity: trafficIntensity,
  };

  return applyErosion(state, deps, cellId, factor);
}

function getTerrainQuality(state: TerrainErosionState, cellId: string): string | TerrainQuality {
  const cell = state.cells.get(cellId);
  if (cell === undefined) {
    return 'CELL_NOT_FOUND';
  }
  return cell.quality;
}

function scheduleRestoration(
  state: TerrainErosionState,
  deps: TerrainErosionDeps,
  cellId: string,
  targetQuality: TerrainQuality,
  durationMicros: bigint,
): string | 'OK' {
  const cell = state.cells.get(cellId);
  if (cell === undefined) {
    return 'CELL_NOT_FOUND';
  }

  const targetScore = maxScoreForQuality(targetQuality);
  if (targetScore >= cell.erosionScore) {
    return 'TARGET_QUALITY_NOT_BETTER';
  }

  const now = deps.clock.nowMicroseconds();
  const event: RestorationEvent = {
    cellId,
    scheduledAtMicros: now,
    completesAtMicros: now + durationMicros,
    targetQuality,
  };

  state.restorationQueue.push(event);

  deps.logger.info('restoration_scheduled', {
    cellId,
    targetQuality,
    completesAtMicros: String(event.completesAtMicros),
  });

  return 'OK';
}

function maxScoreForQuality(quality: TerrainQuality): number {
  if (quality === 'PRISTINE') {
    return 20;
  }
  if (quality === 'WORN') {
    return 40;
  }
  if (quality === 'DEGRADED') {
    return 60;
  }
  if (quality === 'DAMAGED') {
    return 80;
  }
  return 100;
}

function processRestorations(state: TerrainErosionState, deps: TerrainErosionDeps): number {
  const now = deps.clock.nowMicroseconds();
  let processedCount = 0;

  const remaining: RestorationEvent[] = [];

  for (const event of state.restorationQueue) {
    if (event.completesAtMicros <= now) {
      const completed = completeRestoration(state, deps, event);
      if (completed) {
        processedCount = processedCount + 1;
      }
    } else {
      remaining.push(event);
    }
  }

  state.restorationQueue.length = 0;
  state.restorationQueue.push(...remaining);

  return processedCount;
}

function completeRestoration(
  state: TerrainErosionState,
  deps: TerrainErosionDeps,
  event: RestorationEvent,
): boolean {
  const cell = state.cells.get(event.cellId);
  if (cell === undefined) {
    return false;
  }

  const targetScore = maxScoreForQuality(event.targetQuality);
  cell.erosionScore = targetScore;
  cell.quality = qualityFromScore(targetScore);
  cell.lastUpdateMicros = deps.clock.nowMicroseconds();

  deps.logger.info('restoration_completed', {
    cellId: event.cellId,
    quality: cell.quality,
    score: cell.erosionScore,
  });

  return true;
}

function getErosionReport(state: TerrainErosionState, cellId: string): string | ErosionReport {
  const cell = state.cells.get(cellId);
  if (cell === undefined) {
    return 'CELL_NOT_FOUND';
  }

  const history = state.erosionHistory.get(cellId);
  const pending = findPendingRestoration(state, cellId);

  const report: ErosionReport = {
    cellId,
    currentQuality: cell.quality,
    erosionScore: cell.erosionScore,
    history: history !== undefined ? history : [],
    pendingRestoration: pending !== null ? pending : null,
  };

  return report;
}

function findPendingRestoration(
  state: TerrainErosionState,
  cellId: string,
): RestorationEvent | null {
  for (const event of state.restorationQueue) {
    if (event.cellId === cellId) {
      return event;
    }
  }
  return null;
}

function getAllCells(state: TerrainErosionState): readonly TerrainCell[] {
  return Array.from(state.cells.values());
}
