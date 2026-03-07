/**
 * Frequency Lock — State machine for Silfen Weave transit operations.
 *
 * Bible v1.1 Part 8: Transit between worlds requires establishing a
 * frequency lock between origin and destination lattice nodes.
 *
 * Lock States:
 *   SYNCHRONISING      → Calibrating frequency signatures
 *   PARTIAL_COHERENCE  → Lock partially established (coherence >= 0.73)
 *   CRITICAL_THRESHOLD → Lock nearing full coherence (>= 0.95)
 *   TRANSIT_EXECUTING  → Active transit in progress (>= 0.999)
 *   COMPLETE           → Transit successful (terminal)
 *   FAILED             → Lock lost before transit (terminal)
 *   PARTIAL_COLLAPSE   → Partial lock failure, entity in limbo (terminal)
 *
 * Lock Duration Formula:
 *   durationUs = 180_000_000 * (1 + distanceLY * 0.15) * fieldConditionMultiplier
 *   (180s base in microseconds, scaled by distance and field conditions)
 */

import {
  lockNotFound,
  lockAlreadyExists,
  lockInvalidTransition,
  coherenceOutOfRange,
  transitFailed,
} from './weave-errors.js';

// ─── Types ───────────────────────────────────────────────────────────

export type LockStatus =
  | 'synchronising'
  | 'partial_coherence'
  | 'critical_threshold'
  | 'transit_executing'
  | 'complete'
  | 'failed'
  | 'partial_collapse';

export interface FrequencyLock {
  readonly lockId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
  readonly entityId: string;
  readonly status: LockStatus;
  readonly coherence: number;
  readonly distanceLY: number;
  readonly estimatedDurationUs: number;
  readonly createdAt: number;
  readonly completedAt: number | null;
  readonly failureReason: string | null;
}

export interface InitiateLockParams {
  readonly lockId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
  readonly entityId: string;
  readonly distanceLY: number;
  readonly fieldCondition: number;
}

export interface LockTransition {
  readonly lockId: string;
  readonly from: LockStatus;
  readonly to: LockStatus;
  readonly coherence: number;
  readonly at: number;
}

export interface FrequencyLockEngine {
  initiateLock(params: InitiateLockParams): FrequencyLock;
  getLock(lockId: string): FrequencyLock;
  tryGetLock(lockId: string): FrequencyLock | undefined;
  updateCoherence(lockId: string, coherence: number): LockTransition | null;
  abortLock(lockId: string, reason: string): LockTransition;
  completeLock(lockId: string): LockTransition;
  triggerPartialCollapse(lockId: string, reason: string): LockTransition;
  getActiveLocks(): ReadonlyArray<FrequencyLock>;
  getLocksByEntity(entityId: string): ReadonlyArray<FrequencyLock>;
  count(): number;
}

// ─── Constants ───────────────────────────────────────────────────────

const BASE_DURATION_US = 180_000_000;

const DISTANCE_SCALE_FACTOR = 0.15;

export const COHERENCE_PARTIAL = 0.73;

export const COHERENCE_CRITICAL = 0.95;

export const COHERENCE_TRANSIT = 0.999;

const TERMINAL_STATES: ReadonlyArray<LockStatus> = [
  'complete', 'failed', 'partial_collapse',
];

const ABORTABLE_STATES: ReadonlyArray<LockStatus> = [
  'synchronising', 'partial_coherence', 'critical_threshold',
];

// ─── State ───────────────────────────────────────────────────────────

interface MutableLock {
  readonly lockId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
  readonly entityId: string;
  status: LockStatus;
  coherence: number;
  readonly distanceLY: number;
  readonly estimatedDurationUs: number;
  readonly createdAt: number;
  completedAt: number | null;
  failureReason: string | null;
}

