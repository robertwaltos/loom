/**
 * Dynasty Continuity — Lifecycle state machine for dynasty legacy protocols.
 *
 * Bible v1.1 Part 8, v1.4: Legacy Protocols & Inheritance
 *
 * 10 continuity states with strict transition rules:
 *   ACTIVE → DORMANT_30 → DORMANT_60 → GRACE_WINDOW → CONTINUITY_TRIGGERED
 *   → REDISTRIBUTION → COMPLETED
 *   Any state → VIGIL (real-world death documented)
 *   COMPLETED → HEIR_ACTIVATED | LEGACY_NPC
 *
 * "Before implementing any mechanic that touches inactive dynasties, ask:
 *  what does this do to the player who logged in once a month to write one
 *  Chronicle entry for someone they lost?"
 */

import type { SubscriptionTier } from './dynasty.js';
import {
  continuityRecordNotFound,
  continuityRecordAlreadyExists,
  continuityInvalidTransition,
  heirNotRegistered,
  continuityTerminalState,
} from './kalon-errors.js';

// ─── Types ───────────────────────────────────────────────────────────

export type ContinuityState =
  | 'active'
  | 'dormant_30'
  | 'dormant_60'
  | 'grace_window'
  | 'continuity_triggered'
  | 'redistribution'
  | 'completed'
  | 'vigil'
  | 'heir_activated'
  | 'legacy_npc';

export interface ContinuityRecord {
  readonly dynastyId: string;
  readonly state: ContinuityState;
  readonly stateEnteredAt: number;
  readonly lastLoginAt: number;
  readonly subscriptionTier: SubscriptionTier;
  readonly heirDynastyIds: ReadonlyArray<string>;
  readonly completedAt: number | null;
  readonly vigilSince: number | null;
  readonly activatingHeirId: string | null;
}

export interface ContinuityTransition {
  readonly dynastyId: string;
  readonly from: ContinuityState;
  readonly to: ContinuityState;
  readonly at: number;
  readonly reason: string;
}

export interface ContinuityEngine {
  initializeRecord(dynastyId: string, tier: SubscriptionTier): ContinuityRecord;
  getRecord(dynastyId: string): ContinuityRecord;
  tryGetRecord(dynastyId: string): ContinuityRecord | undefined;
  recordLogin(dynastyId: string): ContinuityTransition | null;
  registerHeir(dynastyId: string, heirDynastyId: string): void;
  removeHeir(dynastyId: string, heirDynastyId: string): void;
  updateSubscriptionTier(dynastyId: string, tier: SubscriptionTier): void;
  evaluateInactivity(dynastyId: string): ContinuityTransition | null;
  evaluateAll(): ReadonlyArray<ContinuityTransition>;
  declareVigil(dynastyId: string): ContinuityTransition;
  activateHeir(completedDynastyId: string, heirDynastyId: string): ContinuityTransition;
  convertToLegacyNpc(dynastyId: string): ContinuityTransition;
  completeRedistribution(dynastyId: string): ContinuityTransition;
  listByState(state: ContinuityState): ReadonlyArray<ContinuityRecord>;
  daysUntilNextTransition(dynastyId: string): number | null;
  count(): number;
}

// ─── Constants ───────────────────────────────────────────────────────

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;

const DORMANCY_30_DAYS = 30;
const DORMANCY_60_DAYS = 60;
const MINIMUM_CONTINUITY_DAYS = 91;
const HARD_DEADLINE_DAYS = 180;
const HEIR_CLAIM_WINDOW_DAYS = 730;

const TIER_GRACE_DAYS: Readonly<Record<SubscriptionTier, number>> = {
  free: 0,
  accord: 30,
  patron: 60,
  herald: 90,
};

const RECOVERABLE_STATES: ReadonlySet<ContinuityState> = new Set([
  'dormant_30',
  'dormant_60',
  'grace_window',
  'continuity_triggered',
]);

const TERMINAL_STATES: ReadonlySet<ContinuityState> = new Set([
  'vigil',
  'heir_activated',
  'legacy_npc',
]);

const VIGIL_BLOCKED_STATES: ReadonlySet<ContinuityState> = new Set([
  'completed',
  'vigil',
  'heir_activated',
  'legacy_npc',
]);

// ─── State ───────────────────────────────────────────────────────────

