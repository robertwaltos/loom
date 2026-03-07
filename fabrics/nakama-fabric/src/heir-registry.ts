/**
 * Heir Registry — Lineage declarations and heir claim orchestration.
 *
 * Bible v1.1 Part 8, v1.4: Legacy Protocols & Inheritance
 *
 * When a dynasty nears completion, its registered heirs have first right
 * to claim the legacy. The Heir Registry enforces:
 *   - Subscription tier limits on heir registration (Accord: 0, Patron: 1, Herald: 2)
 *   - One parent dynasty per heir claim (can't inherit from two simultaneously)
 *   - Claim validation against continuity state (must be 'completed')
 *   - Heir claim coordination with ContinuityEngine and DynastyRegistry
 *
 * "A dynasty without an heir is a story without a reader."
 */

import type { SubscriptionTier } from './dynasty.js';

// ─── Port Interfaces ────────────────────────────────────────────────

export interface HeirContinuityPort {
  registerHeir(dynastyId: string, heirDynastyId: string): void;
  removeHeir(dynastyId: string, heirDynastyId: string): void;
  activateHeir(completedDynastyId: string, heirDynastyId: string): void;
  getRecord(dynastyId: string): HeirContinuityRecord;
}

export interface HeirContinuityRecord {
  readonly state: string;
  readonly heirDynastyIds: ReadonlyArray<string>;
}

export interface HeirDynastyPort {
  get(dynastyId: string): HeirDynastyInfo;
  exists(dynastyId: string): boolean;
}

export interface HeirDynastyInfo {
  readonly dynastyId: string;
  readonly subscriptionTier: SubscriptionTier;
  readonly status: string;
}

export interface HeirChroniclePort {
  append(entry: HeirChronicleEntry): string;
}

export interface HeirChronicleEntry {
  readonly category: string;
  readonly subject: string;
  readonly content: string;
  readonly worldId: string;
}

// ─── Types ──────────────────────────────────────────────────────────

export interface HeirDeclaration {
  readonly parentDynastyId: string;
  readonly heirDynastyId: string;
  readonly declaredAt: number;
}

export interface HeirClaimResult {
  readonly parentDynastyId: string;
  readonly heirDynastyId: string;
  readonly chronicleEntryId: string;
}

export interface HeirRegistry {
  declareHeir(parentDynastyId: string, heirDynastyId: string): HeirDeclaration;
  revokeHeir(parentDynastyId: string, heirDynastyId: string): void;
  claimInheritance(parentDynastyId: string, heirDynastyId: string): HeirClaimResult;
  getHeirs(parentDynastyId: string): ReadonlyArray<HeirDeclaration>;
  getParents(heirDynastyId: string): ReadonlyArray<string>;
  canDeclareHeir(parentDynastyId: string): boolean;
  hasActiveInheritance(heirDynastyId: string): boolean;
  count(): number;
}

