/**
 * faction-balance-engine.ts ΓÇö Assembly seat balance and political moment tracking.
 *
 * Tracks how power shifts between the Concord factions over in-game time.
 * Player actions surface as BalanceShiftEvents that move seats between factions.
 * Coalition detection determines the current governing majority (if any).
 *
 * The Assembly requires 200 seats for a governing majority (simple).
 * Constitutional motions require 260 seats.
 */

import {
  type ConcordFactionId,
  ALL_CONCORD_FACTIONS,
  getAllFactionPlatforms,
} from './concord-factions.js';

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type PoliticalMoment =
  | 'STABLE'
  | 'FRAGILE'
  | 'CONTESTED'
  | 'CONSTITUTIONAL_CRISIS'
  | 'ASCENDANCY_CRISIS';

export type BalanceShiftEventType =
  | 'FOUNDING_WOUND_REVEALED'
  | 'FOUNDING_WOUND_RESOLVED'
  | 'ASCENDANCY_ATTACK'
  | 'LATTICE_DEGRADATION_CONFIRMED'
  | 'DYNASTY_DEFECTION'
  | 'ELECTION_CYCLE'
  | 'SCANDAL'
  | 'GREAT_DEBATE';

export interface BalanceShiftEvent {
  readonly type: BalanceShiftEventType;
  readonly triggeringDynastyId?: string;
  readonly description: string;
  readonly inGameYear: number;
}

export interface FactionBalance {
  readonly timestamp: string;
  readonly inGameYear: number;
  readonly seats: Readonly<Record<ConcordFactionId, number>>;
  readonly totalSeats: number;
  readonly dominantFaction: ConcordFactionId;
  readonly hasGoverningCoalition: boolean;
  readonly coalitionMembers?: readonly ConcordFactionId[];
  readonly politicalMoment: PoliticalMoment;
}

export interface FactionBalanceDeps {
  readonly clock: { nowIso(): string };
}

export interface FactionBalanceEngine {
  readonly getCurrentBalance: () => FactionBalance;
  readonly projectBalance: (inGameYearsForward: number) => FactionBalance;
  readonly dynastyJoinsCoalition: (dynastyId: string, faction: ConcordFactionId) => FactionBalance;
  readonly applyEventShift: (event: BalanceShiftEvent) => FactionBalance;
  readonly getCoalitionHistory: () => readonly FactionBalance[];
}

// ΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const SIMPLE_MAJORITY = 200;
const CONSTITUTIONAL_MAJORITY = 260;
const FRAGILE_MARGIN = 5;

const SEAT_SHIFTS: Readonly<
  Record<BalanceShiftEventType, Partial<Record<ConcordFactionId, number>>>
> = {
  FOUNDING_WOUND_REVEALED: { RETURNIST: 4, CONTINUATIONIST: -2, FOUNDING_FAMILIES: -2 },
  FOUNDING_WOUND_RESOLVED: { RETURNIST: -3, CONTINUATIONIST: 2, ASSEMBLY_NEUTRAL: 1 },
  ASCENDANCY_ATTACK: { CONTINUATIONIST: 5, RETURNIST: -3, LATTICE_COVENANT: -1, ASCENDANCY: -1 },
  LATTICE_DEGRADATION_CONFIRMED: {
    LATTICE_COVENANT: 8,
    CONTINUATIONIST: -3,
    RETURNIST: -2,
    ASSEMBLY_NEUTRAL: -3,
  },
  DYNASTY_DEFECTION: { ASSEMBLY_NEUTRAL: 2, CONTINUATIONIST: -1, RETURNIST: -1 },
  ELECTION_CYCLE: { RETURNIST: 3, LATTICE_COVENANT: 2, CONTINUATIONIST: -3, ASSEMBLY_NEUTRAL: -2 },
  SCANDAL: { ASSEMBLY_NEUTRAL: 4, FOUNDING_FAMILIES: -3, CONTINUATIONIST: -1 },
  GREAT_DEBATE: { RETURNIST: 2, LATTICE_COVENANT: 2, CONTINUATIONIST: -2, ASSEMBLY_NEUTRAL: -2 },
};

// ΓöÇΓöÇ State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface MutableBalance {
  seats: Record<ConcordFactionId, number>;
  inGameYear: number;
}

interface EngineState {
  readonly deps: FactionBalanceDeps;
  current: MutableBalance;
  readonly history: FactionBalance[];
}

// ΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createFactionBalanceEngine(deps: FactionBalanceDeps): FactionBalanceEngine {
  const initialSeats = buildInitialSeats();
  const state: EngineState = {
    deps,
    current: { seats: initialSeats, inGameYear: 1 },
    history: [],
  };

  return {
    getCurrentBalance: () => buildBalance(state),
    projectBalance: (years) => projectBalanceImpl(state, years),
    dynastyJoinsCoalition: (dynastyId, faction) =>
      dynastyJoinsCoalitionImpl(state, dynastyId, faction),
    applyEventShift: (event) => applyEventShiftImpl(state, event),
    getCoalitionHistory: () => [...state.history],
  };
}

function buildInitialSeats(): Record<ConcordFactionId, number> {
  const seats: Partial<Record<ConcordFactionId, number>> = {};
  for (const platform of getAllFactionPlatforms()) {
    seats[platform.factionId] = platform.currentAssemblySeats;
  }
  return seats as Record<ConcordFactionId, number>;
}

