/**
 * political-influence.ts
 * Dynasty political power, influence spending, faction leverage
 */

// ============================================================================
// Ports (defined locally per hexagonal architecture)
// ============================================================================

interface PoliticalClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface PoliticalIdPort {
  readonly generate: () => string;
}

interface PoliticalLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

type InfluenceAction = 'SWAY_VOTE' | 'BLOCK_LEGISLATION' | 'SECURE_ALLIANCE' | 'DISCREDIT_RIVAL';

interface PoliticalCapital {
  readonly dynastyId: string;
  readonly worldId: string;
  readonly currentCapital: bigint;
  readonly maxCapital: bigint;
  readonly regenRate: bigint;
  readonly lastTickMicros: bigint;
}

interface InfluenceTarget {
  readonly targetType: 'DYNASTY' | 'FACTION' | 'ASSEMBLY' | 'LEGISLATION';
  readonly targetId: string;
  readonly worldId: string;
}

interface InfluenceActionRecord {
  readonly actionId: string;
  readonly dynastyId: string;
  readonly action: InfluenceAction;
  readonly target: InfluenceTarget;
  readonly capitalSpent: bigint;
  readonly timestampMicros: bigint;
  readonly success: boolean;
  readonly blockedById: string | null;
}

interface PoliticalReport {
  readonly dynastyId: string;
  readonly worldId: string;
  readonly currentCapital: bigint;
  readonly maxCapital: bigint;
  readonly actionsThisPeriod: number;
  readonly totalCapitalSpent: bigint;
  readonly successRate: number;
}

interface PoliticalEvent {
  readonly eventId: string;
  readonly eventType: 'CAPITAL_ADDED' | 'INFLUENCE_SPENT' | 'ACTION_BLOCKED' | 'REGEN_TICK';
  readonly dynastyId: string;
  readonly worldId: string;
  readonly timestampMicros: bigint;
  readonly details: Record<string, unknown>;
}

// ============================================================================
// State
// ============================================================================

interface PoliticalState {
  readonly capitals: Map<string, PoliticalCapital>;
  readonly actions: Map<string, InfluenceActionRecord>;
  readonly events: Map<string, PoliticalEvent>;
  readonly blockedActions: Map<string, string[]>;
}

// ============================================================================
// Dependencies
// ============================================================================

