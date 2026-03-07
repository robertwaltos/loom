/**
 * Dynasty Mortality — Lifecycle state machine for dynasty death and inheritance.
 *
 * Bible v1.1 Part 8: Digital Mortality & Inheritance
 * Bible v1.2: Day 91 protection, Memorial Dynasty filter
 *
 * 10 mortality states with strict transition rules:
 *   ACTIVE → DORMANT_30 → DORMANT_60 → GRACE_WINDOW → MORTALITY_TRIGGERED
 *   → REDISTRIBUTION → DECEASED
 *   Any state → IN_ABEYANCE (real-world death documented)
 *   DECEASED → HEIR_ACTIVATED | LEGACY_NPC
 *
 * "Before implementing any mechanic that touches inactive dynasties, ask:
 *  what does this do to the player who logged in once a month to add one
 *  Remembrance entry for someone they lost?"
 */

import type { SubscriptionTier } from './dynasty.js';
import {
  mortalityRecordNotFound,
  mortalityRecordAlreadyExists,
  mortalityInvalidTransition,
  heirNotRegistered,
  mortalityTerminalState,
} from './kalon-errors.js';

// ─── Types ───────────────────────────────────────────────────────────

export type MortalityState =
  | 'active'
  | 'dormant_30'
  | 'dormant_60'
  | 'grace_window'
  | 'mortality_triggered'
  | 'redistribution'
  | 'deceased'
  | 'in_abeyance'
  | 'heir_activated'
  | 'legacy_npc';

export interface MortalityRecord {
  readonly dynastyId: string;
  readonly state: MortalityState;
  readonly stateEnteredAt: number;
  readonly lastLoginAt: number;
  readonly subscriptionTier: SubscriptionTier;
  readonly heirDynastyIds: ReadonlyArray<string>;
  readonly deceasedAt: number | null;
  readonly inAbeyanceSince: number | null;
  readonly activatingHeirId: string | null;
}

export interface MortalityTransition {
  readonly dynastyId: string;
  readonly from: MortalityState;
  readonly to: MortalityState;
  readonly at: number;
  readonly reason: string;
}

export interface MortalityEngine {
  initializeRecord(dynastyId: string, tier: SubscriptionTier): MortalityRecord;
  getRecord(dynastyId: string): MortalityRecord;
  tryGetRecord(dynastyId: string): MortalityRecord | undefined;
  recordLogin(dynastyId: string): MortalityTransition | null;
  registerHeir(dynastyId: string, heirDynastyId: string): void;
  removeHeir(dynastyId: string, heirDynastyId: string): void;
  updateSubscriptionTier(dynastyId: string, tier: SubscriptionTier): void;
  evaluateInactivity(dynastyId: string): MortalityTransition | null;
  evaluateAll(): ReadonlyArray<MortalityTransition>;
  declareAbeyance(dynastyId: string): MortalityTransition;
  activateHeir(deceasedDynastyId: string, heirDynastyId: string): MortalityTransition;
  convertToLegacyNpc(dynastyId: string): MortalityTransition;
  completeRedistribution(dynastyId: string): MortalityTransition;
  listByState(state: MortalityState): ReadonlyArray<MortalityRecord>;
  daysUntilNextTransition(dynastyId: string): number | null;
  count(): number;
}

// ─── Constants ───────────────────────────────────────────────────────

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;

const DORMANCY_30_DAYS = 30;
const DORMANCY_60_DAYS = 60;
const MINIMUM_MORTALITY_DAYS = 91;
const HARD_DEADLINE_DAYS = 180;
const HEIR_CLAIM_WINDOW_DAYS = 730;

const TIER_GRACE_DAYS: Readonly<Record<SubscriptionTier, number>> = {
  free: 0,
  accord: 30,
  patron: 60,
  herald: 90,
};

const RECOVERABLE_STATES: ReadonlySet<MortalityState> = new Set([
  'dormant_30',
  'dormant_60',
  'grace_window',
  'mortality_triggered',
]);

const TERMINAL_STATES: ReadonlySet<MortalityState> = new Set([
  'in_abeyance',
  'heir_activated',
  'legacy_npc',
]);

const ABEYANCE_BLOCKED_STATES: ReadonlySet<MortalityState> = new Set([
  'deceased',
  'in_abeyance',
  'heir_activated',
  'legacy_npc',
]);

