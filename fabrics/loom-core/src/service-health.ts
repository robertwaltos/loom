/**
 * service-health.ts — Service health aggregator.
 *
 * Collects health reports from registered services, aggregates
 * overall system health, and provides a unified health endpoint
 * for monitoring dashboards.
 */

// ── Ports ────────────────────────────────────────────────────────

interface HealthClock {
  readonly nowMicroseconds: () => number;
}

interface ServiceHealthDeps {
  readonly clock: HealthClock;
}

// ── Types ────────────────────────────────────────────────────────

type HealthLevel = 'healthy' | 'degraded' | 'unhealthy';

interface ServiceHealthReport {
  readonly serviceId: string;
  readonly name: string;
  readonly level: HealthLevel;
  readonly message: string;
  readonly reportedAt: number;
}

interface ReportHealthParams {
  readonly serviceId: string;
  readonly level: HealthLevel;
  readonly message: string;
}

interface RegisterHealthServiceParams {
  readonly serviceId: string;
  readonly name: string;
}

interface AggregateHealth {
  readonly overall: HealthLevel;
  readonly services: readonly ServiceHealthReport[];
  readonly aggregatedAt: number;
}

interface ServiceHealthStats {
  readonly totalServices: number;
  readonly healthyCount: number;
  readonly degradedCount: number;
  readonly unhealthyCount: number;
}

interface ServiceHealthAggregator {
  readonly register: (params: RegisterHealthServiceParams) => boolean;
  readonly report: (params: ReportHealthParams) => boolean;
  readonly getServiceHealth: (serviceId: string) => ServiceHealthReport | undefined;
  readonly aggregate: () => AggregateHealth;
  readonly getStats: () => ServiceHealthStats;
}

// ── State ────────────────────────────────────────────────────────

interface HealthEntry {
  readonly serviceId: string;
  readonly name: string;
  level: HealthLevel;
  message: string;
  reportedAt: number;
}

interface HealthState {
  readonly deps: ServiceHealthDeps;
  readonly services: Map<string, HealthEntry>;
}

// ── Helpers ──────────────────────────────────────────────────────

function worstLevel(a: HealthLevel, b: HealthLevel): HealthLevel {
  if (a === 'unhealthy' || b === 'unhealthy') return 'unhealthy';
  if (a === 'degraded' || b === 'degraded') return 'degraded';
  return 'healthy';
}

// ── Operations ───────────────────────────────────────────────────

function reportImpl(state: HealthState, params: ReportHealthParams): boolean {
  const entry = state.services.get(params.serviceId);
  if (!entry) return false;
  entry.level = params.level;
  entry.message = params.message;
  entry.reportedAt = state.deps.clock.nowMicroseconds();
  return true;
}

function toReport(entry: HealthEntry): ServiceHealthReport {
  return {
    serviceId: entry.serviceId,
    name: entry.name,
    level: entry.level,
    message: entry.message,
    reportedAt: entry.reportedAt,
  };
}

function aggregateImpl(state: HealthState): AggregateHealth {
  const reports: ServiceHealthReport[] = [];
  let overall: HealthLevel = 'healthy';
  for (const entry of state.services.values()) {
    reports.push(toReport(entry));
    overall = worstLevel(overall, entry.level);
  }
  return { overall, services: reports, aggregatedAt: state.deps.clock.nowMicroseconds() };
}

function getStatsImpl(state: HealthState): ServiceHealthStats {
  let healthy = 0;
  let degraded = 0;
  let unhealthy = 0;
  for (const e of state.services.values()) {
    if (e.level === 'healthy') healthy++;
    else if (e.level === 'degraded') degraded++;
    else unhealthy++;
  }
  return {
    totalServices: state.services.size,
    healthyCount: healthy,
    degradedCount: degraded,
    unhealthyCount: unhealthy,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createServiceHealthAggregator(deps: ServiceHealthDeps): ServiceHealthAggregator {
  const state: HealthState = { deps, services: new Map() };
  return {
    register: (p) => {
      if (state.services.has(p.serviceId)) return false;
      state.services.set(p.serviceId, {
        serviceId: p.serviceId,
        name: p.name,
        level: 'healthy',
        message: '',
        reportedAt: deps.clock.nowMicroseconds(),
      });
      return true;
    },
    report: (p) => reportImpl(state, p),
    getServiceHealth: (id) => {
      const e = state.services.get(id);
      return e ? toReport(e) : undefined;
    },
    aggregate: () => aggregateImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createServiceHealthAggregator };
export type {
  ServiceHealthAggregator,
  ServiceHealthDeps,
  HealthLevel,
  ServiceHealthReport,
  ReportHealthParams,
  RegisterHealthServiceParams,
  AggregateHealth,
  ServiceHealthStats,
};
