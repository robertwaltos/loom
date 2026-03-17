/**
 * System Health Check Service ΓÇö Comprehensive fabric health aggregator.
 *
 * Registers async health checkers per fabric, aggregates results,
 * and computes overall system health as worst-of-all-fabrics.
 * Supports timeout protection so a hung checker cannot stall the system.
 *
 * "The Inspector weaves quality into every thread."
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface FabricHealth {
  readonly fabric: string;
  readonly status: HealthStatus;
  readonly latencyMs: number;
  readonly details: Record<string, unknown>;
  readonly checkedAt: string; // ISO timestamp
}

export interface KalonHealthSummary {
  readonly totalSupply: bigint;
  readonly circulationVelocity: 'normal' | 'slow' | 'fast';
  readonly commonsBalance: bigint;
}

export interface ChronicleHealthSummary {
  readonly entryCount: number;
  readonly lastEntryAt: string;
  readonly hashChainValid: boolean;
}

export interface LatticeHealthSummary {
  readonly worldsOnline: number;
  readonly averageIntegrity: number; // 0-100
  readonly degradedWorlds: readonly string[]; // worldIds with integrity < 40
}

export interface SystemHealth {
  readonly status: HealthStatus; // worst of all fabrics
  readonly version: string;
  readonly uptime: number; // seconds
  readonly fabrics: readonly FabricHealth[];
  readonly kalon: KalonHealthSummary;
  readonly chronicle: ChronicleHealthSummary;
  readonly lattice: LatticeHealthSummary;
}

// ΓöÇΓöÇΓöÇ Ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface HealthCheckPort {
  registerFabricChecker(fabric: string, checker: () => Promise<FabricHealth>): void;
  getSystemHealth(): Promise<SystemHealth>;
}

export interface SystemHealthServiceDeps {
  readonly version: string;
  readonly startedAt: number; // epoch ms
  readonly clock: { nowMs(): number };
  readonly checkerTimeoutMs: number;
  readonly kalonProvider: () => Promise<KalonHealthSummary>;
  readonly chronicleProvider: () => Promise<ChronicleHealthSummary>;
  readonly latticeProvider: () => Promise<LatticeHealthSummary>;
}

// ΓöÇΓöÇΓöÇ State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface ServiceState {
  readonly checkers: Map<string, () => Promise<FabricHealth>>;
  readonly deps: SystemHealthServiceDeps;
}

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createSystemHealthService(deps: SystemHealthServiceDeps): HealthCheckPort {
  const state: ServiceState = {
    checkers: new Map(),
    deps,
  };
  return {
    registerFabricChecker: (fabric, checker) => registerChecker(state, fabric, checker),
    getSystemHealth: () => buildSystemHealth(state),
  };
}

// ΓöÇΓöÇΓöÇ Registration ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function registerChecker(
  state: ServiceState,
  fabric: string,
  checker: () => Promise<FabricHealth>,
): void {
  state.checkers.set(fabric, checker);
}

// ΓöÇΓöÇΓöÇ Health Aggregation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

async function buildSystemHealth(state: ServiceState): Promise<SystemHealth> {
  const fabrics = await runAllCheckers(state);
  const [kalon, chronicle, lattice] = await Promise.all([
    state.deps.kalonProvider(),
    state.deps.chronicleProvider(),
    state.deps.latticeProvider(),
  ]);
  const overallStatus = computeWorstStatus(fabrics);
  const uptimeSecs = (state.deps.clock.nowMs() - state.deps.startedAt) / 1000;

  return {
    status: overallStatus,
    version: state.deps.version,
    uptime: Math.floor(uptimeSecs),
    fabrics,
    kalon,
    chronicle,
    lattice,
  };
}

async function runAllCheckers(state: ServiceState): Promise<FabricHealth[]> {
  const entries = [...state.checkers.entries()];
  const results = await Promise.all(
    entries.map(([fabric, checker]) =>
      runCheckerWithTimeout(fabric, checker, state.deps.checkerTimeoutMs),
    ),
  );
  return results;
}

async function runCheckerWithTimeout(
  fabric: string,
  checker: () => Promise<FabricHealth>,
  timeoutMs: number,
): Promise<FabricHealth> {
  const start = Date.now();
  try {
    const result = await Promise.race([checker(), timeoutAfter(timeoutMs, fabric)]);
    return result;
  } catch {
    return buildTimeoutHealth(fabric, Date.now() - start);
  }
}

function timeoutAfter(ms: number, fabric: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Health checker for ${fabric} timed out after ${ms}ms`)), ms),
  );
}

function buildTimeoutHealth(fabric: string, latencyMs: number): FabricHealth {
  return {
    fabric,
    status: 'unhealthy',
    latencyMs,
    details: { reason: 'checker_timeout' },
    checkedAt: new Date().toISOString(),
  };
}

// ΓöÇΓöÇΓöÇ Status Computation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function computeWorstStatus(fabrics: readonly FabricHealth[]): HealthStatus {
  if (fabrics.some((f) => f.status === 'unhealthy')) return 'unhealthy';
  if (fabrics.some((f) => f.status === 'degraded')) return 'degraded';
  return 'healthy';
}
