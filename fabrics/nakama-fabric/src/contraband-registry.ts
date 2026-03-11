/**
 * contraband-registry.ts
 * Track prohibited goods, smuggling routes, seizure records
 */

// ============================================================================
// Ports (defined locally per hexagonal architecture)
// ============================================================================

interface ContrabandClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface ContrabandIdPort {
  readonly generate: () => string;
}

interface ContrabandLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

type RouteRisk = 'NEGLIGIBLE' | 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

interface ContrabandItem {
  readonly itemId: string;
  readonly itemType: string;
  readonly description: string;
  readonly baseValueMicroKalon: bigint;
  readonly riskLevel: RouteRisk;
}

interface ProhibitionRule {
  readonly ruleId: string;
  readonly worldId: string;
  readonly itemType: string;
  readonly bannedAtMicros: bigint;
  readonly reason: string;
  readonly penaltyMicroKalon: bigint;
}

interface SmugglingRoute {
  readonly routeId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly itemType: string;
  readonly risk: RouteRisk;
  readonly successfulRuns: number;
  readonly failedRuns: number;
  readonly lastUsedMicros: bigint;
}

interface SeizureRecord {
  readonly seizureId: string;
  readonly worldId: string;
  readonly dynastyId: string;
  readonly itemType: string;
  readonly quantity: number;
  readonly estimatedValueMicroKalon: bigint;
  readonly routeId: string | null;
  readonly timestampMicros: bigint;
  readonly enforcerDynastyId: string;
}

// ============================================================================
// State
// ============================================================================

interface ContrabandState {
  readonly items: Map<string, ContrabandItem>;
  readonly rules: Map<string, ProhibitionRule>;
  readonly routes: Map<string, SmugglingRoute>;
  readonly seizures: Map<string, SeizureRecord>;
  readonly worldProhibitions: Map<string, Set<string>>;
}

// ============================================================================
// Dependencies
// ============================================================================

interface ContrabandRegistryDeps {
  readonly clock: ContrabandClockPort;
  readonly idGen: ContrabandIdPort;
  readonly logger: ContrabandLoggerPort;
}

// ============================================================================
// Constants
// ============================================================================

const RISK_MULTIPLIER_NEGLIGIBLE = 1.0;
const RISK_MULTIPLIER_LOW = 1.5;
const RISK_MULTIPLIER_MODERATE = 2.5;
const RISK_MULTIPLIER_HIGH = 4.0;
const RISK_MULTIPLIER_EXTREME = 7.0;

// ============================================================================
// Core Functions
// ============================================================================

function getRouteKey(fromWorldId: string, toWorldId: string, itemType: string): string {
  return fromWorldId + ':' + toWorldId + ':' + itemType;
}

function addProhibitionRule(
  state: ContrabandState,
  deps: ContrabandRegistryDeps,
  params: {
    worldId: string;
    itemType: string;
    reason: string;
    penaltyMicroKalon: bigint;
  },
): { ruleId: string; rule: ProhibitionRule } {
  const ruleId = deps.idGen.generate();
  const nowMicros = deps.clock.nowMicroseconds();

  const rule: ProhibitionRule = {
    ruleId,
    worldId: params.worldId,
    itemType: params.itemType,
    bannedAtMicros: nowMicros,
    reason: params.reason,
    penaltyMicroKalon: params.penaltyMicroKalon,
  };

  state.rules.set(ruleId, rule);

  const worldKey = params.worldId;
  const existing = state.worldProhibitions.get(worldKey);
  if (existing === undefined) {
    const newSet = new Set<string>();
    newSet.add(params.itemType);
    state.worldProhibitions.set(worldKey, newSet);
  } else {
    existing.add(params.itemType);
  }

  deps.logger.info('Prohibition rule added', {
    ruleId,
    worldId: params.worldId,
    itemType: params.itemType,
  });

  return { ruleId, rule };
}

function calculateRouteRisk(successfulRuns: number, failedRuns: number): RouteRisk {
  const totalRuns = successfulRuns + failedRuns;
  if (totalRuns <= 1) return 'MODERATE';

  const failureRate = failedRuns / totalRuns;

  if (failureRate >= 0.6) return 'EXTREME';
  if (failureRate >= 0.4) return 'HIGH';
  if (failureRate >= 0.2) return 'MODERATE';
  if (failureRate >= 0.05) return 'LOW';
  return 'NEGLIGIBLE';
}