interface MutableRecord {
  readonly dynastyId: string;
  state: ContinuityState;
  stateEnteredAt: number;
  lastLoginAt: number;
  subscriptionTier: SubscriptionTier;
  heirDynastyIds: string[];
  completedAt: number | null;
  vigilSince: number | null;
  activatingHeirId: string | null;
}

interface EngineState {
  readonly records: Map<string, MutableRecord>;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createContinuityEngine(deps: {
  readonly clock: { nowMicroseconds(): number };
}): ContinuityEngine {
  const state: EngineState = {
    records: new Map(),
    clock: deps.clock,
  };

  return {
    initializeRecord: (id, tier) => initializeRecordImpl(state, id, tier),
    getRecord: (id) => getRecordImpl(state, id),
    tryGetRecord: (id) => tryGetRecordImpl(state, id),
    recordLogin: (id) => recordLoginImpl(state, id),
    registerHeir: (id, heirId) => { registerHeirImpl(state, id, heirId); },
    removeHeir: (id, heirId) => { removeHeirImpl(state, id, heirId); },
    updateSubscriptionTier: (id, tier) => { updateTierImpl(state, id, tier); },
    evaluateInactivity: (id) => evaluateInactivityImpl(state, id),
    evaluateAll: () => evaluateAllImpl(state),
    declareVigil: (id) => declareVigilImpl(state, id),
    activateHeir: (id, heirId) => activateHeirImpl(state, id, heirId),
    convertToLegacyNpc: (id) => convertToLegacyNpcImpl(state, id),
    completeRedistribution: (id) => completeRedistributionImpl(state, id),
    listByState: (s) => listByStateImpl(state, s),
    daysUntilNextTransition: (id) => daysUntilNextTransitionImpl(state, id),
    count: () => state.records.size,
  };
}

// ─── Record Lifecycle ────────────────────────────────────────────────

function initializeRecordImpl(
  state: EngineState,
  dynastyId: string,
  tier: SubscriptionTier,
): ContinuityRecord {
  if (state.records.has(dynastyId)) {
    throw continuityRecordAlreadyExists(dynastyId);
  }
  const now = state.clock.nowMicroseconds();
  const record: MutableRecord = {
    dynastyId,
    state: 'active',
    stateEnteredAt: now,
    lastLoginAt: now,
    subscriptionTier: tier,
    heirDynastyIds: [],
    completedAt: null,
    vigilSince: null,
    activatingHeirId: null,
  };
  state.records.set(dynastyId, record);
  return toReadonly(record);
}

function getRecordImpl(state: EngineState, dynastyId: string): ContinuityRecord {
  const record = state.records.get(dynastyId);
  if (!record) throw continuityRecordNotFound(dynastyId);
  return toReadonly(record);
}

function tryGetRecordImpl(
  state: EngineState,
  dynastyId: string,
): ContinuityRecord | undefined {
  const record = state.records.get(dynastyId);
  return record ? toReadonly(record) : undefined;
}

// ─── Player Actions ──────────────────────────────────────────────────

function recordLoginImpl(
  state: EngineState,
  dynastyId: string,
): ContinuityTransition | null {
  const record = getMutableRecord(state, dynastyId);
  const now = state.clock.nowMicroseconds();
  record.lastLoginAt = now;

  if (!RECOVERABLE_STATES.has(record.state)) return null;

  return applyTransition(record, 'active', now, 'Player logged in during recovery window');
}

function registerHeirImpl(
  state: EngineState,
  dynastyId: string,
  heirDynastyId: string,
): void {
  const record = getMutableRecord(state, dynastyId);
  if (!record.heirDynastyIds.includes(heirDynastyId)) {
    record.heirDynastyIds.push(heirDynastyId);
  }
}

function removeHeirImpl(
  state: EngineState,
  dynastyId: string,
  heirDynastyId: string,
): void {
  const record = getMutableRecord(state, dynastyId);
  record.heirDynastyIds = record.heirDynastyIds.filter((id) => id !== heirDynastyId);
}

function updateTierImpl(
  state: EngineState,
  dynastyId: string,
  tier: SubscriptionTier,
): void {
  getMutableRecord(state, dynastyId).subscriptionTier = tier;
}

// ─── Inactivity Evaluation ──────────────────────────────────────────

function evaluateInactivityImpl(
  state: EngineState,
  dynastyId: string,
): ContinuityTransition | null {
  const record = getMutableRecord(state, dynastyId);
  const now = state.clock.nowMicroseconds();
  return evaluateSingleRecord(record, now);
}

function evaluateAllImpl(
  state: EngineState,
): ReadonlyArray<ContinuityTransition> {
  const transitions: ContinuityTransition[] = [];
  const now = state.clock.nowMicroseconds();
  for (const record of state.records.values()) {
    if (TERMINAL_STATES.has(record.state)) continue;
    const transition = evaluateSingleRecord(record, now);
    if (transition) transitions.push(transition);
  }
  return transitions;
}

function evaluateSingleRecord(
  record: MutableRecord,
  now: number,
): ContinuityTransition | null {
  if (record.state === 'completed') {
    return evaluateHeirWindow(record, now);
  }
  if (record.state === 'redistribution') return null;
  const inactiveDays = daysSince(record.lastLoginAt, now);
  return evaluateStateTransition(record, inactiveDays, now);
}

function evaluateStateTransition(
  record: MutableRecord,
  inactiveDays: number,
  now: number,
): ContinuityTransition | null {
  switch (record.state) {
    case 'active':
      return transitionIf(record, inactiveDays >= DORMANCY_30_DAYS,
        'dormant_30', now, 'Inactive for 30 days');

    case 'dormant_30':
      return transitionIf(record, inactiveDays >= DORMANCY_60_DAYS,
        'dormant_60', now, 'Inactive for 60 days — Assembly notified');

    case 'dormant_60':
      return evaluateDormant60(record, inactiveDays, now);

    case 'grace_window':
      return evaluateGraceWindow(record, inactiveDays, now);

    case 'continuity_triggered':
      return transitionIf(record, inactiveDays >= HARD_DEADLINE_DAYS,
        'redistribution', now, 'Day 180 — redistribution begins');

    default:
      return null;
  }
}

function evaluateDormant60(
  record: MutableRecord,
  inactiveDays: number,
  now: number,
): ContinuityTransition | null {
  if (hasGraceWindow(record.subscriptionTier)) {
    return applyTransition(record, 'grace_window', now,
      `Grace window opened (${String(TIER_GRACE_DAYS[record.subscriptionTier])} days)`);
  }
  return transitionIf(record, inactiveDays >= MINIMUM_CONTINUITY_DAYS,
    'continuity_triggered', now, 'Day 91 — continuity triggered (free tier)');
}

function evaluateGraceWindow(
  record: MutableRecord,
  inactiveDays: number,
  now: number,
): ContinuityTransition | null {
  const threshold = continuityThresholdDays(record.subscriptionTier);
  return transitionIf(record, inactiveDays >= threshold,
    'continuity_triggered', now, `Day ${String(threshold)} — continuity triggered`);
}

function evaluateHeirWindow(
  record: MutableRecord,
  now: number,
): ContinuityTransition | null {
  if (record.completedAt === null) return null;
  const elapsed = daysSince(record.completedAt, now);
  if (elapsed < HEIR_CLAIM_WINDOW_DAYS) return null;
  return applyTransition(record, 'legacy_npc', now,
    'No heir claimed within 2 years — Legacy NPC');
}

// ─── Special Transitions ────────────────────────────────────────────

function declareVigilImpl(
  state: EngineState,
  dynastyId: string,
): ContinuityTransition {
  const record = getMutableRecord(state, dynastyId);
  if (VIGIL_BLOCKED_STATES.has(record.state)) {
    throw continuityTerminalState(dynastyId, record.state);
  }
  const now = state.clock.nowMicroseconds();
  record.vigilSince = now;
  return applyTransition(record, 'vigil', now,
    'Real-world death documented — dynasty enters the Vigil');
}

function activateHeirImpl(
  state: EngineState,
  completedDynastyId: string,
  heirDynastyId: string,
): ContinuityTransition {
  const record = getMutableRecord(state, completedDynastyId);
  assertState(record, 'completed', 'heir_activated');
  if (!record.heirDynastyIds.includes(heirDynastyId)) {
    throw heirNotRegistered(completedDynastyId, heirDynastyId);
  }
  const now = state.clock.nowMicroseconds();
  record.activatingHeirId = heirDynastyId;
  return applyTransition(record, 'heir_activated', now,
    `Heir ${heirDynastyId} activated`);
}

function convertToLegacyNpcImpl(
  state: EngineState,
  dynastyId: string,
): ContinuityTransition {
  const record = getMutableRecord(state, dynastyId);
  assertState(record, 'completed', 'legacy_npc');
  const now = state.clock.nowMicroseconds();
  return applyTransition(record, 'legacy_npc', now,
    'Dynasty converted to Legacy NPC');
}

function completeRedistributionImpl(
  state: EngineState,
  dynastyId: string,
): ContinuityTransition {
  const record = getMutableRecord(state, dynastyId);
  assertState(record, 'redistribution', 'completed');
  const now = state.clock.nowMicroseconds();
  record.completedAt = now;
  return applyTransition(record, 'completed', now,
    'Estate dispersal complete — dynasty completed');
}

// ─── Queries ─────────────────────────────────────────────────────────

function listByStateImpl(
  state: EngineState,
  targetState: ContinuityState,
): ReadonlyArray<ContinuityRecord> {
  const result: ContinuityRecord[] = [];
  for (const record of state.records.values()) {
    if (record.state === targetState) result.push(toReadonly(record));
  }
  return result;
}

function daysUntilNextTransitionImpl(
  state: EngineState,
  dynastyId: string,
): number | null {
  const record = getMutableRecord(state, dynastyId);
  const now = state.clock.nowMicroseconds();
  const inactiveDays = daysSince(record.lastLoginAt, now);
  return daysUntilForState(record, inactiveDays, now);
}

function daysUntilForState(
  record: MutableRecord,
  inactiveDays: number,
  now: number,
): number | null {
  switch (record.state) {
    case 'active':
      return DORMANCY_30_DAYS - inactiveDays;
    case 'dormant_30':
      return DORMANCY_60_DAYS - inactiveDays;
    case 'dormant_60':
      if (hasGraceWindow(record.subscriptionTier)) return 0;
      return Math.max(0, MINIMUM_CONTINUITY_DAYS - inactiveDays);
    case 'grace_window':
      return Math.max(0, continuityThresholdDays(record.subscriptionTier) - inactiveDays);
    case 'continuity_triggered':
      return Math.max(0, HARD_DEADLINE_DAYS - inactiveDays);
    case 'completed':
      return daysUntilHeirExpiry(record, now);
    default:
      return null;
  }
}

function daysUntilHeirExpiry(record: MutableRecord, now: number): number | null {
  if (record.completedAt === null) return null;
  return Math.max(0, HEIR_CLAIM_WINDOW_DAYS - daysSince(record.completedAt, now));
}

// ─── Helpers ─────────────────────────────────────────────────────────

function applyTransition(
  record: MutableRecord,
  to: ContinuityState,
  at: number,
  reason: string,
): ContinuityTransition {
  const from = record.state;
  record.state = to;
  record.stateEnteredAt = at;
  return { dynastyId: record.dynastyId, from, to, at, reason };
}

function transitionIf(
  record: MutableRecord,
  condition: boolean,
  to: ContinuityState,
  at: number,
  reason: string,
): ContinuityTransition | null {
  return condition ? applyTransition(record, to, at, reason) : null;
}

function assertState(
  record: MutableRecord,
  expected: ContinuityState,
  target: ContinuityState,
): void {
  if (record.state !== expected) {
    throw continuityInvalidTransition(record.dynastyId, record.state, target);
  }
}

function getMutableRecord(state: EngineState, dynastyId: string): MutableRecord {
  const record = state.records.get(dynastyId);
  if (!record) throw continuityRecordNotFound(dynastyId);
  return record;
}

function toReadonly(record: MutableRecord): ContinuityRecord {
  return {
    dynastyId: record.dynastyId,
    state: record.state,
    stateEnteredAt: record.stateEnteredAt,
    lastLoginAt: record.lastLoginAt,
    subscriptionTier: record.subscriptionTier,
    heirDynastyIds: [...record.heirDynastyIds],
    completedAt: record.completedAt,
    vigilSince: record.vigilSince,
    activatingHeirId: record.activatingHeirId,
  };
}

function daysSince(fromMicroseconds: number, toMicroseconds: number): number {
  return Math.floor((toMicroseconds - fromMicroseconds) / US_PER_DAY);
}

function continuityThresholdDays(tier: SubscriptionTier): number {
  return Math.max(DORMANCY_60_DAYS + TIER_GRACE_DAYS[tier], MINIMUM_CONTINUITY_DAYS);
}

function hasGraceWindow(tier: SubscriptionTier): boolean {
  return TIER_GRACE_DAYS[tier] > 0;
}
