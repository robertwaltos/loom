/**
 * Dynasty Registry — Player identity and lineage tracking.
 *
 * Bible v1.2: A Dynasty is the persistent identity of a player across
 * generations. Each dynasty has a KALON account, a Remembrance record,
 * a civic score, and a mortality state. A Dynasty outlives any single
 * character — it is the player's civilisational footprint.
 *
 * Status lifecycle: active → dormant → deceased
 * Dormancy triggers after configurable inactivity (default 90 days).
 * Mortality is a multi-stage process (see dynasty-mortality.ts).
 */

import { dynastyNotFound, dynastyAlreadyExists } from './kalon-errors.js';

export type DynastyStatus = 'active' | 'dormant' | 'deceased';

export type SubscriptionTier = 'free' | 'accord' | 'patron' | 'herald';

export interface DynastyInfo {
  readonly dynastyId: string;
  readonly name: string;
  readonly kalonAccountId: string;
  readonly homeWorldId: string;
  readonly status: DynastyStatus;
  readonly subscriptionTier: SubscriptionTier;
  readonly foundedAt: number;
  readonly lastActiveAt: number;
}

export interface DynastyRegistry {
  found(params: FoundDynastyParams): DynastyInfo;
  get(dynastyId: string): DynastyInfo;
  tryGet(dynastyId: string): DynastyInfo | undefined;
  exists(dynastyId: string): boolean;
  updateLastActive(dynastyId: string): void;
  setStatus(dynastyId: string, status: DynastyStatus): void;
  setSubscriptionTier(dynastyId: string, tier: SubscriptionTier): void;
  findByKalonAccount(accountId: string): DynastyInfo | undefined;
  findByHomeWorld(worldId: string): ReadonlyArray<DynastyInfo>;
  listByStatus(status: DynastyStatus): ReadonlyArray<DynastyInfo>;
  count(): number;
}

export interface FoundDynastyParams {
  readonly dynastyId: string;
  readonly name: string;
  readonly homeWorldId: string;
  readonly subscriptionTier?: SubscriptionTier;
}

interface MutableDynasty {
  readonly dynastyId: string;
  readonly name: string;
  readonly kalonAccountId: string;
  readonly homeWorldId: string;
  status: DynastyStatus;
  subscriptionTier: SubscriptionTier;
  readonly foundedAt: number;
  lastActiveAt: number;
}

interface RegistryState {
  readonly dynasties: Map<string, MutableDynasty>;
  readonly accountIndex: Map<string, string>;
  readonly clock: { nowMicroseconds(): number };
}

export function createDynastyRegistry(deps: {
  readonly clock: { nowMicroseconds(): number };
}): DynastyRegistry {
  const state: RegistryState = {
    dynasties: new Map(),
    accountIndex: new Map(),
    clock: deps.clock,
  };

  return {
    found: (params) => foundImpl(state, params),
    get: (id) => getImpl(state, id),
    tryGet: (id) => state.dynasties.get(id),
    exists: (id) => state.dynasties.has(id),
    updateLastActive: (id) => {
      updateLastActiveImpl(state, id);
    },
    setStatus: (id, status) => {
      setStatusImpl(state, id, status);
    },
    setSubscriptionTier: (id, tier) => {
      setTierImpl(state, id, tier);
    },
    findByKalonAccount: (accountId) => findByAccountImpl(state, accountId),
    findByHomeWorld: (worldId) => findByWorldImpl(state, worldId),
    listByStatus: (status) => listByStatusImpl(state, status),
    count: () => state.dynasties.size,
  };
}

function foundImpl(state: RegistryState, params: FoundDynastyParams): DynastyInfo {
  if (state.dynasties.has(params.dynastyId)) {
    throw dynastyAlreadyExists(params.dynastyId);
  }
  const now = state.clock.nowMicroseconds();
  const kalonAccountId = `dynasty:${params.dynastyId}`;

  const dynasty: MutableDynasty = {
    dynastyId: params.dynastyId,
    name: params.name,
    kalonAccountId,
    homeWorldId: params.homeWorldId,
    status: 'active',
    subscriptionTier: params.subscriptionTier ?? 'free',
    foundedAt: now,
    lastActiveAt: now,
  };

  state.dynasties.set(params.dynastyId, dynasty);
  state.accountIndex.set(kalonAccountId, params.dynastyId);
  return dynasty;
}

function getImpl(state: RegistryState, dynastyId: string): DynastyInfo {
  const dynasty = state.dynasties.get(dynastyId);
  if (dynasty === undefined) throw dynastyNotFound(dynastyId);
  return dynasty;
}

function updateLastActiveImpl(state: RegistryState, dynastyId: string): void {
  const dynasty = getMutable(state, dynastyId);
  dynasty.lastActiveAt = state.clock.nowMicroseconds();
}

function setStatusImpl(state: RegistryState, dynastyId: string, status: DynastyStatus): void {
  getMutable(state, dynastyId).status = status;
}

function setTierImpl(state: RegistryState, dynastyId: string, tier: SubscriptionTier): void {
  getMutable(state, dynastyId).subscriptionTier = tier;
}

function findByAccountImpl(state: RegistryState, accountId: string): DynastyInfo | undefined {
  const dynastyId = state.accountIndex.get(accountId);
  if (dynastyId === undefined) return undefined;
  return state.dynasties.get(dynastyId);
}

function findByWorldImpl(state: RegistryState, worldId: string): ReadonlyArray<DynastyInfo> {
  const result: DynastyInfo[] = [];
  for (const dynasty of state.dynasties.values()) {
    if (dynasty.homeWorldId === worldId) result.push(dynasty);
  }
  return result;
}

function listByStatusImpl(state: RegistryState, status: DynastyStatus): ReadonlyArray<DynastyInfo> {
  const result: DynastyInfo[] = [];
  for (const dynasty of state.dynasties.values()) {
    if (dynasty.status === status) result.push(dynasty);
  }
  return result;
}

function getMutable(state: RegistryState, dynastyId: string): MutableDynasty {
  const dynasty = state.dynasties.get(dynastyId);
  if (dynasty === undefined) throw dynastyNotFound(dynastyId);
  return dynasty;
}
