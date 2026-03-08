/**
 * uptime-monitor.ts — Service uptime tracking.
 *
 * Registers services, records heartbeats, tracks up/down state
 * transitions, calculates uptime percentage, and detects services
 * that have missed their heartbeat window.
 */

// ── Ports ────────────────────────────────────────────────────────

interface UptimeClock {
  readonly nowMicroseconds: () => number;
}

interface UptimeIdGenerator {
  readonly next: () => string;
}

interface UptimeMonitorDeps {
  readonly clock: UptimeClock;
  readonly idGenerator: UptimeIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type ServiceState = 'up' | 'down' | 'unknown';

interface ServiceRecord {
  readonly serviceId: string;
  readonly name: string;
  readonly heartbeatIntervalMicro: number;
  state: ServiceState;
  lastHeartbeatAt: number;
  readonly registeredAt: number;
  upMicro: number;
  downMicro: number;
  lastStateChangeAt: number;
}

interface RegisterServiceParams {
  readonly name: string;
  readonly heartbeatIntervalMicro: number;
}

interface UptimeSnapshot {
  readonly serviceId: string;
  readonly name: string;
  readonly state: ServiceState;
  readonly uptimePercent: number;
  readonly lastHeartbeatAt: number;
}

interface UptimeMonitorStats {
  readonly totalServices: number;
  readonly upCount: number;
  readonly downCount: number;
  readonly unknownCount: number;
}

interface UptimeMonitorService {
  readonly register: (params: RegisterServiceParams) => string;
  readonly heartbeat: (serviceId: string) => boolean;
  readonly markDown: (serviceId: string) => boolean;
  readonly getSnapshot: (serviceId: string) => UptimeSnapshot | undefined;
  readonly sweep: () => readonly string[];
  readonly getStats: () => UptimeMonitorStats;
}

// ── State ────────────────────────────────────────────────────────

interface UptimeState {
  readonly deps: UptimeMonitorDeps;
  readonly services: Map<string, ServiceRecord>;
}

// ── Helpers ──────────────────────────────────────────────────────

function accumulateTime(rec: ServiceRecord, now: number): void {
  const elapsed = now - rec.lastStateChangeAt;
  if (elapsed <= 0) return;
  if (rec.state === 'up') rec.upMicro += elapsed;
  else if (rec.state === 'down') rec.downMicro += elapsed;
  rec.lastStateChangeAt = now;
}

function calcUptimePercent(rec: ServiceRecord, now: number): number {
  let up = rec.upMicro;
  let down = rec.downMicro;
  const elapsed = now - rec.lastStateChangeAt;
  if (elapsed > 0) {
    if (rec.state === 'up') up += elapsed;
    else if (rec.state === 'down') down += elapsed;
  }
  const total = up + down;
  if (total === 0) return 0;
  return (up / total) * 100;
}

// ── Operations ───────────────────────────────────────────────────

function heartbeatImpl(state: UptimeState, serviceId: string): boolean {
  const rec = state.services.get(serviceId);
  if (!rec) return false;
  const now = state.deps.clock.nowMicroseconds();
  if (rec.state !== 'up') {
    accumulateTime(rec, now);
    rec.state = 'up';
  }
  rec.lastHeartbeatAt = now;
  return true;
}

function markDownImpl(state: UptimeState, serviceId: string): boolean {
  const rec = state.services.get(serviceId);
  if (!rec) return false;
  if (rec.state === 'down') return true;
  const now = state.deps.clock.nowMicroseconds();
  accumulateTime(rec, now);
  rec.state = 'down';
  return true;
}

function sweepImpl(state: UptimeState): readonly string[] {
  const now = state.deps.clock.nowMicroseconds();
  const stale: string[] = [];
  for (const rec of state.services.values()) {
    if (rec.state !== 'down' && now - rec.lastHeartbeatAt > rec.heartbeatIntervalMicro) {
      accumulateTime(rec, now);
      rec.state = 'down';
      stale.push(rec.serviceId);
    }
  }
  return stale;
}

function snapshotImpl(state: UptimeState, serviceId: string): UptimeSnapshot | undefined {
  const rec = state.services.get(serviceId);
  if (!rec) return undefined;
  const now = state.deps.clock.nowMicroseconds();
  return {
    serviceId: rec.serviceId,
    name: rec.name,
    state: rec.state,
    uptimePercent: calcUptimePercent(rec, now),
    lastHeartbeatAt: rec.lastHeartbeatAt,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createUptimeMonitor(deps: UptimeMonitorDeps): UptimeMonitorService {
  const state: UptimeState = { deps, services: new Map() };
  return {
    register: (p) => {
      const id = deps.idGenerator.next();
      const now = deps.clock.nowMicroseconds();
      state.services.set(id, {
        serviceId: id, name: p.name,
        heartbeatIntervalMicro: p.heartbeatIntervalMicro,
        state: 'unknown', lastHeartbeatAt: now,
        registeredAt: now, upMicro: 0, downMicro: 0,
        lastStateChangeAt: now,
      });
      return id;
    },
    heartbeat: (id) => heartbeatImpl(state, id),
    markDown: (id) => markDownImpl(state, id),
    getSnapshot: (id) => snapshotImpl(state, id),
    sweep: () => sweepImpl(state),
    getStats: () => {
      let up = 0; let down = 0; let unknown = 0;
      for (const r of state.services.values()) {
        if (r.state === 'up') up++;
        else if (r.state === 'down') down++;
        else unknown++;
      }
      return { totalServices: state.services.size, upCount: up, downCount: down, unknownCount: unknown };
    },
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createUptimeMonitor };
export type {
  UptimeMonitorService,
  UptimeMonitorDeps,
  ServiceState,
  RegisterServiceParams as UptimeRegisterParams,
  UptimeSnapshot,
  UptimeMonitorStats,
};
