/**
 * Silfen Weave Orchestrator — Transit tick-loop coordinator.
 *
 * Coordinates the frequency lock lifecycle, transit queue processing,
 * corridor management, survey mission advancement, and coherence
 * monitoring into a unified per-tick transit processing cycle.
 *
 * Per tick:
 *   1. Sweep expired transit requests from queue
 *   2. Dequeue pending transit requests (up to max concurrent)
 *   3. Advance coherence on active corridors
 *   4. Complete or abort corridors based on coherence
 *   5. Evaluate survey mission transit progress
 *   6. Return comprehensive tick result
 *
 * The orchestrator never makes transit decisions — each system owns
 * its own rules. This service is purely sequencing and wiring.
 */

// ─── Port Interfaces ────────────────────────────────────────────────

export interface WeaveQueuePort {
  dequeue(): WeaveQueueEntry | undefined;
  sweepExpired(): number;
  getQueueDepth(): number;
}

export interface WeaveQueueEntry {
  readonly requestId: string;
  readonly entityId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
  readonly priority: string;
}

export interface WeaveCorridorPort {
  openCorridor(params: WeaveOpenParams): WeaveCorridorRecord;
  initiateLock(corridorId: string, fieldCondition: number): WeaveCorridorRecord;
  advanceCoherence(corridorId: string, coherence: number): WeaveCorridorTransition | null;
  completeTransit(corridorId: string): WeaveCorridorTransition;
  abortCorridor(corridorId: string, reason: string): WeaveCorridorTransition;
  getActiveByEntity(entityId: string): WeaveCorridorRecord | undefined;
  countActive(): number;
}

export interface WeaveOpenParams {
  readonly entityId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
}

export interface WeaveCorridorRecord {
  readonly corridorId: string;
  readonly entityId: string;
  readonly phase: string;
}

export interface WeaveCorridorTransition {
  readonly corridorId: string;
  readonly from: string;
  readonly to: string;
}

export interface WeaveCoherencePort {
  computeCoherence(corridorId: string): number;
}

export interface WeaveSurveyPort {
  evaluateActiveMissions(): number;
}

export interface WeaveLedgerPort {
  recordTransit(params: WeaveLedgerRecord): string;
}

export interface WeaveLedgerRecord {
  readonly entityId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
  readonly corridorId: string;
  readonly status: 'completed' | 'failed';
}

