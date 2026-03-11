/**
 * Entity Lifecycle Manager — State machine for entity lifecycle tracking.
 *
 * Tracks entities through lifecycle phases with validated transitions,
 * history recording, and callback hooks. Uses port-based design to
 * avoid coupling to EntityRegistry directly.
 *
 * Lifecycle States:
 *   active      → Entity fully operational in its world
 *   dormant     → Entity inactive, awaiting reactivation
 *   suspended   → Entity temporarily frozen (e.g. owner offline)
 *   migrating   → Entity in transit between worlds
 *   archived    → Entity permanently removed from play (terminal)
 *
 * Valid Transitions:
 *   active     → dormant, suspended, migrating, archived
 *   dormant    → active, archived
 *   suspended  → active, archived
 *   migrating  → active, archived
 *   archived   → (none — terminal)
 */

// ─── Types ───────────────────────────────────────────────────────────

export type LifecyclePhase = 'active' | 'dormant' | 'suspended' | 'migrating' | 'archived';

export interface LifecycleRecord {
  readonly entityId: string;
  readonly phase: LifecyclePhase;
  readonly enteredAt: number;
  readonly reason: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface LifecycleTransition {
  readonly entityId: string;
  readonly from: LifecyclePhase;
  readonly to: LifecyclePhase;
  readonly reason: string;
  readonly at: number;
}

export interface LifecycleHistory {
  readonly entityId: string;
  readonly transitions: ReadonlyArray<LifecycleTransition>;
  readonly currentPhase: LifecyclePhase;
}

export interface LifecycleStats {
  readonly trackedCount: number;
  readonly activeCount: number;
  readonly dormantCount: number;
  readonly suspendedCount: number;
  readonly migratingCount: number;
  readonly archivedCount: number;
  readonly totalTransitions: number;
}

export type LifecycleCallback = (transition: LifecycleTransition) => void;

export interface EntityLifecycleDeps {
  readonly clock: { nowMicroseconds(): number };
  readonly maxHistoryPerEntity?: number;
}

export interface EntityLifecycleManager {
  track(
    entityId: string,
    initialPhase: LifecyclePhase,
    reason: string,
    metadata?: Record<string, unknown>,
  ): LifecycleRecord;
  transition(
    entityId: string,
    to: LifecyclePhase,
    reason: string,
    metadata?: Record<string, unknown>,
  ): LifecycleTransition;
  getPhase(entityId: string): LifecyclePhase | undefined;
  getRecord(entityId: string): LifecycleRecord | undefined;
  getHistory(entityId: string): LifecycleHistory | undefined;
  queryByPhase(phase: LifecyclePhase): ReadonlyArray<string>;
  untrack(entityId: string): boolean;
  onTransition(callback: LifecycleCallback): void;
  getStats(): LifecycleStats;
}

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_MAX_HISTORY = 50;

const VALID_TRANSITIONS: Readonly<Record<LifecyclePhase, ReadonlyArray<LifecyclePhase>>> = {
  active: ['dormant', 'suspended', 'migrating', 'archived'],
  dormant: ['active', 'archived'],
  suspended: ['active', 'archived'],
  migrating: ['active', 'archived'],
  archived: [],
};

// ─── State ───────────────────────────────────────────────────────────

interface MutableRecord {
  readonly entityId: string;
  phase: LifecyclePhase;
  enteredAt: number;
  reason: string;
  metadata: Record<string, unknown>;
}

interface ManagerState {
  readonly records: Map<string, MutableRecord>;
  readonly history: Map<string, LifecycleTransition[]>;
  readonly callbacks: LifecycleCallback[];
  readonly clock: { nowMicroseconds(): number };
  readonly maxHistory: number;
  totalTransitions: number;
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createEntityLifecycleManager(deps: EntityLifecycleDeps): EntityLifecycleManager {
  const state: ManagerState = {
    records: new Map(),
    history: new Map(),
    callbacks: [],
    clock: deps.clock,
    maxHistory: deps.maxHistoryPerEntity ?? DEFAULT_MAX_HISTORY,
    totalTransitions: 0,
  };

  return {
    track: (eid, phase, reason, meta) => trackImpl(state, eid, phase, reason, meta),
    transition: (eid, to, reason, meta) => transitionImpl(state, eid, to, reason, meta),
    getPhase: (eid) => getPhaseImpl(state, eid),
    getRecord: (eid) => getRecordImpl(state, eid),
    getHistory: (eid) => getHistoryImpl(state, eid),
    queryByPhase: (phase) => queryByPhaseImpl(state, phase),
    untrack: (eid) => untrackImpl(state, eid),
    onTransition: (cb) => {
      state.callbacks.push(cb);
    },
    getStats: () => computeStats(state),
  };
}

// ─── Track ──────────────────────────────────────────────────────────

function trackImpl(
  state: ManagerState,
  entityId: string,
  initialPhase: LifecyclePhase,
  reason: string,
  metadata?: Record<string, unknown>,
): LifecycleRecord {
  const existing = state.records.get(entityId);
  if (existing !== undefined) {
    return toReadonlyRecord(existing);
  }
  const now = state.clock.nowMicroseconds();
  const record: MutableRecord = {
    entityId,
    phase: initialPhase,
    enteredAt: now,
    reason,
    metadata: metadata ?? {},
  };
  state.records.set(entityId, record);
  state.history.set(entityId, []);
  return toReadonlyRecord(record);
}

// ─── Transition ─────────────────────────────────────────────────────

function transitionImpl(
  state: ManagerState,
  entityId: string,
  to: LifecyclePhase,
  reason: string,
  metadata?: Record<string, unknown>,
): LifecycleTransition {
  const record = state.records.get(entityId);
  if (record === undefined) {
    throw new Error('Entity ' + entityId + ' is not tracked');
  }
  validateTransition(entityId, record.phase, to);
  const now = state.clock.nowMicroseconds();
  const transition: LifecycleTransition = {
    entityId,
    from: record.phase,
    to,
    reason,
    at: now,
  };
  record.phase = to;
  record.enteredAt = now;
  record.reason = reason;
  record.metadata = metadata ?? {};
  appendHistory(state, entityId, transition);
  state.totalTransitions++;
  notifyCallbacks(state, transition);
  return transition;
}

function validateTransition(entityId: string, from: LifecyclePhase, to: LifecyclePhase): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error('Invalid lifecycle transition for ' + entityId + ': ' + from + ' -> ' + to);
  }
}

