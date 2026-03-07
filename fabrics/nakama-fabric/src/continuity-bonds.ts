/**
 * Continuity Bonds — Resource earned through active play that allows dynasties
 * to recover from crisis states.
 *
 * Bible v1.4: base 3, cap 7, pre-crisis state return.
 *
 * When a dynasty enters a crisis state (dormant_30, dormant_60, grace_window,
 * continuity_triggered), spending a Continuity Bond moves them one step back
 * toward active. Bonds are earned through Chronicle entries, Lattice transits,
 * and governance participation.
 */

import type { ContinuityState } from './dynasty-continuity.js';
import {
  continuityRecordNotFound,
  continuityRecordAlreadyExists,
  continuityInvalidTransition,
} from './kalon-errors.js';

// ─── Types ───────────────────────────────────────────────────────────

export interface ContinuityBondRecord {
  readonly dynastyId: string;
  readonly bondCount: number;
  readonly maxBonds: number;
  readonly totalEarned: number;
  readonly totalSpent: number;
  readonly spendHistory: ReadonlyArray<BondSpend>;
}

export interface BondSpend {
  readonly at: number;
  readonly fromState: ContinuityState;
  readonly toState: ContinuityState;
}

export interface EarnBondsParams {
  readonly chronicleEntryCount: number;
  readonly worldTransitions: number;
  readonly governanceVotes: number;
}

export interface ContinuityBondEngine {
  initializeRecord(dynastyId: string): ContinuityBondRecord;
  getRecord(dynastyId: string): ContinuityBondRecord;
  tryGetRecord(dynastyId: string): ContinuityBondRecord | undefined;
  evaluateEarnings(dynastyId: string, params: EarnBondsParams): number;
  spendBond(dynastyId: string, currentState: ContinuityState): BondSpend;
  canSpend(dynastyId: string, currentState: ContinuityState): boolean;
  count(): number;
}

// ─── Constants ───────────────────────────────────────────────────────

export const BASE_BONDS = 3;
export const MAX_BONDS = 7;
export const CHRONICLE_ENTRIES_PER_BOND = 100;
export const MAX_GOVERNANCE_BOND_VOTES = 50;

const SPEND_TRANSITION_MAP: ReadonlyMap<ContinuityState, ContinuityState> = new Map([
  ['dormant_30', 'active'],
  ['dormant_60', 'dormant_30'],
  ['grace_window', 'dormant_60'],
  ['continuity_triggered', 'grace_window'],
]);

// ─── State ───────────────────────────────────────────────────────────

interface MutableBondRecord {
  readonly dynastyId: string;
  bondCount: number;
  totalEarned: number;
  totalSpent: number;
  spendHistory: BondSpend[];
}

interface BondEngineState {
  readonly records: Map<string, MutableBondRecord>;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createContinuityBondEngine(deps: {
  readonly clock: { nowMicroseconds(): number };
}): ContinuityBondEngine {
  const state: BondEngineState = {
    records: new Map(),
    clock: deps.clock,
  };

  return {
    initializeRecord: (id) => initializeRecordImpl(state, id),
    getRecord: (id) => getRecordImpl(state, id),
    tryGetRecord: (id) => tryGetRecordImpl(state, id),
    evaluateEarnings: (id, params) => evaluateEarningsImpl(state, id, params),
    spendBond: (id, currentState) => spendBondImpl(state, id, currentState),
    canSpend: (id, currentState) => canSpendImpl(state, id, currentState),
    count: () => state.records.size,
  };
}

// ─── Record Lifecycle ────────────────────────────────────────────────

function initializeRecordImpl(
  state: BondEngineState,
  dynastyId: string,
): ContinuityBondRecord {
  if (state.records.has(dynastyId)) {
    throw continuityRecordAlreadyExists(dynastyId);
  }
  const record: MutableBondRecord = {
    dynastyId,
    bondCount: BASE_BONDS,
    totalEarned: 0,
    totalSpent: 0,
    spendHistory: [],
  };
  state.records.set(dynastyId, record);
  return toReadonly(record);
}

function getRecordImpl(
  state: BondEngineState,
  dynastyId: string,
): ContinuityBondRecord {
  const record = state.records.get(dynastyId);
  if (!record) throw continuityRecordNotFound(dynastyId);
  return toReadonly(record);
}

function tryGetRecordImpl(
  state: BondEngineState,
  dynastyId: string,
): ContinuityBondRecord | undefined {
  const record = state.records.get(dynastyId);
  return record ? toReadonly(record) : undefined;
}

// ─── Earning ─────────────────────────────────────────────────────────

function calculateEarnedBonds(params: EarnBondsParams): number {
  const fromChronicle = Math.floor(params.chronicleEntryCount / CHRONICLE_ENTRIES_PER_BOND);
  const fromTransits = params.worldTransitions;
  const fromVotes = Math.min(params.governanceVotes, MAX_GOVERNANCE_BOND_VOTES);
  return fromChronicle + fromTransits + fromVotes;
}

function evaluateEarningsImpl(
  state: BondEngineState,
  dynastyId: string,
  params: EarnBondsParams,
): number {
  const record = getMutableRecord(state, dynastyId);
  const earned = calculateEarnedBonds(params);
  record.totalEarned = earned;
  record.bondCount = Math.min(BASE_BONDS + earned, MAX_BONDS);
  return record.bondCount;
}

// ─── Spending ────────────────────────────────────────────────────────

function canSpendImpl(
  state: BondEngineState,
  dynastyId: string,
  currentState: ContinuityState,
): boolean {
  const record = state.records.get(dynastyId);
  if (!record) return false;
  if (record.bondCount <= 0) return false;
  return SPEND_TRANSITION_MAP.has(currentState);
}

function spendBondImpl(
  state: BondEngineState,
  dynastyId: string,
  currentState: ContinuityState,
): BondSpend {
  const record = getMutableRecord(state, dynastyId);
  const toState = SPEND_TRANSITION_MAP.get(currentState);
  if (!toState || record.bondCount <= 0) {
    throw continuityInvalidTransition(dynastyId, currentState, 'bond_spend');
  }
  record.bondCount -= 1;
  record.totalSpent += 1;
  const spend: BondSpend = {
    at: state.clock.nowMicroseconds(),
    fromState: currentState,
    toState,
  };
  record.spendHistory.push(spend);
  return spend;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getMutableRecord(
  state: BondEngineState,
  dynastyId: string,
): MutableBondRecord {
  const record = state.records.get(dynastyId);
  if (!record) throw continuityRecordNotFound(dynastyId);
  return record;
}

function toReadonly(record: MutableBondRecord): ContinuityBondRecord {
  return {
    dynastyId: record.dynastyId,
    bondCount: record.bondCount,
    maxBonds: MAX_BONDS,
    totalEarned: record.totalEarned,
    totalSpent: record.totalSpent,
    spendHistory: [...record.spendHistory],
  };
}