// ─── State ───────────────────────────────────────────────────────────

interface MutableRecord {
  readonly dynastyId: string;
  state: MortalityState;
  stateEnteredAt: number;
  lastLoginAt: number;
  subscriptionTier: SubscriptionTier;
  heirDynastyIds: string[];
  deceasedAt: number | null;
  inAbeyanceSince: number | null;
  activatingHeirId: string | null;
}

interface EngineState {
  readonly records: Map<string, MutableRecord>;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createMortalityEngine(deps: {
  readonly clock: { nowMicroseconds(): number };
}): MortalityEngine {
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
    declareAbeyance: (id) => declareAbeyanceImpl(state, id),
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
): MortalityRecord {
  if (state.records.has(dynastyId)) {
    throw mortalityRecordAlreadyExists(dynastyId);
  }
  const now = state.clock.nowMicroseconds();
  const record: MutableRecord = {
    dynastyId,
    state: 'active',
    stateEnteredAt: now,
    lastLoginAt: now,
    subscriptionTier: tier,
    heirDynastyIds: [],
    deceasedAt: null,
    inAbeyanceSince: null,
    activatingHeirId: null,
  };
  state.records.set(dynastyId, record);
  return toReadonly(record);
}

function getRecordImpl(state: EngineState, dynastyId: string): MortalityRecord {
  const record = state.records.get(dynastyId);
  if (!record) throw mortalityRecordNotFound(dynastyId);
  return toReadonly(record);
}

function tryGetRecordImpl(
  state: EngineState,
  dynastyId: string,
): MortalityRecord | undefined {
  const record = state.records.get(dynastyId);
  return record ? toReadonly(record) : undefined;
}

// ─── Player Actions ──────────────────────────────────────────────────

function recordLoginImpl(
  state: EngineState,
  dynastyId: string,
): MortalityTransition | null {
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
): MortalityTransition | null {
  const record = getMutableRecord(state, dynastyId);
  const now = state.clock.nowMicroseconds();
  return evaluateSingleRecord(record, now);
}

function evaluateAllImpl(
  state: EngineState,
): ReadonlyArray<MortalityTransition> {
  const transitions: MortalityTransition[] = [];
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
): MortalityTransition | null {
  if (record.state === 'deceased') {
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
): MortalityTransition | null {
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

    case 'mortality_triggered':
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
): MortalityTransition | null {
  if (hasGraceWindow(record.subscriptionTier)) {
    return applyTransition(record, 'grace_window', now,
      `Grace window opened (${String(TIER_GRACE_DAYS[record.subscriptionTier])} days)`);
  }
  return transitionIf(record, inactiveDays >= MINIMUM_MORTALITY_DAYS,
    'mortality_triggered', now, 'Day 91 — mortality triggered (free tier)');
}

function evaluateGraceWindow(
  record: MutableRecord,
  inactiveDays: number,
  now: number,
): MortalityTransition | null {
  const threshold = mortalityThresholdDays(record.subscriptionTier);
  return transitionIf(record, inactiveDays >= threshold,
    'mortality_triggered', now, `Day ${String(threshold)} — mortality triggered`);
}

function evaluateHeirWindow(
  record: MutableRecord,
  now: number,
): MortalityTransition | null {
  if (record.deceasedAt === null) return null;
  const elapsed = daysSince(record.deceasedAt, now);
  if (elapsed < HEIR_CLAIM_WINDOW_DAYS) return null;
  return applyTransition(record, 'legacy_npc', now,
    'No heir claimed within 2 years — Legacy NPC');
}

// ─── Special Transitions ────────────────────────────────────────────

function declareAbeyanceImpl(
  state: EngineState,
  dynastyId: string,
): MortalityTransition {
  const record = getMutableRecord(state, dynastyId);
  if (ABEYANCE_BLOCKED_STATES.has(record.state)) {
    throw mortalityTerminalState(dynastyId, record.state);
  }
  const now = state.clock.nowMicroseconds();
  record.inAbeyanceSince = now;
  return applyTransition(record, 'in_abeyance', now,
    'Real-world death documented — dynasty in abeyance');
}

function activateHeirImpl(
  state: EngineState,
  deceasedDynastyId: string,
  heirDynastyId: string,
): MortalityTransition {
  const record = getMutableRecord(state, deceasedDynastyId);
  assertState(record, 'deceased', 'heir_activated');
  if (!record.heirDynastyIds.includes(heirDynastyId)) {
    throw heirNotRegistered(deceasedDynastyId, heirDynastyId);
  }
  const now = state.clock.nowMicroseconds();
  record.activatingHeirId = heirDynastyId;
  return applyTransition(record, 'heir_activated', now,
    `Heir ${heirDynastyId} activated`);
}

function convertToLegacyNpcImpl(
  state: EngineState,
  dynastyId: string,
): MortalityTransition {
  const record = getMutableRecord(state, dynastyId);
  assertState(record, 'deceased', 'legacy_npc');
  const now = state.clock.nowMicroseconds();
  return applyTransition(record, 'legacy_npc', now,
    'Dynasty converted to Legacy NPC');
}

function completeRedistributionImpl(
  state: EngineState,
  dynastyId: string,
): MortalityTransition {
  const record = getMutableRecord(state, dynastyId);
  assertState(record, 'redistribution', 'deceased');
  const now = state.clock.nowMicroseconds();
  record.deceasedAt = now;
  return applyTransition(record, 'deceased', now,
    'Estate dispersal complete — dynasty deceased');
}

// ─── Queries ─────────────────────────────────────────────────────────

function listByStateImpl(
  state: EngineState,
  targetState: MortalityState,
): ReadonlyArray<MortalityRecord> {
  const result: MortalityRecord[] = [];
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
      return Math.max(0, MINIMUM_MORTALITY_DAYS - inactiveDays);
    case 'grace_window':
      return Math.max(0, mortalityThresholdDays(record.subscriptionTier) - inactiveDays);
    case 'mortality_triggered':
      return Math.max(0, HARD_DEADLINE_DAYS - inactiveDays);
    case 'deceased':
      return daysUntilHeirExpiry(record, now);
    default:
      return null;
  }
}

function daysUntilHeirExpiry(record: MutableRecord, now: number): number | null {
  if (record.deceasedAt === null) return null;
  return Math.max(0, HEIR_CLAIM_WINDOW_DAYS - daysSince(record.deceasedAt, now));
}

// ─── Helpers ─────────────────────────────────────────────────────────

function applyTransition(
  record: MutableRecord,
  to: MortalityState,
  at: number,
  reason: string,
): MortalityTransition {
  const from = record.state;
  record.state = to;
  record.stateEnteredAt = at;
  return { dynastyId: record.dynastyId, from, to, at, reason };
}

function transitionIf(
  record: MutableRecord,
  condition: boolean,
  to: MortalityState,
  at: number,
  reason: string,
): MortalityTransition | null {
  return condition ? applyTransition(record, to, at, reason) : null;
}

function assertState(
  record: MutableRecord,
  expected: MortalityState,
  target: MortalityState,
): void {
  if (record.state !== expected) {
    throw mortalityInvalidTransition(record.dynastyId, record.state, target);
  }
}

function getMutableRecord(state: EngineState, dynastyId: string): MutableRecord {
  const record = state.records.get(dynastyId);
  if (!record) throw mortalityRecordNotFound(dynastyId);
  return record;
}

function toReadonly(record: MutableRecord): MortalityRecord {
  return {
    dynastyId: record.dynastyId,
    state: record.state,
    stateEnteredAt: record.stateEnteredAt,
    lastLoginAt: record.lastLoginAt,
    subscriptionTier: record.subscriptionTier,
    heirDynastyIds: [...record.heirDynastyIds],
    deceasedAt: record.deceasedAt,
    inAbeyanceSince: record.inAbeyanceSince,
    activatingHeirId: record.activatingHeirId,
  };
}

function daysSince(fromMicroseconds: number, toMicroseconds: number): number {
  return Math.floor((toMicroseconds - fromMicroseconds) / US_PER_DAY);
}

function mortalityThresholdDays(tier: SubscriptionTier): number {
  return Math.max(DORMANCY_60_DAYS + TIER_GRACE_DAYS[tier], MINIMUM_MORTALITY_DAYS);
}

function hasGraceWindow(tier: SubscriptionTier): boolean {
  return TIER_GRACE_DAYS[tier] > 0;
}