interface EngineState {
  readonly locks: Map<string, MutableLock>;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createFrequencyLockEngine(deps: {
  readonly clock: { nowMicroseconds(): number };
}): FrequencyLockEngine {
  const state: EngineState = {
    locks: new Map(),
    clock: deps.clock,
  };

  return {
    initiateLock: (p) => initiateLockImpl(state, p),
    getLock: (id) => getLockImpl(state, id),
    tryGetLock: (id) => tryGetLockImpl(state, id),
    updateCoherence: (id, c) => updateCoherenceImpl(state, id, c),
    abortLock: (id, r) => abortLockImpl(state, id, r),
    completeLock: (id) => completeLockImpl(state, id),
    triggerPartialCollapse: (id, r) => partialCollapseImpl(state, id, r),
    getActiveLocks: () => getActiveLocksImpl(state),
    getLocksByEntity: (eid) => getLocksByEntityImpl(state, eid),
    count: () => state.locks.size,
  };
}

// ─── Duration Calculation ───────────────────────────────────────────

export function calculateLockDurationUs(distanceLY: number, fieldCondition: number): number {
  return Math.round(BASE_DURATION_US * (1 + distanceLY * DISTANCE_SCALE_FACTOR) * fieldCondition);
}

// ─── Lock Lifecycle ─────────────────────────────────────────────────

function initiateLockImpl(state: EngineState, params: InitiateLockParams): FrequencyLock {
  if (state.locks.has(params.lockId)) {
    throw lockAlreadyExists(params.lockId);
  }
  const durationUs = calculateLockDurationUs(params.distanceLY, params.fieldCondition);
  const lock: MutableLock = {
    lockId: params.lockId,
    originNodeId: params.originNodeId,
    destinationNodeId: params.destinationNodeId,
    entityId: params.entityId,
    status: 'synchronising',
    coherence: 0,
    distanceLY: params.distanceLY,
    estimatedDurationUs: durationUs,
    createdAt: state.clock.nowMicroseconds(),
    completedAt: null,
    failureReason: null,
  };
  state.locks.set(params.lockId, lock);
  return toReadonlyLock(lock);
}

function getLockImpl(state: EngineState, lockId: string): FrequencyLock {
  const lock = state.locks.get(lockId);
  if (lock === undefined) throw lockNotFound(lockId);
  return toReadonlyLock(lock);
}

function tryGetLockImpl(state: EngineState, lockId: string): FrequencyLock | undefined {
  const lock = state.locks.get(lockId);
  return lock !== undefined ? toReadonlyLock(lock) : undefined;
}

// ─── Coherence Updates ──────────────────────────────────────────────

function updateCoherenceImpl(
  state: EngineState,
  lockId: string,
  coherence: number,
): LockTransition | null {
  if (coherence < 0 || coherence > 1) {
    throw coherenceOutOfRange(lockId, coherence);
  }
  const lock = getMutableLock(state, lockId);
  assertNotTerminal(lock);
  lock.coherence = coherence;
  return evaluateCoherenceTransition(lock, state.clock.nowMicroseconds());
}

function evaluateCoherenceTransition(lock: MutableLock, now: number): LockTransition | null {
  const newStatus = statusFromCoherence(lock.coherence);
  if (newStatus === lock.status) return null;
  const from = lock.status;
  lock.status = newStatus;
  return { lockId: lock.lockId, from, to: newStatus, coherence: lock.coherence, at: now };
}

function statusFromCoherence(coherence: number): LockStatus {
  if (coherence >= COHERENCE_TRANSIT) return 'transit_executing';
  if (coherence >= COHERENCE_CRITICAL) return 'critical_threshold';
  if (coherence >= COHERENCE_PARTIAL) return 'partial_coherence';
  return 'synchronising';
}

// ─── Terminal Transitions ───────────────────────────────────────────

function abortLockImpl(state: EngineState, lockId: string, reason: string): LockTransition {
  const lock = getMutableLock(state, lockId);
  if (!isAbortable(lock.status)) {
    throw lockInvalidTransition(lockId, lock.status, 'failed');
  }
  return applyTerminalState(lock, 'failed', reason, state.clock.nowMicroseconds());
}

function completeLockImpl(state: EngineState, lockId: string): LockTransition {
  const lock = getMutableLock(state, lockId);
  if (lock.status !== 'transit_executing') {
    throw lockInvalidTransition(lockId, lock.status, 'complete');
  }
  return applyTerminalState(lock, 'complete', null, state.clock.nowMicroseconds());
}

function partialCollapseImpl(
  state: EngineState,
  lockId: string,
  reason: string,
): LockTransition {
  const lock = getMutableLock(state, lockId);
  if (lock.status !== 'transit_executing') {
    throw transitFailed(lockId, `cannot collapse from ${lock.status}`);
  }
  return applyTerminalState(lock, 'partial_collapse', reason, state.clock.nowMicroseconds());
}

function applyTerminalState(
  lock: MutableLock,
  to: LockStatus,
  reason: string | null,
  now: number,
): LockTransition {
  const from = lock.status;
  lock.status = to;
  lock.completedAt = now;
  lock.failureReason = reason;
  return { lockId: lock.lockId, from, to, coherence: lock.coherence, at: now };
}

// ─── Queries ────────────────────────────────────────────────────────

function getActiveLocksImpl(state: EngineState): ReadonlyArray<FrequencyLock> {
  return [...state.locks.values()]
    .filter((l) => !isTerminal(l.status))
    .map(toReadonlyLock);
}

function getLocksByEntityImpl(
  state: EngineState,
  entityId: string,
): ReadonlyArray<FrequencyLock> {
  return [...state.locks.values()]
    .filter((l) => l.entityId === entityId)
    .map(toReadonlyLock);
}

// ─── Helpers ────────────────────────────────────────────────────────

function getMutableLock(state: EngineState, lockId: string): MutableLock {
  const lock = state.locks.get(lockId);
  if (lock === undefined) throw lockNotFound(lockId);
  return lock;
}

function assertNotTerminal(lock: MutableLock): void {
  if (isTerminal(lock.status)) {
    throw lockInvalidTransition(lock.lockId, lock.status, 'coherence_update');
  }
}

function isTerminal(status: LockStatus): boolean {
  return TERMINAL_STATES.includes(status);
}

function isAbortable(status: LockStatus): boolean {
  return ABORTABLE_STATES.includes(status);
}

function toReadonlyLock(lock: MutableLock): FrequencyLock {
  return {
    lockId: lock.lockId,
    originNodeId: lock.originNodeId,
    destinationNodeId: lock.destinationNodeId,
    entityId: lock.entityId,
    status: lock.status,
    coherence: lock.coherence,
    distanceLY: lock.distanceLY,
    estimatedDurationUs: lock.estimatedDurationUs,
    createdAt: lock.createdAt,
    completedAt: lock.completedAt,
    failureReason: lock.failureReason,
  };
}
