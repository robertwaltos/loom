/**
 * Matchmaking Engine — Dynasty grouping for co-operative activities.
 *
 * Dynasties submit tickets specifying activity type, skill range,
 * and world preference. The engine finds compatible matches and
 * forms groups once minimum party size is reached.
 *
 * Match criteria:
 *   - Activity type must match exactly
 *   - Skill ranges must overlap
 *   - World preference is optional (null matches any)
 *
 * Tickets expire after a configurable TTL.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type MatchStatus = 'waiting' | 'matched' | 'expired' | 'cancelled';

export interface MatchTicket {
  readonly ticketId: string;
  readonly dynastyId: string;
  readonly activityType: string;
  readonly skillMin: number;
  readonly skillMax: number;
  readonly worldId: string | null;
  readonly status: MatchStatus;
  readonly createdAt: number;
  readonly expiresAt: number;
}

export interface SubmitTicketParams {
  readonly dynastyId: string;
  readonly activityType: string;
  readonly skillMin: number;
  readonly skillMax: number;
  readonly worldId?: string;
}

export interface MatchGroup {
  readonly groupId: string;
  readonly activityType: string;
  readonly ticketIds: ReadonlyArray<string>;
  readonly dynastyIds: ReadonlyArray<string>;
  readonly formedAt: number;
}

export interface MatchmakingConfig {
  readonly minGroupSize: number;
  readonly maxGroupSize: number;
  readonly ticketTtlUs: number;
}

export interface MatchmakingStats {
  readonly waitingTickets: number;
  readonly totalSubmitted: number;
  readonly totalMatched: number;
  readonly totalExpired: number;
  readonly totalCancelled: number;
  readonly groupsFormed: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface MatchmakingDeps {
  readonly idGenerator: { next(): string };
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface MatchmakingEngine {
  submit(params: SubmitTicketParams): MatchTicket;
  cancel(ticketId: string): boolean;
  findMatches(): ReadonlyArray<MatchGroup>;
  getTicket(ticketId: string): MatchTicket | undefined;
  getTicketsForDynasty(dynastyId: string): ReadonlyArray<MatchTicket>;
  sweepExpired(): number;
  getStats(): MatchmakingStats;
}

// ─── Internal State ─────────────────────────────────────────────────

interface MutableTicket {
  readonly ticketId: string;
  readonly dynastyId: string;
  readonly activityType: string;
  readonly skillMin: number;
  readonly skillMax: number;
  readonly worldId: string | null;
  status: MatchStatus;
  readonly createdAt: number;
  readonly expiresAt: number;
}

interface EngineState {
  readonly tickets: Map<string, MutableTicket>;
  readonly groups: MatchGroup[];
  readonly deps: MatchmakingDeps;
  readonly config: MatchmakingConfig;
  totalSubmitted: number;
  totalMatched: number;
  totalExpired: number;
  totalCancelled: number;
}

const DEFAULT_CONFIG: MatchmakingConfig = {
  minGroupSize: 2,
  maxGroupSize: 4,
  ticketTtlUs: 120_000_000, // 2 minutes
};

// ─── Factory ────────────────────────────────────────────────────────

export function createMatchmakingEngine(
  deps: MatchmakingDeps,
  config?: Partial<MatchmakingConfig>,
): MatchmakingEngine {
  const state: EngineState = {
    tickets: new Map(),
    groups: [],
    deps,
    config: { ...DEFAULT_CONFIG, ...config },
    totalSubmitted: 0,
    totalMatched: 0,
    totalExpired: 0,
    totalCancelled: 0,
  };

  return {
    submit: (p) => submitImpl(state, p),
    cancel: (tid) => cancelImpl(state, tid),
    findMatches: () => findMatchesImpl(state),
    getTicket: (tid) => toReadonly(state.tickets.get(tid)),
    getTicketsForDynasty: (did) => dynastyTickets(state, did),
    sweepExpired: () => sweepImpl(state),
    getStats: () => computeStats(state),
  };
}

// ─── Submit ─────────────────────────────────────────────────────────

function submitImpl(state: EngineState, params: SubmitTicketParams): MatchTicket {
  const now = state.deps.clock.nowMicroseconds();
  const ticket: MutableTicket = {
    ticketId: state.deps.idGenerator.next(),
    dynastyId: params.dynastyId,
    activityType: params.activityType,
    skillMin: params.skillMin,
    skillMax: params.skillMax,
    worldId: params.worldId ?? null,
    status: 'waiting',
    createdAt: now,
    expiresAt: now + state.config.ticketTtlUs,
  };
  state.tickets.set(ticket.ticketId, ticket);
  state.totalSubmitted += 1;
  return toReadonly(ticket) as MatchTicket;
}

// ─── Cancel ─────────────────────────────────────────────────────────

function cancelImpl(state: EngineState, ticketId: string): boolean {
  const ticket = state.tickets.get(ticketId);
  if (ticket === undefined || ticket.status !== 'waiting') return false;
  ticket.status = 'cancelled';
  state.totalCancelled += 1;
  return true;
}

// ─── Match Finding ──────────────────────────────────────────────────

function findMatchesImpl(state: EngineState): ReadonlyArray<MatchGroup> {
  const waiting = getWaitingTickets(state);
  const byActivity = groupByActivity(waiting);
  const formed: MatchGroup[] = [];
  for (const [activity, pool] of byActivity.entries()) {
    formGroupsForActivity(state, activity, pool, formed);
  }
  return formed;
}

function getWaitingTickets(state: EngineState): MutableTicket[] {
  const result: MutableTicket[] = [];
  for (const ticket of state.tickets.values()) {
    if (ticket.status === 'waiting') result.push(ticket);
  }
  return result;
}

function groupByActivity(tickets: MutableTicket[]): Map<string, MutableTicket[]> {
  const map = new Map<string, MutableTicket[]>();
  for (const t of tickets) {
    let list = map.get(t.activityType);
    if (list === undefined) {
      list = [];
      map.set(t.activityType, list);
    }
    list.push(t);
  }
  return map;
}

function formGroupsForActivity(
  state: EngineState,
  activity: string,
  pool: MutableTicket[],
  formed: MatchGroup[],
): void {
  const used = new Set<string>();
  for (const anchor of pool) {
    if (used.has(anchor.ticketId)) continue;
    const compatible = findCompatible(anchor, pool, used, state.config);
    if (compatible.length < state.config.minGroupSize) continue;
    formGroup(state, activity, compatible, formed, used);
  }
}

function findCompatible(
  anchor: MutableTicket,
  pool: MutableTicket[],
  used: Set<string>,
  config: MatchmakingConfig,
): MutableTicket[] {
  const group: MutableTicket[] = [anchor];
  for (const candidate of pool) {
    if (group.length >= config.maxGroupSize) break;
    if (candidate.ticketId === anchor.ticketId) continue;
    if (used.has(candidate.ticketId)) continue;
    if (!isCompatible(anchor, candidate)) continue;
    group.push(candidate);
  }
  return group;
}

function isCompatible(a: MutableTicket, b: MutableTicket): boolean {
  if (a.skillMax < b.skillMin || b.skillMax < a.skillMin) return false;
  if (a.worldId !== null && b.worldId !== null && a.worldId !== b.worldId) {
    return false;
  }
  return true;
}

function formGroup(
  state: EngineState,
  activity: string,
  tickets: MutableTicket[],
  formed: MatchGroup[],
  used: Set<string>,
): void {
  const group: MatchGroup = {
    groupId: state.deps.idGenerator.next(),
    activityType: activity,
    ticketIds: tickets.map((t) => t.ticketId),
    dynastyIds: tickets.map((t) => t.dynastyId),
    formedAt: state.deps.clock.nowMicroseconds(),
  };
  for (const t of tickets) {
    t.status = 'matched';
    used.add(t.ticketId);
  }
  state.totalMatched += tickets.length;
  state.groups.push(group);
  formed.push(group);
}

// ─── Queries ────────────────────────────────────────────────────────

function dynastyTickets(state: EngineState, dynastyId: string): ReadonlyArray<MatchTicket> {
  const result: MatchTicket[] = [];
  for (const ticket of state.tickets.values()) {
    if (ticket.dynastyId === dynastyId) {
      result.push(toReadonly(ticket) as MatchTicket);
    }
  }
  return result;
}

// ─── Sweep ──────────────────────────────────────────────────────────

function sweepImpl(state: EngineState): number {
  const now = state.deps.clock.nowMicroseconds();
  let expired = 0;
  for (const ticket of state.tickets.values()) {
    if (ticket.status === 'waiting' && ticket.expiresAt <= now) {
      ticket.status = 'expired';
      expired += 1;
    }
  }
  state.totalExpired += expired;
  return expired;
}

// ─── Helpers ────────────────────────────────────────────────────────

function toReadonly(ticket: MutableTicket | undefined): MatchTicket | undefined {
  return ticket;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: EngineState): MatchmakingStats {
  let waiting = 0;
  for (const ticket of state.tickets.values()) {
    if (ticket.status === 'waiting') waiting += 1;
  }
  return {
    waitingTickets: waiting,
    totalSubmitted: state.totalSubmitted,
    totalMatched: state.totalMatched,
    totalExpired: state.totalExpired,
    totalCancelled: state.totalCancelled,
    groupsFormed: state.groups.length,
  };
}