function appendHistory(
  state: ManagerState,
  entityId: string,
  transition: LifecycleTransition,
): void {
  const entries = state.history.get(entityId);
  if (entries === undefined) return;
  entries.push(transition);
  if (entries.length > state.maxHistory) {
    entries.splice(0, entries.length - state.maxHistory);
  }
}

function notifyCallbacks(state: ManagerState, transition: LifecycleTransition): void {
  for (const cb of state.callbacks) {
    cb(transition);
  }
}

// ─── Queries ────────────────────────────────────────────────────────

function getPhaseImpl(state: ManagerState, entityId: string): LifecyclePhase | undefined {
  const record = state.records.get(entityId);
  return record !== undefined ? record.phase : undefined;
}

function getRecordImpl(state: ManagerState, entityId: string): LifecycleRecord | undefined {
  const record = state.records.get(entityId);
  return record !== undefined ? toReadonlyRecord(record) : undefined;
}

function getHistoryImpl(state: ManagerState, entityId: string): LifecycleHistory | undefined {
  const record = state.records.get(entityId);
  if (record === undefined) return undefined;
  const transitions = state.history.get(entityId) ?? [];
  return {
    entityId,
    transitions: [...transitions],
    currentPhase: record.phase,
  };
}

function queryByPhaseImpl(state: ManagerState, phase: LifecyclePhase): ReadonlyArray<string> {
  const result: string[] = [];
  for (const [entityId, record] of state.records) {
    if (record.phase === phase) {
      result.push(entityId);
    }
  }
  return result;
}

function untrackImpl(state: ManagerState, entityId: string): boolean {
  const deleted = state.records.delete(entityId);
  state.history.delete(entityId);
  return deleted;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: ManagerState): LifecycleStats {
  let activeCount = 0;
  let dormantCount = 0;
  let suspendedCount = 0;
  let migratingCount = 0;
  let archivedCount = 0;

  for (const record of state.records.values()) {
    switch (record.phase) {
      case 'active':
        activeCount++;
        break;
      case 'dormant':
        dormantCount++;
        break;
      case 'suspended':
        suspendedCount++;
        break;
      case 'migrating':
        migratingCount++;
        break;
      case 'archived':
        archivedCount++;
        break;
    }
  }

  return {
    trackedCount: state.records.size,
    activeCount,
    dormantCount,
    suspendedCount,
    migratingCount,
    archivedCount,
    totalTransitions: state.totalTransitions,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function toReadonlyRecord(record: MutableRecord): LifecycleRecord {
  return {
    entityId: record.entityId,
    phase: record.phase,
    enteredAt: record.enteredAt,
    reason: record.reason,
    metadata: { ...record.metadata },
  };
}