// ΓöÇΓöÇ Balance Builder ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function buildBalance(state: EngineState): FactionBalance {
  const seats = { ...state.current.seats };
  const totalSeats = countTotalSeats(seats);
  const dominantFaction = findDominantFaction(seats);
  const coalition = detectCoalition(seats);

  return {
    timestamp: state.deps.clock.nowIso(),
    inGameYear: state.current.inGameYear,
    seats,
    totalSeats,
    dominantFaction,
    hasGoverningCoalition: coalition !== null,
    coalitionMembers: coalition ?? undefined,
    politicalMoment: detectPoliticalMoment(seats, coalition),
  };
}

function countTotalSeats(seats: Record<ConcordFactionId, number>): number {
  return ALL_CONCORD_FACTIONS.reduce((sum, id) => sum + seats[id], 0);
}

function findDominantFaction(seats: Record<ConcordFactionId, number>): ConcordFactionId {
  let dominant: ConcordFactionId = 'ASSEMBLY_NEUTRAL';
  let max = -1;
  for (const id of ALL_CONCORD_FACTIONS) {
    if (seats[id] > max) {
      max = seats[id];
      dominant = id;
    }
  }
  return dominant;
}

function detectCoalition(
  seats: Record<ConcordFactionId, number>,
): readonly ConcordFactionId[] | null {
  const sorted = [...ALL_CONCORD_FACTIONS].sort((a, b) => seats[b] - seats[a]);
  let running = 0;
  const members: ConcordFactionId[] = [];

  for (const id of sorted) {
    running += seats[id];
    members.push(id);
    if (running >= SIMPLE_MAJORITY) return members;
  }
  return null;
}

function detectPoliticalMoment(
  seats: Record<ConcordFactionId, number>,
  coalition: readonly ConcordFactionId[] | null,
): PoliticalMoment {
  if (isAscendancyCrisis(seats)) return 'ASCENDANCY_CRISIS';
  if (isConstitutionalCrisis(seats)) return 'CONSTITUTIONAL_CRISIS';
  if (coalition === null) return 'CONTESTED';
  if (isCoalitionFragile(seats, coalition)) return 'FRAGILE';
  return 'STABLE';
}

function isAscendancyCrisis(seats: Record<ConcordFactionId, number>): boolean {
  return seats['ASCENDANCY'] >= 60;
}

function isConstitutionalCrisis(seats: Record<ConcordFactionId, number>): boolean {
  // Constitutional crisis: opposition bloc is large enough to block a constitutional majority
  // and there is no plausible governing super-majority
  const returnistAndCovenant = seats['RETURNIST'] + seats['LATTICE_COVENANT'];
  return returnistAndCovenant >= CONSTITUTIONAL_MAJORITY;
}

function isCoalitionFragile(
  seats: Record<ConcordFactionId, number>,
  coalition: readonly ConcordFactionId[],
): boolean {
  const coalitionSeats = coalition.reduce((sum, id) => sum + seats[id], 0);
  return coalitionSeats < SIMPLE_MAJORITY + FRAGILE_MARGIN;
}

// ΓöÇΓöÇ Operations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function applyEventShiftImpl(state: EngineState, event: BalanceShiftEvent): FactionBalance {
  const shifts = SEAT_SHIFTS[event.type];
  applyShifts(state.current.seats, shifts);
  clampSeats(state.current.seats);
  state.current.inGameYear = event.inGameYear;
  const balance = buildBalance(state);
  state.history.push(balance);
  return balance;
}

function applyShifts(
  seats: Record<ConcordFactionId, number>,
  shifts: Partial<Record<ConcordFactionId, number>>,
): void {
  for (const id of ALL_CONCORD_FACTIONS) {
    const delta = shifts[id] ?? 0;
    seats[id] = seats[id] + delta;
  }
}

function clampSeats(seats: Record<ConcordFactionId, number>): void {
  for (const id of ALL_CONCORD_FACTIONS) {
    if (seats[id] < 0) seats[id] = 0;
  }
}

function dynastyJoinsCoalitionImpl(
  state: EngineState,
  _dynastyId: string,
  faction: ConcordFactionId,
): FactionBalance {
  state.current.seats[faction] += 1;
  const balance = buildBalance(state);
  state.history.push(balance);
  return balance;
}

// ΓöÇΓöÇ Projection ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function projectBalanceImpl(state: EngineState, yearsForward: number): FactionBalance {
  const projectedSeats = buildProjectedSeats(state.current.seats, yearsForward);
  const coalition = detectCoalition(projectedSeats);
  const totalSeats = countTotalSeats(projectedSeats);

  return {
    timestamp: state.deps.clock.nowIso(),
    inGameYear: state.current.inGameYear + yearsForward,
    seats: projectedSeats,
    totalSeats,
    dominantFaction: findDominantFaction(projectedSeats),
    hasGoverningCoalition: coalition !== null,
    coalitionMembers: coalition ?? undefined,
    politicalMoment: detectPoliticalMoment(projectedSeats, coalition),
  };
}

function buildProjectedSeats(
  current: Record<ConcordFactionId, number>,
  yearsForward: number,
): Record<ConcordFactionId, number> {
  const platforms = getAllFactionPlatforms();
  const projected: Record<ConcordFactionId, number> = { ...current };

  for (const platform of platforms) {
    const yearDiff = 105 - 1;
    if (yearDiff <= 0) continue;
    const seatDiff = platform.assemblySeatsYear105 - platform.currentAssemblySeats;
    const rate = seatDiff / yearDiff;
    const change = Math.round(rate * Math.min(yearsForward, yearDiff));
    projected[platform.factionId] = Math.max(0, current[platform.factionId] + change);
  }

  return projected;
}
