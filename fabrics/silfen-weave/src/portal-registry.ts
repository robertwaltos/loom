/**
 * portal-registry.ts — Inter-world portal registry.
 *
 * Portals are directional transit conduits linking pairs of worlds.
 * Each portal tracks stability, energy cost, traversal history,
 * and enforces direction-sensitive uniqueness constraints.
 * Stability drives automatic status transitions: STABLE ↔ UNSTABLE → CLOSED.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface PortalClock {
  now(): bigint;
}

export interface PortalIdGenerator {
  generate(): string;
}

export interface PortalLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ── Types ────────────────────────────────────────────────────────

export type PortalId = string;
export type WorldId = string;

export type PortalStatus = 'STABLE' | 'UNSTABLE' | 'CLOSED' | 'COLLAPSED';

export type PortalError =
  | 'portal-not-found'
  | 'already-exists'
  | 'invalid-world'
  | 'portal-closed'
  | 'invalid-stability';

export interface Portal {
  readonly portalId: PortalId;
  readonly fromWorldId: WorldId;
  readonly toWorldId: WorldId;
  status: PortalStatus;
  stabilityScore: number;
  readonly energyCostKalon: bigint;
  traversalCount: number;
  readonly openedAt: bigint;
  lastTraversedAt: bigint | null;
}

export interface PortalTraversal {
  readonly traversalId: string;
  readonly portalId: PortalId;
  readonly entityId: string;
  readonly direction: 'FORWARD' | 'REVERSE';
  readonly occurredAt: bigint;
}

export interface PortalStats {
  readonly totalPortals: number;
  readonly stableCount: number;
  readonly unstableCount: number;
  readonly closedCount: number;
  readonly collapsedCount: number;
  readonly totalTraversals: number;
}

export interface PortalRegistrySystem {
  readonly openPortal: (
    fromWorldId: WorldId,
    toWorldId: WorldId,
    initialStability: number,
    energyCostKalon: bigint,
  ) => Portal | PortalError;
  readonly recordTraversal: (
    portalId: PortalId,
    entityId: string,
    direction: 'FORWARD' | 'REVERSE',
  ) => { success: true; traversal: PortalTraversal } | { success: false; error: PortalError };
  readonly updateStability: (
    portalId: PortalId,
    newStability: number,
  ) => { success: true; portal: Portal } | { success: false; error: PortalError };
  readonly closePortal: (
    portalId: PortalId,
  ) => { success: true } | { success: false; error: PortalError };
  readonly collapsePortal: (
    portalId: PortalId,
  ) => { success: true } | { success: false; error: PortalError };
  readonly getPortal: (portalId: PortalId) => Portal | undefined;
  readonly listPortals: (worldId?: WorldId) => ReadonlyArray<Portal>;
  readonly getTraversalHistory: (
    portalId: PortalId,
    limit: number,
  ) => ReadonlyArray<PortalTraversal>;
  readonly getStats: () => PortalStats;
}

// ── State ────────────────────────────────────────────────────────

interface PortalRegistryState {
  readonly portals: Map<PortalId, Portal>;
  readonly traversals: PortalTraversal[];
  readonly clock: PortalClock;
  readonly idGen: PortalIdGenerator;
  readonly logger: PortalLogger;
}

// ── Helpers ──────────────────────────────────────────────────────

function stabilityToStatus(score: number): PortalStatus {
  if (score <= 0) return 'CLOSED';
  if (score < 25) return 'UNSTABLE';
  return 'STABLE';
}

function pairKey(from: WorldId, to: WorldId): string {
  return `${from}::${to}`;
}

function hasPair(portals: Map<PortalId, Portal>, from: WorldId, to: WorldId): boolean {
  for (const p of portals.values()) {
    if (p.fromWorldId === from && p.toWorldId === to) return true;
  }
  return false;
}

// ── Operations ───────────────────────────────────────────────────

function validateOpenPortal(
  state: PortalRegistryState,
  fromWorldId: WorldId,
  toWorldId: WorldId,
  initialStability: number,
): PortalError | null {
  if (fromWorldId === toWorldId) {
    state.logger.error('Portal cannot connect world to itself: ' + fromWorldId);
    return 'invalid-world';
  }
  if (initialStability < 0 || initialStability > 100) {
    state.logger.error('Stability out of range [0,100]: ' + String(initialStability));
    return 'invalid-stability';
  }
  if (hasPair(state.portals, fromWorldId, toWorldId)) {
    state.logger.warn('Portal already exists: ' + pairKey(fromWorldId, toWorldId));
    return 'already-exists';
  }
  return null;
}

function openPortal(
  state: PortalRegistryState,
  fromWorldId: WorldId,
  toWorldId: WorldId,
  initialStability: number,
  energyCostKalon: bigint,
): Portal | PortalError {
  const err = validateOpenPortal(state, fromWorldId, toWorldId, initialStability);
  if (err !== null) return err;
  const portal: Portal = {
    portalId: state.idGen.generate(),
    fromWorldId,
    toWorldId,
    status: stabilityToStatus(initialStability),
    stabilityScore: initialStability,
    energyCostKalon,
    traversalCount: 0,
    openedAt: state.clock.now(),
    lastTraversedAt: null,
  };
  state.portals.set(portal.portalId, portal);
  state.logger.info('Opened portal: ' + portal.portalId);
  return portal;
}

function recordTraversal(
  state: PortalRegistryState,
  portalId: PortalId,
  entityId: string,
  direction: 'FORWARD' | 'REVERSE',
): { success: true; traversal: PortalTraversal } | { success: false; error: PortalError } {
  const portal = state.portals.get(portalId);
  if (portal === undefined) return { success: false, error: 'portal-not-found' };
  if (portal.status === 'CLOSED' || portal.status === 'COLLAPSED') {
    return { success: false, error: 'portal-closed' };
  }

  const traversal: PortalTraversal = {
    traversalId: state.idGen.generate(),
    portalId,
    entityId,
    direction,
    occurredAt: state.clock.now(),
  };
  state.traversals.push(traversal);
  portal.traversalCount += 1;
  portal.lastTraversedAt = traversal.occurredAt;
  state.logger.info('Traversal recorded: ' + traversal.traversalId);
  return { success: true, traversal };
}

function updateStability(
  state: PortalRegistryState,
  portalId: PortalId,
  newStability: number,
): { success: true; portal: Portal } | { success: false; error: PortalError } {
  const portal = state.portals.get(portalId);
  if (portal === undefined) return { success: false, error: 'portal-not-found' };
  if (newStability < 0 || newStability > 100) {
    return { success: false, error: 'invalid-stability' };
  }

  portal.stabilityScore = newStability;
  portal.status = stabilityToStatus(newStability);
  state.logger.info('Stability updated for ' + portalId + ': ' + String(newStability));
  return { success: true, portal };
}

function closePortal(
  state: PortalRegistryState,
  portalId: PortalId,
): { success: true } | { success: false; error: PortalError } {
  const portal = state.portals.get(portalId);
  if (portal === undefined) return { success: false, error: 'portal-not-found' };
  portal.status = 'CLOSED';
  state.logger.info('Portal closed: ' + portalId);
  return { success: true };
}

function collapsePortal(
  state: PortalRegistryState,
  portalId: PortalId,
): { success: true } | { success: false; error: PortalError } {
  const portal = state.portals.get(portalId);
  if (portal === undefined) return { success: false, error: 'portal-not-found' };
  portal.status = 'COLLAPSED';
  state.logger.warn('Portal collapsed: ' + portalId);
  return { success: true };
}

function listPortals(state: PortalRegistryState, worldId?: WorldId): ReadonlyArray<Portal> {
  if (worldId === undefined) return Array.from(state.portals.values());
  const result: Portal[] = [];
  for (const p of state.portals.values()) {
    if (p.fromWorldId === worldId || p.toWorldId === worldId) result.push(p);
  }
  return result;
}

function getTraversalHistory(
  state: PortalRegistryState,
  portalId: PortalId,
  limit: number,
): ReadonlyArray<PortalTraversal> {
  const filtered = state.traversals.filter((t) => t.portalId === portalId);
  return filtered.slice(-limit);
}

function getStats(state: PortalRegistryState): PortalStats {
  let stableCount = 0;
  let unstableCount = 0;
  let closedCount = 0;
  let collapsedCount = 0;
  for (const p of state.portals.values()) {
    if (p.status === 'STABLE') stableCount++;
    else if (p.status === 'UNSTABLE') unstableCount++;
    else if (p.status === 'CLOSED') closedCount++;
    else collapsedCount++;
  }
  return {
    totalPortals: state.portals.size,
    stableCount,
    unstableCount,
    closedCount,
    collapsedCount,
    totalTraversals: state.traversals.length,
  };
}

// ── Factory ──────────────────────────────────────────────────────

export function createPortalRegistrySystem(deps: {
  clock: PortalClock;
  idGen: PortalIdGenerator;
  logger: PortalLogger;
}): PortalRegistrySystem {
  const state: PortalRegistryState = {
    portals: new Map(),
    traversals: [],
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    openPortal: (from, to, stability, cost) => openPortal(state, from, to, stability, cost),
    recordTraversal: (id, entity, dir) => recordTraversal(state, id, entity, dir),
    updateStability: (id, s) => updateStability(state, id, s),
    closePortal: (id) => closePortal(state, id),
    collapsePortal: (id) => collapsePortal(state, id),
    getPortal: (id) => state.portals.get(id),
    listPortals: (worldId) => listPortals(state, worldId),
    getTraversalHistory: (id, limit) => getTraversalHistory(state, id, limit),
    getStats: () => getStats(state),
  };
}