export interface HeirRegistryDeps {
  readonly continuity: HeirContinuityPort;
  readonly dynasty: HeirDynastyPort;
  readonly chronicle: HeirChroniclePort;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Constants ──────────────────────────────────────────────────────

export const MAX_HEIRS_BY_TIER: Readonly<Record<SubscriptionTier, number>> = {
  free: 0,
  accord: 0,
  patron: 1,
  herald: 2,
};

// ─── State ──────────────────────────────────────────────────────────

interface RegistryState {
  readonly declarations: Map<string, HeirDeclaration[]>; // parentId → heirs
  readonly parentIndex: Map<string, Set<string>>; // heirId → parentIds
  readonly activeInheritances: Set<string>; // heirIds with active claims
  readonly deps: HeirRegistryDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createHeirRegistry(deps: HeirRegistryDeps): HeirRegistry {
  const state: RegistryState = {
    declarations: new Map(),
    parentIndex: new Map(),
    activeInheritances: new Set(),
    deps,
  };

  return {
    declareHeir: (p, h) => declareHeirImpl(state, p, h),
    revokeHeir: (p, h) => { revokeHeirImpl(state, p, h); },
    claimInheritance: (p, h) => claimInheritanceImpl(state, p, h),
    getHeirs: (p) => getHeirsImpl(state, p),
    getParents: (h) => getParentsImpl(state, h),
    canDeclareHeir: (p) => canDeclareHeirImpl(state, p),
    hasActiveInheritance: (h) => state.activeInheritances.has(h),
    count: () => countDeclarations(state),
  };
}

// ─── Declaration ────────────────────────────────────────────────────

function declareHeirImpl(
  state: RegistryState,
  parentDynastyId: string,
  heirDynastyId: string,
): HeirDeclaration {
  validateDeclaration(state, parentDynastyId, heirDynastyId);

  const now = state.deps.clock.nowMicroseconds();
  const declaration: HeirDeclaration = {
    parentDynastyId,
    heirDynastyId,
    declaredAt: now,
  };

  addDeclaration(state, declaration);
  state.deps.continuity.registerHeir(parentDynastyId, heirDynastyId);
  return declaration;
}

function validateDeclaration(
  state: RegistryState,
  parentDynastyId: string,
  heirDynastyId: string,
): void {
  if (parentDynastyId === heirDynastyId) {
    throw new Error('A dynasty cannot be its own heir');
  }
  if (!state.deps.dynasty.exists(heirDynastyId)) {
    throw new Error('Heir dynasty ' + heirDynastyId + ' not found');
  }
  if (!canDeclareHeirImpl(state, parentDynastyId)) {
    throw new Error('Dynasty ' + parentDynastyId + ' has reached heir limit');
  }
  if (isDuplicate(state, parentDynastyId, heirDynastyId)) {
    throw new Error('Heir ' + heirDynastyId + ' already declared');
  }
}

function isDuplicate(
  state: RegistryState,
  parentId: string,
  heirId: string,
): boolean {
  const heirs = state.declarations.get(parentId);
  if (heirs === undefined) return false;
  return heirs.some((d) => d.heirDynastyId === heirId);
}

function addDeclaration(state: RegistryState, decl: HeirDeclaration): void {
  const existing = state.declarations.get(decl.parentDynastyId);
  if (existing !== undefined) {
    existing.push(decl);
  } else {
    state.declarations.set(decl.parentDynastyId, [decl]);
  }
  addParentIndex(state, decl.heirDynastyId, decl.parentDynastyId);
}

function addParentIndex(state: RegistryState, heirId: string, parentId: string): void {
  const parents = state.parentIndex.get(heirId);
  if (parents !== undefined) {
    parents.add(parentId);
  } else {
    state.parentIndex.set(heirId, new Set([parentId]));
  }
}

// ─── Revocation ─────────────────────────────────────────────────────

function revokeHeirImpl(
  state: RegistryState,
  parentDynastyId: string,
  heirDynastyId: string,
): void {
  const heirs = state.declarations.get(parentDynastyId);
  if (heirs === undefined) return;

  const filtered = heirs.filter((d) => d.heirDynastyId !== heirDynastyId);
  state.declarations.set(parentDynastyId, filtered);
  removeParentIndex(state, heirDynastyId, parentDynastyId);
  state.deps.continuity.removeHeir(parentDynastyId, heirDynastyId);
}

function removeParentIndex(
  state: RegistryState,
  heirId: string,
  parentId: string,
): void {
  const parents = state.parentIndex.get(heirId);
  if (parents === undefined) return;
  parents.delete(parentId);
  if (parents.size === 0) state.parentIndex.delete(heirId);
}

// ─── Claim ──────────────────────────────────────────────────────────

function claimInheritanceImpl(
  state: RegistryState,
  parentDynastyId: string,
  heirDynastyId: string,
): HeirClaimResult {
  validateClaim(state, parentDynastyId, heirDynastyId);

  state.deps.continuity.activateHeir(parentDynastyId, heirDynastyId);
  state.activeInheritances.add(heirDynastyId);

  const content = heirDynastyId + ' claims the legacy of ' + parentDynastyId;
  const chronicleEntryId = state.deps.chronicle.append({
    category: 'dynasty.heir',
    subject: parentDynastyId,
    content,
    worldId: '',
  });

  return { parentDynastyId, heirDynastyId, chronicleEntryId };
}

function validateClaim(
  state: RegistryState,
  parentDynastyId: string,
  heirDynastyId: string,
): void {
  const record = state.deps.continuity.getRecord(parentDynastyId);
  if (record.state !== 'completed') {
    throw new Error('Dynasty ' + parentDynastyId + ' is not completed');
  }
  if (!isRegisteredHeir(state, parentDynastyId, heirDynastyId)) {
    throw new Error('Heir ' + heirDynastyId + ' not registered for ' + parentDynastyId);
  }
  if (state.activeInheritances.has(heirDynastyId)) {
    throw new Error('Heir ' + heirDynastyId + ' already has an active inheritance');
  }
}

function isRegisteredHeir(
  state: RegistryState,
  parentId: string,
  heirId: string,
): boolean {
  const heirs = state.declarations.get(parentId);
  if (heirs === undefined) return false;
  return heirs.some((d) => d.heirDynastyId === heirId);
}

// ─── Queries ────────────────────────────────────────────────────────

function canDeclareHeirImpl(state: RegistryState, parentId: string): boolean {
  const dynasty = state.deps.dynasty.get(parentId);
  const limit = MAX_HEIRS_BY_TIER[dynasty.subscriptionTier];
  const current = state.declarations.get(parentId)?.length ?? 0;
  return current < limit;
}

function getHeirsImpl(
  state: RegistryState,
  parentId: string,
): ReadonlyArray<HeirDeclaration> {
  return state.declarations.get(parentId) ?? [];
}

function getParentsImpl(
  state: RegistryState,
  heirId: string,
): ReadonlyArray<string> {
  const parents = state.parentIndex.get(heirId);
  return parents !== undefined ? [...parents] : [];
}

function countDeclarations(state: RegistryState): number {
  let total = 0;
  for (const heirs of state.declarations.values()) {
    total += heirs.length;
  }
  return total;
}