function recordSmuggleAttempt(
  state: ContrabandState,
  deps: ContrabandRegistryDeps,
  params: {
    fromWorldId: string;
    toWorldId: string;
    itemType: string;
    success: boolean;
  },
): { routeId: string; risk: RouteRisk } {
  const routeKey = getRouteKey(params.fromWorldId, params.toWorldId, params.itemType);
  const existing = state.routes.get(routeKey);
  const nowMicros = deps.clock.nowMicroseconds();

  if (existing === undefined) {
    const successCount = params.success ? 1 : 0;
    const failCount = params.success ? 0 : 1;
    const risk = calculateRouteRisk(successCount, failCount);

    const newRoute: SmugglingRoute = {
      routeId: deps.idGen.generate(),
      fromWorldId: params.fromWorldId,
      toWorldId: params.toWorldId,
      itemType: params.itemType,
      risk,
      successfulRuns: successCount,
      failedRuns: failCount,
      lastUsedMicros: nowMicros,
    };

    state.routes.set(routeKey, newRoute);

    deps.logger.info('New smuggling route recorded', {
      routeId: newRoute.routeId,
      fromWorldId: params.fromWorldId,
      toWorldId: params.toWorldId,
      itemType: params.itemType,
    });

    return { routeId: newRoute.routeId, risk };
  }

  const newSuccessCount = params.success ? existing.successfulRuns + 1 : existing.successfulRuns;
  const newFailCount = params.success ? existing.failedRuns : existing.failedRuns + 1;
  const newRisk = calculateRouteRisk(newSuccessCount, newFailCount);

  const updated: SmugglingRoute = {
    ...existing,
    successfulRuns: newSuccessCount,
    failedRuns: newFailCount,
    risk: newRisk,
    lastUsedMicros: nowMicros,
  };

  state.routes.set(routeKey, updated);

  deps.logger.info('Smuggling route updated', {
    routeId: existing.routeId,
    success: params.success,
    newRisk,
  });

  return { routeId: existing.routeId, risk: newRisk };
}

function getRiskMultiplier(risk: RouteRisk): number {
  if (risk === 'NEGLIGIBLE') return RISK_MULTIPLIER_NEGLIGIBLE;
  if (risk === 'LOW') return RISK_MULTIPLIER_LOW;
  if (risk === 'MODERATE') return RISK_MULTIPLIER_MODERATE;
  if (risk === 'HIGH') return RISK_MULTIPLIER_HIGH;
  return RISK_MULTIPLIER_EXTREME;
}

function countWorldSeizures(state: ContrabandState, worldId: string): bigint {
  let count = 0n;
  for (const s of state.seizures.values()) {
    if (s.worldId === worldId) {
      count += 1n;
    }
  }
  return count;
}

function recordSeizure(
  state: ContrabandState,
  deps: ContrabandRegistryDeps,
  params: {
    worldId: string;
    dynastyId: string;
    itemType: string;
    quantity: number;
    baseValueMicroKalon: bigint;
    routeId: string | null;
    enforcerDynastyId: string;
  },
): { seizureId: string; seizure: SeizureRecord } {
  const seizureId = deps.idGen.generate();
  const nowMicros = deps.clock.nowMicroseconds();

  const route = params.routeId === null ? null : (state.routes.get(params.routeId) ?? null);
  const risk = route === null ? 'MODERATE' : route.risk;
  const multiplier = getRiskMultiplier(risk);

  const quantityBig = BigInt(params.quantity);
  const baseTotal = params.baseValueMicroKalon * quantityBig;
  const multiplierBig = BigInt(Math.floor(multiplier * 100));
  const sequentialMultiplier = countWorldSeizures(state, params.worldId) + 1n;
  const estimatedValue = (baseTotal * multiplierBig * sequentialMultiplier) / 100n;

  const seizure: SeizureRecord = {
    seizureId,
    worldId: params.worldId,
    dynastyId: params.dynastyId,
    itemType: params.itemType,
    quantity: params.quantity,
    estimatedValueMicroKalon: estimatedValue,
    routeId: params.routeId,
    timestampMicros: nowMicros,
    enforcerDynastyId: params.enforcerDynastyId,
  };

  state.seizures.set(seizureId, seizure);

  deps.logger.warn('Contraband seized', {
    seizureId,
    dynastyId: params.dynastyId,
    itemType: params.itemType,
    quantity: params.quantity,
    estimatedValue: String(estimatedValue),
  });

  return { seizureId, seizure };
}

function getRouteRisk(
  state: ContrabandState,
  deps: ContrabandRegistryDeps,
  params: { fromWorldId: string; toWorldId: string; itemType: string },
): RouteRisk | null {
  const routeKey = getRouteKey(params.fromWorldId, params.toWorldId, params.itemType);
  const route = state.routes.get(routeKey);

  if (route === undefined) {
    return null;
  }

  return route.risk;
}

function getSeizureReport(
  state: ContrabandState,
  deps: ContrabandRegistryDeps,
  params: { worldId: string; limit: number },
): SeizureRecord[] {
  const results: SeizureRecord[] = [];

  for (const seizure of state.seizures.values()) {
    if (seizure.worldId === params.worldId) {
      results.push(seizure);
    }
  }

  results.sort((a, b) => {
    if (a.timestampMicros > b.timestampMicros) return -1;
    if (a.timestampMicros < b.timestampMicros) return 1;
    return 0;
  });

  return results.slice(0, params.limit);
}

