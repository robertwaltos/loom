/**
 * Dynasty Mortality — State machine for dynasty death lifecycle.
 *
 * Bible v1.1 Part 8: Dynasty mortality follows a strict state machine:
 *   ACTIVE → DORMANT → DECEASED
 *
 * Dormancy represents player inactivity. Subscription tiers grant grace
 * periods that delay the transition to DECEASED. The system tracks all
 * transitions with full audit history and emits notifications at each
 * state change.
 *
 * "Before implementing any mechanic that touches inactive dynasties, ask:
 *  what does this do to the player who logged in once a month to write one
 *  Chronicle entry for someone they lost?"
 */

// ─── Types ───────────────────────────────────────────────────────────

export type MortalityState = 'ACTIVE' | 'DORMANT' | 'DECEASED';

export interface GracePeriodStatus {
  readonly dynastyId: string;
  readonly startedAt: number;
  readonly durationUs: number;
  readonly expiresAt: number;
  readonly expired: boolean;
  readonly remainingUs: number;
}

export interface MortalityRecord {
  readonly dynastyId: string;
  readonly state: MortalityState;
  readonly registeredAt: number;
  readonly lastTransitionAt: number;
  readonly gracePeriod: GracePeriodStatus | null;
}

export interface MortalityTransition {
  readonly transitionId: string;
  readonly dynastyId: string;
  readonly from: MortalityState;
  readonly to: MortalityState;
  readonly at: number;
  readonly reason: string;
}

export interface MortalityEvent {
  readonly eventId: string;
  readonly dynastyId: string;
  readonly type: 'state_changed' | 'grace_started' | 'grace_expired' | 'grace_checked';
  readonly payload: Readonly<Record<string, string>>;
  readonly at: number;
}

export interface MortalityStats {
  readonly totalRegistered: number;
  readonly activeCount: number;
  readonly dormantCount: number;
  readonly deceasedCount: number;
  readonly totalTransitions: number;
  readonly totalGracePeriodsStarted: number;
}

// ─── Port Interfaces ─────────────────────────────────────────────────

export interface MortalityClockPort {
  readonly nowMicroseconds: () => number;
}

export interface MortalityIdGeneratorPort {
  readonly next: () => string;
}

export interface MortalityNotificationPort {
  readonly notify: (event: MortalityEvent) => void;
}

export interface MortalityDeps {
  readonly clock: MortalityClockPort;
  readonly idGenerator: MortalityIdGeneratorPort;
  readonly notifications: MortalityNotificationPort;
}

// ─── Constants ───────────────────────────────────────────────────────

/** Default grace period: 30 real days in microseconds */
export const GRACE_PERIOD_DEFAULT_US = 30 * 24 * 60 * 60 * 1_000_000;

/** Maximum dormancy before forced death: 180 real days in microseconds */
export const MAX_DORMANCY_DURATION_US = 180 * 24 * 60 * 60 * 1_000_000;

// ─── Public Interface ────────────────────────────────────────────────

export interface DynastyMortalityEngine {
  readonly registerDynasty: (dynastyId: string) => MortalityRecord;
  readonly setDormant: (dynastyId: string, reason: string) => MortalityTransition | string;
  readonly reactivate: (dynastyId: string) => MortalityTransition | string;
  readonly declareDeath: (dynastyId: string) => MortalityTransition | string;
  readonly startGracePeriod: (dynastyId: string, durationUs: number) => GracePeriodStatus | string;
  readonly checkGracePeriod: (dynastyId: string) => GracePeriodStatus | string;
  readonly getRecord: (dynastyId: string) => MortalityRecord | undefined;
  readonly listByState: (state: MortalityState) => readonly MortalityRecord[];
  readonly getTransitionHistory: (dynastyId: string) => readonly MortalityTransition[];
  readonly getStats: () => MortalityStats;
}

// ─── State ───────────────────────────────────────────────────────────

interface MutableGracePeriod {
  readonly dynastyId: string;
  readonly startedAt: number;
  readonly durationUs: number;
  readonly expiresAt: number;
}

interface MutableMortalityRecord {
  readonly dynastyId: string;
  state: MortalityState;
  readonly registeredAt: number;
  lastTransitionAt: number;
  gracePeriod: MutableGracePeriod | null;
}