export interface WeaveClockPort {
  readonly nowMicroseconds: () => number;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface WeaveOrchestratorConfig {
  readonly maxConcurrentTransits: number;
  readonly defaultFieldCondition: number;
  readonly coherenceTransitThreshold: number;
  readonly coherenceAbortThreshold: number;
}

const DEFAULT_WEAVE_CONFIG: WeaveOrchestratorConfig = {
  maxConcurrentTransits: 10,
  defaultFieldCondition: 1.0,
  coherenceTransitThreshold: 0.999,
  coherenceAbortThreshold: 0.1,
};

// ─── Deps ───────────────────────────────────────────────────────────

export interface WeaveOrchestratorDeps {
  readonly queue: WeaveQueuePort;
  readonly corridor: WeaveCorridorPort;
  readonly coherence: WeaveCoherencePort;
  readonly survey: WeaveSurveyPort;
  readonly ledger: WeaveLedgerPort;
  readonly clock: WeaveClockPort;
}

// ─── Result Types ───────────────────────────────────────────────────

export interface WeaveTickResult {
  readonly expiredSwept: number;
  readonly corridorsOpened: number;
  readonly transitsCompleted: number;
  readonly transitsAborted: number;
  readonly surveysAdvanced: number;
  readonly activeCorridors: number;
  readonly tickNumber: number;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface WeaveOrchestrator {
  readonly tick: () => WeaveTickResult;
  readonly getTickCount: () => number;
  readonly getStats: () => WeaveOrchestratorStats;
}

export interface WeaveOrchestratorStats {
  readonly totalTicks: number;
  readonly totalCorridorsOpened: number;
  readonly totalTransitsCompleted: number;
  readonly totalTransitsAborted: number;
  readonly totalSurveysAdvanced: number;
}

// ─── State ──────────────────────────────────────────────────────────

interface OrchestratorState {
  readonly deps: WeaveOrchestratorDeps;
  readonly config: WeaveOrchestratorConfig;
  readonly activeCorridors: Map<string, ActiveCorridorInfo>;
  tickCount: number;
  totalOpened: number;
  totalCompleted: number;
  totalAborted: number;
  totalSurveys: number;
}

interface ActiveCorridorInfo {
  readonly corridorId: string;
  readonly entityId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
}

// ─── Factory ────────────────────────────────────────────────────────

function createWeaveOrchestrator(
  deps: WeaveOrchestratorDeps,
  config?: Partial<WeaveOrchestratorConfig>,
): WeaveOrchestrator {
  const state: OrchestratorState = {
    deps,
    config: { ...DEFAULT_WEAVE_CONFIG, ...config },
    activeCorridors: new Map(),
    tickCount: 0,
    totalOpened: 0,
    totalCompleted: 0,
    totalAborted: 0,
    totalSurveys: 0,
  };

  return {
    tick: () => weaveTick(state),
    getTickCount: () => state.tickCount,
    getStats: () => buildStats(state),
  };
}

// ─── Tick Implementation ────────────────────────────────────────────

function weaveTick(state: OrchestratorState): WeaveTickResult {
  state.tickCount += 1;

  const swept = state.deps.queue.sweepExpired();
  const opened = processQueue(state);
  const coherenceResult = advanceActiveCorridors(state);
  const surveys = state.deps.survey.evaluateActiveMissions();

  state.totalOpened += opened;
  state.totalCompleted += coherenceResult.completed;
  state.totalAborted += coherenceResult.aborted;
  state.totalSurveys += surveys;

  return {
    expiredSwept: swept,
    corridorsOpened: opened,
    transitsCompleted: coherenceResult.completed,
    transitsAborted: coherenceResult.aborted,
    surveysAdvanced: surveys,
    activeCorridors: state.activeCorridors.size,
    tickNumber: state.tickCount,
  };
}

function buildStats(state: OrchestratorState): WeaveOrchestratorStats {
  return {
    totalTicks: state.tickCount,
    totalCorridorsOpened: state.totalOpened,
    totalTransitsCompleted: state.totalCompleted,
    totalTransitsAborted: state.totalAborted,
    totalSurveysAdvanced: state.totalSurveys,
  };
}

// ─── Queue Processing ───────────────────────────────────────────────

function processQueue(state: OrchestratorState): number {
  let opened = 0;
  const capacity = state.config.maxConcurrentTransits - state.activeCorridors.size;

  for (let i = 0; i < capacity; i++) {
    const entry = state.deps.queue.dequeue();
    if (entry === undefined) break;
    if (openCorridorForEntry(state, entry)) opened += 1;
  }

  return opened;
}

function openCorridorForEntry(
  state: OrchestratorState,
  entry: WeaveQueueEntry,
): boolean {
  const existing = state.deps.corridor.getActiveByEntity(entry.entityId);
  if (existing !== undefined) return false;

  const record = state.deps.corridor.openCorridor({
    entityId: entry.entityId,
    originNodeId: entry.originNodeId,
    destinationNodeId: entry.destinationNodeId,
  });

  state.deps.corridor.initiateLock(record.corridorId, state.config.defaultFieldCondition);
  state.activeCorridors.set(record.corridorId, {
    corridorId: record.corridorId,
    entityId: entry.entityId,
    originNodeId: entry.originNodeId,
    destinationNodeId: entry.destinationNodeId,
  });

  return true;
}

// ─── Coherence Advancement ──────────────────────────────────────────

interface CoherenceResult {
  readonly completed: number;
  readonly aborted: number;
}

function advanceActiveCorridors(state: OrchestratorState): CoherenceResult {
  let completed = 0;
  let aborted = 0;
  const toRemove: string[] = [];

  for (const [corridorId, info] of state.activeCorridors.entries()) {
    const result = advanceSingleCorridor(state, corridorId, info);
    if (result === 'completed') { completed += 1; toRemove.push(corridorId); }
    else if (result === 'aborted') { aborted += 1; toRemove.push(corridorId); }
  }

  for (const id of toRemove) {
    state.activeCorridors.delete(id);
  }

  return { completed, aborted };
}

function advanceSingleCorridor(
  state: OrchestratorState,
  corridorId: string,
  info: ActiveCorridorInfo,
): 'completed' | 'aborted' | 'active' {
  const coherence = state.deps.coherence.computeCoherence(corridorId);

  if (coherence >= state.config.coherenceTransitThreshold) {
    return completeCorridor(state, corridorId, info);
  }
  if (coherence < state.config.coherenceAbortThreshold) {
    return abortCorridor(state, corridorId, info);
  }

  state.deps.corridor.advanceCoherence(corridorId, coherence);
  return 'active';
}

function completeCorridor(
  state: OrchestratorState,
  corridorId: string,
  info: ActiveCorridorInfo,
): 'completed' {
  state.deps.corridor.completeTransit(corridorId);
  recordLedgerEntry(state, info, 'completed');
  return 'completed';
}

function abortCorridor(
  state: OrchestratorState,
  corridorId: string,
  info: ActiveCorridorInfo,
): 'aborted' {
  state.deps.corridor.abortCorridor(corridorId, 'Coherence below threshold');
  recordLedgerEntry(state, info, 'failed');
  return 'aborted';
}

function recordLedgerEntry(
  state: OrchestratorState,
  info: ActiveCorridorInfo,
  status: 'completed' | 'failed',
): void {
  state.deps.ledger.recordTransit({
    entityId: info.entityId,
    originNodeId: info.originNodeId,
    destinationNodeId: info.destinationNodeId,
    corridorId: info.corridorId,
    status,
  });
}

// ─── Exports ────────────────────────────────────────────────────────

export { createWeaveOrchestrator, DEFAULT_WEAVE_CONFIG };