function listProhibitedGoods(
  state: ContrabandState,
  deps: ContrabandRegistryDeps,
  params: { worldId: string },
): ProhibitionRule[] {
  const results: ProhibitionRule[] = [];

  for (const rule of state.rules.values()) {
    if (rule.worldId === params.worldId) {
      results.push(rule);
    }
  }

  return results;
}

function registerContrabandItem(
  state: ContrabandState,
  deps: ContrabandRegistryDeps,
  params: {
    itemType: string;
    description: string;
    baseValueMicroKalon: bigint;
    riskLevel: RouteRisk;
  },
): { itemId: string; item: ContrabandItem } {
  const itemId = deps.idGen.generate();

  const item: ContrabandItem = {
    itemId,
    itemType: params.itemType,
    description: params.description,
    baseValueMicroKalon: params.baseValueMicroKalon,
    riskLevel: params.riskLevel,
  };

  state.items.set(itemId, item);

  deps.logger.info('Contraband item registered', {
    itemId,
    itemType: params.itemType,
    riskLevel: params.riskLevel,
  });

  return { itemId, item };
}

function isProhibited(
  state: ContrabandState,
  deps: ContrabandRegistryDeps,
  params: { worldId: string; itemType: string },
): boolean {
  const worldKey = params.worldId;
  const prohibitions = state.worldProhibitions.get(worldKey);

  if (prohibitions === undefined) {
    return false;
  }

  return prohibitions.has(params.itemType);
}

function getTotalSeizureValue(
  state: ContrabandState,
  deps: ContrabandRegistryDeps,
  params: { worldId: string },
): bigint {
  let total = 0n;

  for (const seizure of state.seizures.values()) {
    if (seizure.worldId === params.worldId) {
      total = total + seizure.estimatedValueMicroKalon;
    }
  }

  return total;
}

function getRoutesByRisk(
  state: ContrabandState,
  deps: ContrabandRegistryDeps,
  params: { risk: RouteRisk },
): SmugglingRoute[] {
  const results: SmugglingRoute[] = [];

  for (const route of state.routes.values()) {
    if (route.risk === params.risk) {
      results.push(route);
    }
  }

  return results;
}

// ============================================================================
// Module Factory
// ============================================================================

export interface ContrabandRegistryModule {
  readonly addProhibitionRule: (params: {
    worldId: string;
    itemType: string;
    reason: string;
    penaltyMicroKalon: bigint;
  }) => { ruleId: string; rule: ProhibitionRule };
  readonly recordSmuggleAttempt: (params: {
    fromWorldId: string;
    toWorldId: string;
    itemType: string;
    success: boolean;
  }) => { routeId: string; risk: RouteRisk };
  readonly recordSeizure: (params: {
    worldId: string;
    dynastyId: string;
    itemType: string;
    quantity: number;
    baseValueMicroKalon: bigint;
    routeId: string | null;
    enforcerDynastyId: string;
  }) => { seizureId: string; seizure: SeizureRecord };
  readonly getRouteRisk: (params: {
    fromWorldId: string;
    toWorldId: string;
    itemType: string;
  }) => RouteRisk | null;
  readonly getSeizureReport: (params: { worldId: string; limit: number }) => SeizureRecord[];
  readonly listProhibitedGoods: (params: { worldId: string }) => ProhibitionRule[];
  readonly registerContrabandItem: (params: {
    itemType: string;
    description: string;
    baseValueMicroKalon: bigint;
    riskLevel: RouteRisk;
  }) => { itemId: string; item: ContrabandItem };
  readonly isProhibited: (params: { worldId: string; itemType: string }) => boolean;
  readonly getTotalSeizureValue: (params: { worldId: string }) => bigint;
  readonly getRoutesByRisk: (params: { risk: RouteRisk }) => SmugglingRoute[];
}

export function createContrabandRegistry(deps: ContrabandRegistryDeps): ContrabandRegistryModule {
  const state: ContrabandState = {
    items: new Map(),
    rules: new Map(),
    routes: new Map(),
    seizures: new Map(),
    worldProhibitions: new Map(),
  };

  return {
    addProhibitionRule: (params) => addProhibitionRule(state, deps, params),
    recordSmuggleAttempt: (params) => recordSmuggleAttempt(state, deps, params),
    recordSeizure: (params) => recordSeizure(state, deps, params),
    getRouteRisk: (params) => getRouteRisk(state, deps, params),
    getSeizureReport: (params) => getSeizureReport(state, deps, params),
    listProhibitedGoods: (params) => listProhibitedGoods(state, deps, params),
    registerContrabandItem: (params) => registerContrabandItem(state, deps, params),
    isProhibited: (params) => isProhibited(state, deps, params),
    getTotalSeizureValue: (params) => getTotalSeizureValue(state, deps, params),
    getRoutesByRisk: (params) => getRoutesByRisk(state, deps, params),
  };
}

export type {
  ContrabandItem,
  ProhibitionRule,
  SmugglingRoute,
  SeizureRecord,
  RouteRisk,
  ContrabandRegistryDeps,
};