interface EngineState {
  readonly deps: MortalityDeps;
  readonly records: Map<string, MutableMortalityRecord>;
  readonly transitions: Map<string, MortalityTransition[]>;
  totalTransitions: number;
  totalGracePeriodsStarted: number;
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createDynastyMortalityEngine(deps: MortalityDeps): DynastyMortalityEngine {
  const state: EngineState = {
    deps,
    records: new Map(),
    transitions: new Map(),
    totalTransitions: 0,
    totalGracePeriodsStarted: 0,
  };

  return {
    registerDynasty: (dynastyId) => registerDynastyImpl(state, dynastyId),
    setDormant: (dynastyId, reason) => setDormantImpl(state, dynastyId, reason),
    reactivate: (dynastyId) => reactivateImpl(state, dynastyId),
    declareDeath: (dynastyId) => declareDeathImpl(state, dynastyId),
    startGracePeriod: (dynastyId, durationUs) => startGracePeriodImpl(state, dynastyId, durationUs),
    checkGracePeriod: (dynastyId) => checkGracePeriodImpl(state, dynastyId),
    getRecord: (dynastyId) => getRecordImpl(state, dynastyId),
    listByState: (mortalityState) => listByStateImpl(state, mortalityState),
    getTransitionHistory: (dynastyId) => getTransitionHistoryImpl(state, dynastyId),
    getStats: () => getStatsImpl(state),
  };
}

// ─── Registration ────────────────────────────────────────────────────

function registerDynastyImpl(state: EngineState, dynastyId: string): MortalityRecord {
  const now = state.deps.clock.nowMicroseconds();
  const record: MutableMortalityRecord = {
    dynastyId,
    state: 'ACTIVE',
    registeredAt: now,
    lastTransitionAt: now,
    gracePeriod: null,
  };
  state.records.set(dynastyId, record);
  state.transitions.set(dynastyId, []);
  return toReadonlyRecord(record, now);
}

// ─── State Transitions ──────────────────────────────────────────────

function setDormantImpl(
  state: EngineState,
  dynastyId: string,
  reason: string,
): MortalityTransition | string {
  const record = state.records.get(dynastyId);
  if (record === undefined) return 'DYNASTY_NOT_FOUND';
  if (record.state !== 'ACTIVE') return 'INVALID_TRANSITION';
  return applyTransition(state, record, 'DORMANT', reason);
}

function reactivateImpl(state: EngineState, dynastyId: string): MortalityTransition | string {
  const record = state.records.get(dynastyId);
  if (record === undefined) return 'DYNASTY_NOT_FOUND';
  if (record.state !== 'DORMANT') return 'INVALID_TRANSITION';
  record.gracePeriod = null;
  return applyTransition(state, record, 'ACTIVE', 'Dynasty reactivated by owner');
}

function declareDeathImpl(state: EngineState, dynastyId: string): MortalityTransition | string {
  const record = state.records.get(dynastyId);
  if (record === undefined) return 'DYNASTY_NOT_FOUND';
  if (record.state === 'DECEASED') return 'INVALID_TRANSITION';
  record.gracePeriod = null;
  return applyTransition(state, record, 'DECEASED', 'Dynasty death declared');
}

// ─── Grace Period ───────────────────────────────────────────────────

function startGracePeriodImpl(
  state: EngineState,
  dynastyId: string,
  durationUs: number,
): GracePeriodStatus | string {
  const record = state.records.get(dynastyId);
  if (record === undefined) return 'DYNASTY_NOT_FOUND';
  if (record.state !== 'DORMANT') return 'INVALID_STATE';
  if (record.gracePeriod !== null) return 'GRACE_ALREADY_ACTIVE';

  const now = state.deps.clock.nowMicroseconds();
  const gracePeriod: MutableGracePeriod = {
    dynastyId,
    startedAt: now,
    durationUs,
    expiresAt: now + durationUs,
  };
  record.gracePeriod = gracePeriod;
  state.totalGracePeriodsStarted += 1;

  emitEvent(state, dynastyId, 'grace_started', {
    durationUs: String(durationUs),
    expiresAt: String(gracePeriod.expiresAt),
  });

  return toGracePeriodStatus(gracePeriod, now);
}

function checkGracePeriodImpl(state: EngineState, dynastyId: string): GracePeriodStatus | string {
  const record = state.records.get(dynastyId);
  if (record === undefined) return 'DYNASTY_NOT_FOUND';
  if (record.gracePeriod === null) return 'NO_GRACE_PERIOD';

  const now = state.deps.clock.nowMicroseconds();
  const graceStatus = toGracePeriodStatus(record.gracePeriod, now);

  if (graceStatus.expired) {
    emitEvent(state, dynastyId, 'grace_expired', {
      expiredAt: String(record.gracePeriod.expiresAt),
    });
  } else {
    emitEvent(state, dynastyId, 'grace_checked', {
      remainingUs: String(graceStatus.remainingUs),
    });
  }

  return graceStatus;
}

// ─── Queries ─────────────────────────────────────────────────────────

function getRecordImpl(state: EngineState, dynastyId: string): MortalityRecord | undefined {
  const record = state.records.get(dynastyId);
  if (record === undefined) return undefined;
  const now = state.deps.clock.nowMicroseconds();
  return toReadonlyRecord(record, now);
}

function listByStateImpl(
  state: EngineState,
  targetState: MortalityState,
): readonly MortalityRecord[] {
  const results: MortalityRecord[] = [];
  const now = state.deps.clock.nowMicroseconds();
  for (const record of state.records.values()) {
    if (record.state === targetState) {
      results.push(toReadonlyRecord(record, now));
    }
  }
  return results;
}

function getTransitionHistoryImpl(
  state: EngineState,
  dynastyId: string,
): readonly MortalityTransition[] {
  const history = state.transitions.get(dynastyId);
  if (history === undefined) return [];
  return [...history];
}

function getStatsImpl(state: EngineState): MortalityStats {
  let activeCount = 0;
  let dormantCount = 0;
  let deceasedCount = 0;

  for (const record of state.records.values()) {
    switch (record.state) {
      case 'ACTIVE':
        activeCount += 1;
        break;
      case 'DORMANT':
        dormantCount += 1;
        break;
      case 'DECEASED':
        deceasedCount += 1;
        break;
    }
  }

  return {
    totalRegistered: state.records.size,
    activeCount,
    dormantCount,
    deceasedCount,
    totalTransitions: state.totalTransitions,
    totalGracePeriodsStarted: state.totalGracePeriodsStarted,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function applyTransition(
  state: EngineState,
  record: MutableMortalityRecord,
  to: MortalityState,
  reason: string,
): MortalityTransition {
  const now = state.deps.clock.nowMicroseconds();
  const from = record.state;
  const transition: MortalityTransition = {
    transitionId: state.deps.idGenerator.next(),
    dynastyId: record.dynastyId,
    from,
    to,
    at: now,
    reason,
  };

  record.state = to;
  record.lastTransitionAt = now;
  state.totalTransitions += 1;

  const history = state.transitions.get(record.dynastyId);
  if (history !== undefined) {
    history.push(transition);
  }

  emitEvent(state, record.dynastyId, 'state_changed', {
    from,
    to,
    reason,
  });

  return transition;
}

function emitEvent(
  state: EngineState,
  dynastyId: string,
  type: MortalityEvent['type'],
  payload: Record<string, string>,
): void {
  const event: MortalityEvent = {
    eventId: state.deps.idGenerator.next(),
    dynastyId,
    type,
    payload,
    at: state.deps.clock.nowMicroseconds(),
  };
  state.deps.notifications.notify(event);
}

function toGracePeriodStatus(grace: MutableGracePeriod, now: number): GracePeriodStatus {
  const expired = now >= grace.expiresAt;
  const remainingUs = expired ? 0 : grace.expiresAt - now;
  return {
    dynastyId: grace.dynastyId,
    startedAt: grace.startedAt,
    durationUs: grace.durationUs,
    expiresAt: grace.expiresAt,
    expired,
    remainingUs,
  };
}

function toReadonlyRecord(record: MutableMortalityRecord, now: number): MortalityRecord {
  return {
    dynastyId: record.dynastyId,
    state: record.state,
    registeredAt: record.registeredAt,
    lastTransitionAt: record.lastTransitionAt,
    gracePeriod: record.gracePeriod !== null ? toGracePeriodStatus(record.gracePeriod, now) : null,
  };
}
