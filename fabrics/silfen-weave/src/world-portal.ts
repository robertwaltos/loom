/**
 * world-portal.ts — World portal registry.
 *
 * Portals are fixed transit points between worlds. Each portal
 * links two worlds, has a stability rating, can be opened/closed,
 * and tracks usage counts.
 */

// ── Ports ────────────────────────────────────────────────────────

interface PortalClock {
  readonly nowMicroseconds: () => number;
}

interface PortalIdGenerator {
  readonly next: () => string;
}

interface WorldPortalDeps {
  readonly clock: PortalClock;
  readonly idGenerator: PortalIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type PortalStatus = 'open' | 'closed' | 'unstable';

interface Portal {
  readonly portalId: string;
  readonly worldA: string;
  readonly worldB: string;
  stability: number;
  status: PortalStatus;
  usageCount: number;
  readonly createdAt: number;
}

interface CreatePortalParams {
  readonly worldA: string;
  readonly worldB: string;
  readonly stability: number;
}

interface PortalSnapshot {
  readonly portalId: string;
  readonly worldA: string;
  readonly worldB: string;
  readonly stability: number;
  readonly status: PortalStatus;
  readonly usageCount: number;
}

interface WorldPortalStats {
  readonly totalPortals: number;
  readonly openPortals: number;
  readonly closedPortals: number;
  readonly unstablePortals: number;
}

interface WorldPortalRegistry {
  readonly create: (params: CreatePortalParams) => PortalSnapshot;
  readonly open: (portalId: string) => boolean;
  readonly close: (portalId: string) => boolean;
  readonly markUnstable: (portalId: string) => boolean;
  readonly use: (portalId: string) => boolean;
  readonly getPortal: (portalId: string) => PortalSnapshot | undefined;
  readonly getPortalsForWorld: (worldId: string) => readonly PortalSnapshot[];
  readonly getStats: () => WorldPortalStats;
}

// ── State ────────────────────────────────────────────────────────

interface PortalState {
  readonly deps: WorldPortalDeps;
  readonly portals: Map<string, Portal>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toSnapshot(p: Portal): PortalSnapshot {
  return {
    portalId: p.portalId,
    worldA: p.worldA,
    worldB: p.worldB,
    stability: p.stability,
    status: p.status,
    usageCount: p.usageCount,
  };
}

// ── Operations ───────────────────────────────────────────────────

function getPortalsForWorldImpl(state: PortalState, worldId: string): readonly PortalSnapshot[] {
  const results: PortalSnapshot[] = [];
  for (const p of state.portals.values()) {
    if (p.worldA === worldId || p.worldB === worldId) results.push(toSnapshot(p));
  }
  return results;
}

function getStatsImpl(state: PortalState): WorldPortalStats {
  let open = 0;
  let closed = 0;
  let unstable = 0;
  for (const p of state.portals.values()) {
    if (p.status === 'open') open++;
    else if (p.status === 'closed') closed++;
    else unstable++;
  }
  return {
    totalPortals: state.portals.size,
    openPortals: open,
    closedPortals: closed,
    unstablePortals: unstable,
  };
}

// ── Operations (continued) ───────────────────────────────────────

function createImpl(state: PortalState, p: CreatePortalParams): PortalSnapshot {
  const portal: Portal = {
    portalId: state.deps.idGenerator.next(),
    worldA: p.worldA,
    worldB: p.worldB,
    stability: p.stability,
    status: 'closed',
    usageCount: 0,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.portals.set(portal.portalId, portal);
  return toSnapshot(portal);
}

function openImpl(state: PortalState, id: string): boolean {
  const p = state.portals.get(id);
  if (!p || p.status === 'open') return false;
  p.status = 'open';
  return true;
}

function closeImpl(state: PortalState, id: string): boolean {
  const p = state.portals.get(id);
  if (!p || p.status === 'closed') return false;
  p.status = 'closed';
  return true;
}

function useImpl(state: PortalState, id: string): boolean {
  const p = state.portals.get(id);
  if (!p || p.status !== 'open') return false;
  p.usageCount++;
  return true;
}

// ── Factory ──────────────────────────────────────────────────────

function createWorldPortalRegistry(deps: WorldPortalDeps): WorldPortalRegistry {
  const state: PortalState = { deps, portals: new Map() };
  return {
    create: (p) => createImpl(state, p),
    open: (id) => openImpl(state, id),
    close: (id) => closeImpl(state, id),
    markUnstable: (id) => {
      const p = state.portals.get(id);
      if (!p) return false;
      p.status = 'unstable';
      return true;
    },
    use: (id) => useImpl(state, id),
    getPortal: (id) => {
      const p = state.portals.get(id);
      return p ? toSnapshot(p) : undefined;
    },
    getPortalsForWorld: (wId) => getPortalsForWorldImpl(state, wId),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createWorldPortalRegistry };
export type {
  WorldPortalRegistry,
  WorldPortalDeps,
  PortalStatus,
  PortalSnapshot,
  CreatePortalParams,
  WorldPortalStats,
};
