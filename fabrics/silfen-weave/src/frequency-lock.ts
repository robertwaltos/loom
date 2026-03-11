/**
 * Frequency Lock — Coherence tracking for world-to-world connections.
 *
 * Bible v1.2: Connections between worlds in the Silfen Weave require
 * frequency locking — a process of attunement that establishes and
 * maintains coherent resonance between two lattice nodes.
 *
 * Lock States:
 *   UNLOCKED   → No attunement in progress, connection dormant
 *   ATTUNING   → Active attunement underway, coherence building
 *   LOCKED     → Frequency lock achieved, coherence >= lock threshold
 *   DISRUPTED  → Lock degraded by external event, coherence dropped
 *   BROKEN     → Lock irreparably severed (terminal)
 *
 * Coherence Levels:
 *   VOID       → coherence = 0, no signal
 *   FAINT      → coherence in (0, 0.25]
 *   WEAK       → coherence in (0.25, 0.50]
 *   MODERATE   → coherence in (0.50, 0.75]
 *   STRONG     → coherence in (0.75, 0.95]
 *   RESONANT   → coherence in (0.95, 1.0]
 */

// ── Port Interfaces ─────────────────────────────────────────────

interface FrequencyClockPort {
  readonly nowMicroseconds: () => number;
}

interface FrequencyIdGeneratorPort {
  readonly next: () => string;
}

// ── Types ────────────────────────────────────────────────────────

type LockState = 'UNLOCKED' | 'ATTUNING' | 'LOCKED' | 'DISRUPTED' | 'BROKEN';

type CoherenceLevel = 'VOID' | 'FAINT' | 'WEAK' | 'MODERATE' | 'STRONG' | 'RESONANT';

interface FrequencyRecord {
  readonly connectionId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly state: LockState;
  readonly coherence: number;
  readonly attunementStartedAt: number | null;
  readonly lockedAt: number | null;
  readonly brokenAt: number | null;
  readonly createdAt: number;
  readonly lastUpdatedAt: number;
  readonly disruptionCount: number;
  readonly totalRepairApplied: number;
}

interface AttunementProgress {
  readonly connectionId: string;
  readonly dynastyId: string;
  readonly progress: number;
  readonly coherence: number;
  readonly state: LockState;
  readonly startedAt: number;
}

interface DisruptionEvent {
  readonly connectionId: string;
  readonly severity: number;
  readonly cause: string;
  readonly previousCoherence: number;
  readonly newCoherence: number;
  readonly previousState: LockState;
  readonly newState: LockState;
  readonly timestamp: number;
}

interface FrequencyDeps {
  readonly clock: FrequencyClockPort;
  readonly idGenerator: FrequencyIdGeneratorPort;
}

interface FrequencyLockConfig {
  readonly lockThreshold: number;
  readonly disruptionThreshold: number;
  readonly breakThreshold: number;
  readonly maxCoherence: number;
  readonly attunementDecayRate: number;
}