interface PoliticalInfluenceDeps {
  readonly clock: PoliticalClockPort;
  readonly idGen: PoliticalIdPort;
  readonly logger: PoliticalLoggerPort;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_REGEN_RATE = 100n;
const DEFAULT_MAX_CAPITAL = 10_000_000n;
const SWAY_VOTE_COST = 500_000n;
const BLOCK_LEGISLATION_COST = 1_000_000n;
const SECURE_ALLIANCE_COST = 750_000n;
const DISCREDIT_RIVAL_COST = 600_000n;

// ============================================================================
// Core Functions
// ============================================================================

function getCapitalKey(dynastyId: string, worldId: string): string {
  return dynastyId + ':' + worldId;
}

function addCapital(
  state: PoliticalState,
  deps: PoliticalInfluenceDeps,
  params: { dynastyId: string; worldId: string; amount: bigint },
): string | { capital: PoliticalCapital; eventId: string } {
  const key = getCapitalKey(params.dynastyId, params.worldId);
  const existing = state.capitals.get(key);
  const nowMicros = deps.clock.nowMicroseconds();

  if (existing === undefined) {
    const initialCapital =
      params.amount > DEFAULT_MAX_CAPITAL ? DEFAULT_MAX_CAPITAL : params.amount;
    const newCap: PoliticalCapital = {
      dynastyId: params.dynastyId,
      worldId: params.worldId,
      currentCapital: initialCapital,
      maxCapital: DEFAULT_MAX_CAPITAL,
      regenRate: DEFAULT_REGEN_RATE,
      lastTickMicros: nowMicros,
    };
    state.capitals.set(key, newCap);

    const eventId = deps.idGen.generate();
    const evt: PoliticalEvent = {
      eventId,
      eventType: 'CAPITAL_ADDED',
      dynastyId: params.dynastyId,
      worldId: params.worldId,
      timestampMicros: nowMicros,
      details: { amount: String(params.amount), initial: 'true' },
    };
    state.events.set(eventId, evt);

    deps.logger.info('Political capital initialized', {
      dynastyId: params.dynastyId,
      worldId: params.worldId,
      amount: String(params.amount),
    });

    return { capital: newCap, eventId };
  }

  const newAmount = existing.currentCapital + params.amount;
  const capped = newAmount > existing.maxCapital ? existing.maxCapital : newAmount;

  const updated: PoliticalCapital = {
    ...existing,
    currentCapital: capped,
    lastTickMicros: nowMicros,
  };
  state.capitals.set(key, updated);

  const eventId = deps.idGen.generate();
  const evt: PoliticalEvent = {
    eventId,
    eventType: 'CAPITAL_ADDED',
    dynastyId: params.dynastyId,
    worldId: params.worldId,
    timestampMicros: nowMicros,
    details: { amount: String(params.amount), capped: String(capped) },
  };
  state.events.set(eventId, evt);

  return { capital: updated, eventId };
}

function getActionCost(action: InfluenceAction): bigint {
  if (action === 'SWAY_VOTE') return SWAY_VOTE_COST;
  if (action === 'BLOCK_LEGISLATION') return BLOCK_LEGISLATION_COST;
  if (action === 'SECURE_ALLIANCE') return SECURE_ALLIANCE_COST;
  return DISCREDIT_RIVAL_COST;
}

function spendInfluence(
  state: PoliticalState,
  deps: PoliticalInfluenceDeps,
  params: { dynastyId: string; action: InfluenceAction; target: InfluenceTarget },
): string | { actionId: string; success: boolean } {
  const key = getCapitalKey(params.dynastyId, params.target.worldId);
  const capital = state.capitals.get(key);

  if (capital === undefined) {
    return 'NO_CAPITAL_RECORD';
  }

  const cost = getActionCost(params.action);
  if (capital.currentCapital < cost) {
    return 'INSUFFICIENT_CAPITAL';
  }

  const actionId = deps.idGen.generate();
  const nowMicros = deps.clock.nowMicroseconds();
  const success = true;

  const updated: PoliticalCapital = {
    ...capital,
    currentCapital: capital.currentCapital - cost,
    lastTickMicros: nowMicros,
  };
  state.capitals.set(key, updated);

  const record: InfluenceActionRecord = {
    actionId,
    dynastyId: params.dynastyId,
    action: params.action,
    target: params.target,
    capitalSpent: cost,
    timestampMicros: nowMicros,
    success,
    blockedById: null,
  };
  state.actions.set(actionId, record);

  const eventId = deps.idGen.generate();
  const evt: PoliticalEvent = {
    eventId,
    eventType: 'INFLUENCE_SPENT',
    dynastyId: params.dynastyId,
    worldId: params.target.worldId,
    timestampMicros: nowMicros,
    details: { actionId, action: params.action, cost: String(cost) },
  };
  state.events.set(eventId, evt);

  deps.logger.info('Influence spent', {
    dynastyId: params.dynastyId,
    action: params.action,
    cost: String(cost),
  });

  return { actionId, success };
}

function regenerateCapital(
  state: PoliticalState,
  deps: PoliticalInfluenceDeps,
  params: { dynastyId: string; worldId: string },
): string | { newCapital: bigint; regenAmount: bigint } {
  const key = getCapitalKey(params.dynastyId, params.worldId);
  const capital = state.capitals.get(key);

  if (capital === undefined) {
    return 'NO_CAPITAL_RECORD';
  }

  const nowMicros = deps.clock.nowMicroseconds();
  const regenAmount = capital.regenRate;
  const newAmount = capital.currentCapital + regenAmount;
  const capped = newAmount > capital.maxCapital ? capital.maxCapital : newAmount;

  const updated: PoliticalCapital = {
    ...capital,
    currentCapital: capped,
    lastTickMicros: nowMicros,
  };
  state.capitals.set(key, updated);

  const eventId = deps.idGen.generate();
  const evt: PoliticalEvent = {
    eventId,
    eventType: 'REGEN_TICK',
    dynastyId: params.dynastyId,
    worldId: params.worldId,
    timestampMicros: nowMicros,
    details: { regenAmount: String(regenAmount), newCapital: String(capped) },
  };
  state.events.set(eventId, evt);

  return { newCapital: capped, regenAmount };
}

function blockAction(
  state: PoliticalState,
  deps: PoliticalInfluenceDeps,
  params: { actionId: string; blockedByDynastyId: string },
): string | { blocked: true } {
  const action = state.actions.get(params.actionId);

  if (action === undefined) {
    return 'ACTION_NOT_FOUND';
  }

  const updated: InfluenceActionRecord = {
    ...action,
    success: false,
    blockedById: params.blockedByDynastyId,
  };
  state.actions.set(params.actionId, updated);

  const key = action.dynastyId;
  const existing = state.blockedActions.get(key);
  if (existing === undefined) {
    state.blockedActions.set(key, [params.actionId]);
  } else {
    existing.push(params.actionId);
  }

  const nowMicros = deps.clock.nowMicroseconds();
  const eventId = deps.idGen.generate();
  const evt: PoliticalEvent = {
    eventId,
    eventType: 'ACTION_BLOCKED',
    dynastyId: action.dynastyId,
    worldId: action.target.worldId,
    timestampMicros: nowMicros,
    details: { actionId: params.actionId, blockedBy: params.blockedByDynastyId },
  };
  state.events.set(eventId, evt);

  deps.logger.warn('Action blocked', {
    actionId: params.actionId,
    blockedBy: params.blockedByDynastyId,
  });

  return { blocked: true };
}

function getInfluenceReport(
  state: PoliticalState,
  deps: PoliticalInfluenceDeps,
  params: { dynastyId: string; worldId: string },
): string | PoliticalReport {
  const key = getCapitalKey(params.dynastyId, params.worldId);
  const capital = state.capitals.get(key);

  if (capital === undefined) {
    return 'NO_CAPITAL_RECORD';
  }

  const nowMicros = deps.clock.nowMicroseconds();
  const oneDayMicros = 86_400_000_000n;
  const cutoff = nowMicros - oneDayMicros;

  let actionsCount = 0;
  let totalSpent = 0n;
  let successCount = 0;

  for (const action of state.actions.values()) {
    if (action.dynastyId !== params.dynastyId) continue;
    if (action.target.worldId !== params.worldId) continue;
    if (action.timestampMicros < cutoff) continue;

    actionsCount = actionsCount + 1;
    totalSpent = totalSpent + action.capitalSpent;
    if (action.success) {
      successCount = successCount + 1;
    }
  }

  const successRate = actionsCount === 0 ? 0 : successCount / actionsCount;

  const report: PoliticalReport = {
    dynastyId: params.dynastyId,
    worldId: params.worldId,
    currentCapital: capital.currentCapital,
    maxCapital: capital.maxCapital,
    actionsThisPeriod: actionsCount,
    totalCapitalSpent: totalSpent,
    successRate,
  };

  return report;
}

function getPoliticalHistory(
  state: PoliticalState,
  deps: PoliticalInfluenceDeps,
  params: { dynastyId: string; worldId: string; limit: number },
): PoliticalEvent[] {
  const results: PoliticalEvent[] = [];

  for (const evt of state.events.values()) {
    if (evt.dynastyId !== params.dynastyId) continue;
    if (evt.worldId !== params.worldId) continue;
    results.push(evt);
  }

  results.sort((a, b) => {
    if (a.timestampMicros > b.timestampMicros) return -1;
    if (a.timestampMicros < b.timestampMicros) return 1;
    return 0;
  });

  return results.slice(0, params.limit);
}

function getCapitalStatus(
  state: PoliticalState,
  deps: PoliticalInfluenceDeps,
  params: { dynastyId: string; worldId: string },
): string | PoliticalCapital {
  const key = getCapitalKey(params.dynastyId, params.worldId);
  const capital = state.capitals.get(key);

  if (capital === undefined) {
    return 'NO_CAPITAL_RECORD';
  }

  return capital;
}

function getAllActionsForDynasty(
  state: PoliticalState,
  deps: PoliticalInfluenceDeps,
  params: { dynastyId: string },
): InfluenceActionRecord[] {
  const results: InfluenceActionRecord[] = [];

  for (const action of state.actions.values()) {
    if (action.dynastyId === params.dynastyId) {
      results.push(action);
    }
  }

  return results;
}

// ============================================================================
// Module Factory
// ============================================================================

export interface PoliticalInfluenceModule {
  readonly addCapital: (params: {
    dynastyId: string;
    worldId: string;
    amount: bigint;
  }) => string | { capital: PoliticalCapital; eventId: string };
  readonly spendInfluence: (params: {
    dynastyId: string;
    action: InfluenceAction;
    target: InfluenceTarget;
  }) => string | { actionId: string; success: boolean };
  readonly regenerateCapital: (params: {
    dynastyId: string;
    worldId: string;
  }) => string | { newCapital: bigint; regenAmount: bigint };
  readonly blockAction: (params: {
    actionId: string;
    blockedByDynastyId: string;
  }) => string | { blocked: true };
  readonly getInfluenceReport: (params: {
    dynastyId: string;
    worldId: string;
  }) => string | PoliticalReport;
  readonly getPoliticalHistory: (params: {
    dynastyId: string;
    worldId: string;
    limit: number;
  }) => PoliticalEvent[];
  readonly getCapitalStatus: (params: {
    dynastyId: string;
    worldId: string;
  }) => string | PoliticalCapital;
  readonly getAllActionsForDynasty: (params: { dynastyId: string }) => InfluenceActionRecord[];
}

export function createPoliticalInfluence(deps: PoliticalInfluenceDeps): PoliticalInfluenceModule {
  const state: PoliticalState = {
    capitals: new Map(),
    actions: new Map(),
    events: new Map(),
    blockedActions: new Map(),
  };

  return {
    addCapital: (params) => addCapital(state, deps, params),
    spendInfluence: (params) => spendInfluence(state, deps, params),
    regenerateCapital: (params) => regenerateCapital(state, deps, params),
    blockAction: (params) => blockAction(state, deps, params),
    getInfluenceReport: (params) => getInfluenceReport(state, deps, params),
    getPoliticalHistory: (params) => getPoliticalHistory(state, deps, params),
    getCapitalStatus: (params) => getCapitalStatus(state, deps, params),
    getAllActionsForDynasty: (params) => getAllActionsForDynasty(state, deps, params),
  };
}

export type {
  PoliticalCapital,
  InfluenceAction,
  InfluenceTarget,
  InfluenceActionRecord,
  PoliticalReport,
  PoliticalEvent,
  PoliticalInfluenceDeps,
};
