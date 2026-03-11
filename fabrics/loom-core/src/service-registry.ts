/**
 * service-registry.ts — Service discovery and health tracking.
 *
 * Registers named services with version metadata, tracks health
 * status, and provides discovery queries. Services can be activated,
 * suspended, and deregistered.
 */

// ── Ports ────────────────────────────────────────────────────────

interface ServiceClock {
  readonly nowMicroseconds: () => number;
}

interface ServiceIdGenerator {
  readonly next: () => string;
}

interface ServiceRegistryDeps {
  readonly clock: ServiceClock;
  readonly idGenerator: ServiceIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type ServiceStatus = 'active' | 'suspended' | 'degraded';

interface ServiceEntry {
  readonly serviceId: string;
  readonly name: string;
  readonly version: string;
  readonly status: ServiceStatus;
  readonly registeredAt: number;
  readonly lastHeartbeat: number;
}

interface RegisterServiceParams {
  readonly name: string;
  readonly version: string;
}

interface ServiceRegistryStats {
  readonly totalServices: number;
  readonly activeServices: number;
  readonly suspendedServices: number;
  readonly degradedServices: number;
}

interface ServiceRegistry {
  readonly register: (params: RegisterServiceParams) => ServiceEntry;
  readonly deregister: (serviceId: string) => boolean;
  readonly heartbeat: (serviceId: string) => boolean;
  readonly suspend: (serviceId: string) => boolean;
  readonly activate: (serviceId: string) => boolean;
  readonly markDegraded: (serviceId: string) => boolean;
  readonly getService: (serviceId: string) => ServiceEntry | undefined;
  readonly findByName: (name: string) => readonly ServiceEntry[];
  readonly listByStatus: (status: ServiceStatus) => readonly ServiceEntry[];
  readonly getStats: () => ServiceRegistryStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableService {
  readonly serviceId: string;
  readonly name: string;
  readonly version: string;
  status: ServiceStatus;
  readonly registeredAt: number;
  lastHeartbeat: number;
}

interface RegistryState {
  readonly deps: ServiceRegistryDeps;
  readonly services: Map<string, MutableService>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(s: MutableService): ServiceEntry {
  return {
    serviceId: s.serviceId,
    name: s.name,
    version: s.version,
    status: s.status,
    registeredAt: s.registeredAt,
    lastHeartbeat: s.lastHeartbeat,
  };
}

// ── Operations ───────────────────────────────────────────────────

function registerImpl(state: RegistryState, params: RegisterServiceParams): ServiceEntry {
  const now = state.deps.clock.nowMicroseconds();
  const svc: MutableService = {
    serviceId: state.deps.idGenerator.next(),
    name: params.name,
    version: params.version,
    status: 'active',
    registeredAt: now,
    lastHeartbeat: now,
  };
  state.services.set(svc.serviceId, svc);
  return toReadonly(svc);
}

function heartbeatImpl(state: RegistryState, serviceId: string): boolean {
  const svc = state.services.get(serviceId);
  if (!svc) return false;
  svc.lastHeartbeat = state.deps.clock.nowMicroseconds();
  return true;
}

function setStatusImpl(state: RegistryState, serviceId: string, status: ServiceStatus): boolean {
  const svc = state.services.get(serviceId);
  if (!svc) return false;
  svc.status = status;
  return true;
}

function findByNameImpl(state: RegistryState, name: string): ServiceEntry[] {
  const result: ServiceEntry[] = [];
  for (const svc of state.services.values()) {
    if (svc.name === name) result.push(toReadonly(svc));
  }
  return result;
}

function listByStatusImpl(state: RegistryState, status: ServiceStatus): ServiceEntry[] {
  const result: ServiceEntry[] = [];
  for (const svc of state.services.values()) {
    if (svc.status === status) result.push(toReadonly(svc));
  }
  return result;
}

function getStatsImpl(state: RegistryState): ServiceRegistryStats {
  let active = 0;
  let suspended = 0;
  let degraded = 0;
  for (const svc of state.services.values()) {
    if (svc.status === 'active') active++;
    else if (svc.status === 'suspended') suspended++;
    else degraded++;
  }
  return {
    totalServices: state.services.size,
    activeServices: active,
    suspendedServices: suspended,
    degradedServices: degraded,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createServiceRegistry(deps: ServiceRegistryDeps): ServiceRegistry {
  const state: RegistryState = { deps, services: new Map() };
  return {
    register: (p) => registerImpl(state, p),
    deregister: (id) => state.services.delete(id),
    heartbeat: (id) => heartbeatImpl(state, id),
    suspend: (id) => setStatusImpl(state, id, 'suspended'),
    activate: (id) => setStatusImpl(state, id, 'active'),
    markDegraded: (id) => setStatusImpl(state, id, 'degraded'),
    getService: (id) => {
      const s = state.services.get(id);
      return s ? toReadonly(s) : undefined;
    },
    findByName: (name) => findByNameImpl(state, name),
    listByStatus: (s) => listByStatusImpl(state, s),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createServiceRegistry };
export type {
  ServiceRegistry,
  ServiceRegistryDeps,
  ServiceEntry,
  ServiceStatus,
  RegisterServiceParams,
  ServiceRegistryStats,
};
