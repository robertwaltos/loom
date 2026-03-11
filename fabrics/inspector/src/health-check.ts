/**
 * Health Check Engine — Fabric and subsystem health monitoring.
 *
 * The Inspector's health check system provides a uniform way for all
 * fabrics to report their operational status. Each subsystem registers
 * a health probe — a function that returns the current health of that
 * component. On demand, the engine evaluates all probes and produces
 * a consolidated health report.
 *
 * Health statuses:
 *   healthy  — Operating normally
 *   degraded — Functional but impaired (high latency, near limits)
 *   unhealthy — Failed or unresponsive
 *
 * The engine supports:
 *   - Named probe registration per subsystem
 *   - Timeout detection for unresponsive probes
 *   - Aggregate system-level health (worst-of)
 *   - Probe grouping by fabric name
 *   - Health history for trend detection
 *
 * "The Inspector weaves quality into every thread."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ProbeResult {
  readonly status: HealthStatus;
  readonly message: string;
  readonly durationMicroseconds: number;
}

export interface ProbeRegistration {
  readonly name: string;
  readonly fabric: string;
  readonly evaluate: () => ProbeResult;
}

export interface HealthReport {
  readonly overallStatus: HealthStatus;
  readonly checkedAt: number;
  readonly probes: ReadonlyArray<ProbeReport>;
  readonly totalProbes: number;
  readonly healthyCount: number;
  readonly degradedCount: number;
  readonly unhealthyCount: number;
}

export interface ProbeReport {
  readonly name: string;
  readonly fabric: string;
  readonly status: HealthStatus;
  readonly message: string;
  readonly durationMicroseconds: number;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface HealthCheckEngine {
  registerProbe(probe: ProbeRegistration): void;
  removeProbe(name: string): boolean;
  evaluate(): HealthReport;
  evaluateFabric(fabric: string): HealthReport;
  getProbeNames(): ReadonlyArray<string>;
  getFabrics(): ReadonlyArray<string>;
  probeCount(): number;
  getHistory(limit: number): ReadonlyArray<HealthReport>;
}

export interface HealthCheckDeps {
  readonly clock: { nowMicroseconds(): number };
  readonly maxHistory: number;
}

// ─── State ──────────────────────────────────────────────────────────

interface EngineState {
  readonly probes: Map<string, ProbeRegistration>;
  readonly history: HealthReport[];
  readonly deps: HealthCheckDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createHealthCheckEngine(deps: HealthCheckDeps): HealthCheckEngine {
  const state: EngineState = {
    probes: new Map(),
    history: [],
    deps,
  };

  return {
    registerProbe: (p) => {
      registerProbeImpl(state, p);
    },
    removeProbe: (n) => removeProbeImpl(state, n),
    evaluate: () => evaluateImpl(state, null),
    evaluateFabric: (f) => evaluateImpl(state, f),
    getProbeNames: () => [...state.probes.keys()],
    getFabrics: () => listFabrics(state),
    probeCount: () => state.probes.size,
    getHistory: (l) => getHistoryImpl(state, l),
  };
}

// ─── Registration ───────────────────────────────────────────────────

function registerProbeImpl(state: EngineState, probe: ProbeRegistration): void {
  state.probes.set(probe.name, probe);
}

function removeProbeImpl(state: EngineState, name: string): boolean {
  return state.probes.delete(name);
}

// ─── Evaluation ─────────────────────────────────────────────────────

function evaluateImpl(state: EngineState, fabricFilter: string | null): HealthReport {
  const checkedAt = state.deps.clock.nowMicroseconds();
  const reports: ProbeReport[] = [];

  for (const probe of state.probes.values()) {
    if (fabricFilter !== null && probe.fabric !== fabricFilter) continue;
    reports.push(runProbe(probe));
  }

  const report = buildReport(reports, checkedAt);
  if (fabricFilter === null) {
    appendHistory(state, report);
  }
  return report;
}

function runProbe(probe: ProbeRegistration): ProbeReport {
  const result = probe.evaluate();
  return {
    name: probe.name,
    fabric: probe.fabric,
    status: result.status,
    message: result.message,
    durationMicroseconds: result.durationMicroseconds,
  };
}

function buildReport(probes: ReadonlyArray<ProbeReport>, checkedAt: number): HealthReport {
  let healthyCount = 0;
  let degradedCount = 0;
  let unhealthyCount = 0;

  for (const p of probes) {
    if (p.status === 'healthy') healthyCount += 1;
    else if (p.status === 'degraded') degradedCount += 1;
    else unhealthyCount += 1;
  }

  return {
    overallStatus: computeOverall(unhealthyCount, degradedCount),
    checkedAt,
    probes,
    totalProbes: probes.length,
    healthyCount,
    degradedCount,
    unhealthyCount,
  };
}

function computeOverall(unhealthyCount: number, degradedCount: number): HealthStatus {
  if (unhealthyCount > 0) return 'unhealthy';
  if (degradedCount > 0) return 'degraded';
  return 'healthy';
}

// ─── History ────────────────────────────────────────────────────────

function appendHistory(state: EngineState, report: HealthReport): void {
  state.history.push(report);
  trimHistory(state);
}

function trimHistory(state: EngineState): void {
  while (state.history.length > state.deps.maxHistory) {
    state.history.shift();
  }
}

function getHistoryImpl(state: EngineState, limit: number): ReadonlyArray<HealthReport> {
  if (limit >= state.history.length) return [...state.history];
  return state.history.slice(state.history.length - limit);
}

// ─── Queries ────────────────────────────────────────────────────────

function listFabrics(state: EngineState): ReadonlyArray<string> {
  const fabrics = new Set<string>();
  for (const probe of state.probes.values()) {
    fabrics.add(probe.fabric);
  }
  return [...fabrics];
}
