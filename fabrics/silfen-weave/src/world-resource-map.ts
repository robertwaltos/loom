/**
 * world-resource-map.ts — Per-world resource distribution.
 *
 * Tracks natural resource deposits across worlds with location,
 * quantity, extraction rate, and depletion. Supports resource
 * queries by world, type, and availability.
 */

// ── Ports ────────────────────────────────────────────────────────

interface ResourceClock {
  readonly nowMicroseconds: () => number;
}

interface ResourceIdGenerator {
  readonly next: () => string;
}

interface WorldResourceDeps {
  readonly clock: ResourceClock;
  readonly idGenerator: ResourceIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type ResourceType = 'mineral' | 'energy' | 'organic' | 'exotic' | 'water' | 'gas';

interface ResourceDeposit {
  readonly depositId: string;
  readonly worldId: string;
  readonly resourceType: ResourceType;
  readonly name: string;
  readonly totalQuantity: number;
  readonly remainingQuantity: number;
  readonly registeredAt: number;
}

interface RegisterDepositParams {
  readonly worldId: string;
  readonly resourceType: ResourceType;
  readonly name: string;
  readonly quantity: number;
}

interface ExtractionResult {
  readonly extracted: number;
  readonly remaining: number;
  readonly depleted: boolean;
}

interface WorldResourceStats {
  readonly trackedWorlds: number;
  readonly totalDeposits: number;
  readonly depletedDeposits: number;
}

interface WorldResourceMap {
  readonly register: (params: RegisterDepositParams) => ResourceDeposit;
  readonly extract: (depositId: string, amount: number) => ExtractionResult | undefined;
  readonly getDeposit: (depositId: string) => ResourceDeposit | undefined;
  readonly getByWorld: (worldId: string) => readonly ResourceDeposit[];
  readonly getByType: (worldId: string, resourceType: ResourceType) => readonly ResourceDeposit[];
  readonly getAvailable: (worldId: string) => readonly ResourceDeposit[];
  readonly getStats: () => WorldResourceStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableDeposit {
  readonly depositId: string;
  readonly worldId: string;
  readonly resourceType: ResourceType;
  readonly name: string;
  readonly totalQuantity: number;
  remainingQuantity: number;
  readonly registeredAt: number;
}

interface ResourceState {
  readonly deps: WorldResourceDeps;
  readonly deposits: Map<string, MutableDeposit>;
  readonly worldIndex: Map<string, string[]>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(d: MutableDeposit): ResourceDeposit {
  return {
    depositId: d.depositId,
    worldId: d.worldId,
    resourceType: d.resourceType,
    name: d.name,
    totalQuantity: d.totalQuantity,
    remainingQuantity: d.remainingQuantity,
    registeredAt: d.registeredAt,
  };
}

// ── Operations ───────────────────────────────────────────────────

function registerImpl(state: ResourceState, params: RegisterDepositParams): ResourceDeposit {
  const deposit: MutableDeposit = {
    depositId: state.deps.idGenerator.next(),
    worldId: params.worldId,
    resourceType: params.resourceType,
    name: params.name,
    totalQuantity: params.quantity,
    remainingQuantity: params.quantity,
    registeredAt: state.deps.clock.nowMicroseconds(),
  };
  state.deposits.set(deposit.depositId, deposit);
  let idx = state.worldIndex.get(params.worldId);
  if (!idx) {
    idx = [];
    state.worldIndex.set(params.worldId, idx);
  }
  idx.push(deposit.depositId);
  return toReadonly(deposit);
}

function extractImpl(
  state: ResourceState,
  depositId: string,
  amount: number,
): ExtractionResult | undefined {
  const d = state.deposits.get(depositId);
  if (!d) return undefined;
  const extracted = Math.min(amount, d.remainingQuantity);
  d.remainingQuantity -= extracted;
  return {
    extracted,
    remaining: d.remainingQuantity,
    depleted: d.remainingQuantity <= 0,
  };
}

function getByWorldImpl(state: ResourceState, worldId: string): ResourceDeposit[] {
  const ids = state.worldIndex.get(worldId) ?? [];
  const result: ResourceDeposit[] = [];
  for (const id of ids) {
    const d = state.deposits.get(id);
    if (d !== undefined) result.push(toReadonly(d));
  }
  return result;
}

function getByTypeImpl(state: ResourceState, worldId: string, rt: ResourceType): ResourceDeposit[] {
  return getByWorldImpl(state, worldId).filter((d) => d.resourceType === rt);
}

function getAvailableImpl(state: ResourceState, worldId: string): ResourceDeposit[] {
  return getByWorldImpl(state, worldId).filter((d) => d.remainingQuantity > 0);
}

function getStatsImpl(state: ResourceState): WorldResourceStats {
  let depleted = 0;
  for (const d of state.deposits.values()) {
    if (d.remainingQuantity <= 0) depleted++;
  }
  return {
    trackedWorlds: state.worldIndex.size,
    totalDeposits: state.deposits.size,
    depletedDeposits: depleted,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createWorldResourceMap(deps: WorldResourceDeps): WorldResourceMap {
  const state: ResourceState = {
    deps,
    deposits: new Map(),
    worldIndex: new Map(),
  };
  return {
    register: (p) => registerImpl(state, p),
    extract: (id, amt) => extractImpl(state, id, amt),
    getDeposit: (id) => {
      const d = state.deposits.get(id);
      return d ? toReadonly(d) : undefined;
    },
    getByWorld: (wid) => getByWorldImpl(state, wid),
    getByType: (wid, rt) => getByTypeImpl(state, wid, rt),
    getAvailable: (wid) => getAvailableImpl(state, wid),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createWorldResourceMap };
export type {
  WorldResourceMap,
  WorldResourceDeps,
  ResourceType,
  ResourceDeposit,
  RegisterDepositParams,
  ExtractionResult,
  WorldResourceStats,
};