interface FrequencyLockStats {
  readonly totalConnections: number;
  readonly byState: Readonly<Record<LockState, number>>;
  readonly averageCoherence: number;
  readonly totalDisruptions: number;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_LOCK_CONFIG: FrequencyLockConfig = {
  lockThreshold: 0.95,
  disruptionThreshold: 0.5,
  breakThreshold: 0.05,
  maxCoherence: 1.0,
  attunementDecayRate: 0.01,
};

const COHERENCE_THRESHOLDS = {
  VOID: 0,
  FAINT: 0.25,
  WEAK: 0.5,
  MODERATE: 0.75,
  STRONG: 0.95,
  RESONANT: 1.0,
} as const;

// ── State ────────────────────────────────────────────────────────

interface MutableRecord {
  readonly connectionId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  state: LockState;
  coherence: number;
  attunementStartedAt: number | null;
  dynastyId: string | null;
  lockedAt: number | null;
  brokenAt: number | null;
  readonly createdAt: number;
  lastUpdatedAt: number;
  disruptionCount: number;
  totalRepairApplied: number;
  progress: number;
}

interface FrequencyState {
  readonly deps: FrequencyDeps;
  readonly config: FrequencyLockConfig;
  readonly records: Map<string, MutableRecord>;
}

// ── Coherence Classification ─────────────────────────────────────

function classifyCoherence(coherence: number): CoherenceLevel {
  if (coherence <= 0) return 'VOID';
  if (coherence <= COHERENCE_THRESHOLDS.FAINT) return 'FAINT';
  if (coherence <= COHERENCE_THRESHOLDS.WEAK) return 'WEAK';
  if (coherence <= COHERENCE_THRESHOLDS.MODERATE) return 'MODERATE';
  if (coherence <= COHERENCE_THRESHOLDS.STRONG) return 'STRONG';
  return 'RESONANT';
}

// ── Connection Registration ──────────────────────────────────────

function registerConnectionImpl(
  state: FrequencyState,
  fromWorldId: string,
  toWorldId: string,
): FrequencyRecord {
  const connectionId = state.deps.idGenerator.next();
  const now = state.deps.clock.nowMicroseconds();
  const record: MutableRecord = {
    connectionId,
    fromWorldId,
    toWorldId,
    state: 'UNLOCKED',
    coherence: 0,
    attunementStartedAt: null,
    dynastyId: null,
    lockedAt: null,
    brokenAt: null,
    createdAt: now,
    lastUpdatedAt: now,
    disruptionCount: 0,
    totalRepairApplied: 0,
    progress: 0,
  };
  state.records.set(connectionId, record);
  return toReadonlyRecord(record);
}

// ── Attunement ───────────────────────────────────────────────────

function startAttunementImpl(
  state: FrequencyState,
  connectionId: string,
  dynastyId: string,
): AttunementProgress | string {
  const record = state.records.get(connectionId);
  if (record === undefined) return 'connection_not_found';
  if (record.state === 'BROKEN') return 'connection_broken';
  if (record.state === 'ATTUNING') return 'already_attuning';
  if (record.state === 'LOCKED') return 'already_locked';
  const now = state.deps.clock.nowMicroseconds();
  record.state = 'ATTUNING';
  record.dynastyId = dynastyId;
  record.attunementStartedAt = now;
  record.progress = 0;
  record.lastUpdatedAt = now;
  return toAttunementProgress(record);
}

function advanceAttunementImpl(
  state: FrequencyState,
  connectionId: string,
  progressDelta: number,
): AttunementProgress | string {
  const record = state.records.get(connectionId);
  if (record === undefined) return 'connection_not_found';
  if (record.state !== 'ATTUNING') return 'not_attuning';
  if (progressDelta <= 0) return 'invalid_progress_delta';
  const now = state.deps.clock.nowMicroseconds();
  record.progress = Math.min(1.0, record.progress + progressDelta);
  record.coherence = Math.min(state.config.maxCoherence, record.progress);
  record.lastUpdatedAt = now;
  return toAttunementProgress(record);
}

// ── Lock Frequency ───────────────────────────────────────────────

function lockFrequencyImpl(state: FrequencyState, connectionId: string): FrequencyRecord | string {
  const record = state.records.get(connectionId);
  if (record === undefined) return 'connection_not_found';
  if (record.state === 'BROKEN') return 'connection_broken';
  if (record.state === 'LOCKED') return 'already_locked';
  if (record.coherence < state.config.lockThreshold) return 'coherence_too_low';
  const now = state.deps.clock.nowMicroseconds();
  record.state = 'LOCKED';
  record.lockedAt = now;
  record.lastUpdatedAt = now;
  return toReadonlyRecord(record);
}

// ── Disruption ───────────────────────────────────────────────────

function disruptImpl(
  state: FrequencyState,
  connectionId: string,
  severity: number,
  cause: string,
): DisruptionEvent | string {
  const record = state.records.get(connectionId);
  if (record === undefined) return 'connection_not_found';
  if (record.state === 'BROKEN') return 'connection_broken';
  if (record.state === 'UNLOCKED') return 'connection_unlocked';
  const clampedSeverity = Math.max(0, Math.min(1, severity));
  const previousCoherence = record.coherence;
  const previousState = record.state;
  return applyDisruption(state, record, clampedSeverity, cause, previousCoherence, previousState);
}

function applyDisruption(
  state: FrequencyState,
  record: MutableRecord,
  severity: number,
  cause: string,
  previousCoherence: number,
  previousState: LockState,
): DisruptionEvent {
  const now = state.deps.clock.nowMicroseconds();
  record.coherence = Math.max(0, record.coherence - severity);
  record.disruptionCount += 1;
  record.lastUpdatedAt = now;
  record.state = evaluateStateAfterCoherenceChange(record, state.config);
  return {
    connectionId: record.connectionId,
    severity,
    cause,
    previousCoherence,
    newCoherence: record.coherence,
    previousState,
    newState: record.state,
    timestamp: now,
  };
}

// ── Repair ───────────────────────────────────────────────────────

function repairImpl(
  state: FrequencyState,
  connectionId: string,
  amount: number,
): FrequencyRecord | string {
  const record = state.records.get(connectionId);
  if (record === undefined) return 'connection_not_found';
  if (record.state === 'BROKEN') return 'connection_broken';
  if (record.state === 'UNLOCKED') return 'connection_unlocked';
  if (amount <= 0) return 'invalid_repair_amount';
  const now = state.deps.clock.nowMicroseconds();
  record.coherence = Math.min(state.config.maxCoherence, record.coherence + amount);
  record.totalRepairApplied += amount;
  record.lastUpdatedAt = now;
  record.state = evaluateStateAfterCoherenceChange(record, state.config);
  return toReadonlyRecord(record);
}

// ── State Evaluation ─────────────────────────────────────────────

function evaluateStateAfterCoherenceChange(
  record: MutableRecord,
  config: FrequencyLockConfig,
): LockState {
  if (record.coherence <= config.breakThreshold) {
    record.brokenAt = record.brokenAt ?? 0;
    return 'BROKEN';
  }
  if (record.coherence < config.disruptionThreshold) return 'DISRUPTED';
  if (record.coherence >= config.lockThreshold) return 'LOCKED';
  if (record.state === 'ATTUNING') return 'ATTUNING';
  return 'DISRUPTED';
}

// ── Queries ──────────────────────────────────────────────────────

function getRecordImpl(state: FrequencyState, connectionId: string): FrequencyRecord | undefined {
  const record = state.records.get(connectionId);
  if (record === undefined) return undefined;
  return toReadonlyRecord(record);
}

function getCoherenceLevelImpl(state: FrequencyState, connectionId: string): CoherenceLevel {
  const record = state.records.get(connectionId);
  if (record === undefined) return 'VOID';
  return classifyCoherence(record.coherence);
}

function listByStateImpl(state: FrequencyState, lockState: LockState): readonly FrequencyRecord[] {
  const result: FrequencyRecord[] = [];
  for (const record of state.records.values()) {
    if (record.state === lockState) {
      result.push(toReadonlyRecord(record));
    }
  }
  return result;
}

function getStatsImpl(state: FrequencyState): FrequencyLockStats {
  const byState: Record<LockState, number> = {
    UNLOCKED: 0,
    ATTUNING: 0,
    LOCKED: 0,
    DISRUPTED: 0,
    BROKEN: 0,
  };
  let totalCoherence = 0;
  let totalDisruptions = 0;
  for (const record of state.records.values()) {
    byState[record.state] += 1;
    totalCoherence += record.coherence;
    totalDisruptions += record.disruptionCount;
  }
  const total = state.records.size;
  return {
    totalConnections: total,
    byState,
    averageCoherence: total > 0 ? totalCoherence / total : 0,
    totalDisruptions,
  };
}

// ── Conversion Helpers ───────────────────────────────────────────

function toReadonlyRecord(record: MutableRecord): FrequencyRecord {
  return {
    connectionId: record.connectionId,
    fromWorldId: record.fromWorldId,
    toWorldId: record.toWorldId,
    state: record.state,
    coherence: record.coherence,
    attunementStartedAt: record.attunementStartedAt,
    lockedAt: record.lockedAt,
    brokenAt: record.brokenAt,
    createdAt: record.createdAt,
    lastUpdatedAt: record.lastUpdatedAt,
    disruptionCount: record.disruptionCount,
    totalRepairApplied: record.totalRepairApplied,
  };
}

function toAttunementProgress(record: MutableRecord): AttunementProgress {
  return {
    connectionId: record.connectionId,
    dynastyId: record.dynastyId ?? '',
    progress: record.progress,
    coherence: record.coherence,
    state: record.state,
    startedAt: record.attunementStartedAt ?? 0,
  };
}

// ── Public API Interface ─────────────────────────────────────────

interface FrequencyLockService {
  readonly registerConnection: (fromWorldId: string, toWorldId: string) => FrequencyRecord;
  readonly startAttunement: (
    connectionId: string,
    dynastyId: string,
  ) => AttunementProgress | string;
  readonly advanceAttunement: (
    connectionId: string,
    progressDelta: number,
  ) => AttunementProgress | string;
  readonly lockFrequency: (connectionId: string) => FrequencyRecord | string;
  readonly disrupt: (
    connectionId: string,
    severity: number,
    cause: string,
  ) => DisruptionEvent | string;
  readonly repair: (connectionId: string, amount: number) => FrequencyRecord | string;
  readonly getRecord: (connectionId: string) => FrequencyRecord | undefined;
  readonly getCoherenceLevel: (connectionId: string) => CoherenceLevel;
  readonly listByState: (state: LockState) => readonly FrequencyRecord[];
  readonly getStats: () => FrequencyLockStats;
}

// ── Factory ──────────────────────────────────────────────────────

function createFrequencyLockService(
  deps: FrequencyDeps,
  config?: Partial<FrequencyLockConfig>,
): FrequencyLockService {
  const resolvedConfig: FrequencyLockConfig = { ...DEFAULT_LOCK_CONFIG, ...config };
  const state: FrequencyState = {
    deps,
    config: resolvedConfig,
    records: new Map(),
  };

  return {
    registerConnection: (from, to) => registerConnectionImpl(state, from, to),
    startAttunement: (id, dynasty) => startAttunementImpl(state, id, dynasty),
    advanceAttunement: (id, delta) => advanceAttunementImpl(state, id, delta),
    lockFrequency: (id) => lockFrequencyImpl(state, id),
    disrupt: (id, severity, cause) => disruptImpl(state, id, severity, cause),
    repair: (id, amount) => repairImpl(state, id, amount),
    getRecord: (id) => getRecordImpl(state, id),
    getCoherenceLevel: (id) => getCoherenceLevelImpl(state, id),
    listByState: (s) => listByStateImpl(state, s),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createFrequencyLockService, classifyCoherence, DEFAULT_LOCK_CONFIG, COHERENCE_THRESHOLDS };

export type {
  FrequencyLockService,
  FrequencyDeps,
  FrequencyLockConfig,
  FrequencyLockStats,
  LockState,
  CoherenceLevel,
  FrequencyRecord,
  AttunementProgress,
  DisruptionEvent,
  FrequencyClockPort,
  FrequencyIdGeneratorPort,
};
