/**
 * Inspector Integration — Health probes for fabric orchestrators.
 *
 * Creates health probes that report operational status of each
 * fabric orchestrator into the Inspector's HealthCheckEngine.
 * Probes are lightweight functions that check tick counts and
 * key metrics without introducing coupling between fabrics.
 *
 * All inspector types are duplicated as local ports to avoid
 * importing the inspector package directly.
 */

// ── Inspector Port Interfaces ───────────────────────────────────

export type InspectorHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface InspectorProbeResult {
  readonly status: InspectorHealthStatus;
  readonly message: string;
  readonly durationMicroseconds: number;
}

export interface InspectorProbeRegistration {
  readonly name: string;
  readonly fabric: string;
  readonly evaluate: () => InspectorProbeResult;
}

export interface InspectorHealthPort {
  readonly registerProbe: (probe: InspectorProbeRegistration) => void;
}

// ── Fabric Stats Ports ──────────────────────────────────────────

export interface NakamaHealthPort {
  readonly getTickCount: () => number;
}

export interface ShuttleHealthPort {
  readonly getTickCount: () => number;
  readonly getStats: () => { readonly totalNpcsProcessed: number };
}

export interface WeaveHealthPort {
  readonly getTickCount: () => number;
  readonly getStats: () => {
    readonly totalTransitsCompleted: number;
    readonly totalTransitsAborted: number;
  };
}

export interface ConnectionHealthPort {
  readonly getStats: () => {
    readonly activeConnections: number;
    readonly pendingConnections: number;
  };
}

export interface BridgeHealthPort {
  readonly getStats: () => { readonly totalPushes: number };
}

// ── Probe Builder Config ────────────────────────────────────────

export interface InspectorIntegrationDeps {
  readonly health: InspectorHealthPort;
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly nakama?: NakamaHealthPort;
  readonly shuttle?: ShuttleHealthPort;
  readonly weave?: WeaveHealthPort;
  readonly connections?: ConnectionHealthPort;
  readonly bridge?: BridgeHealthPort;
}

// ── Factory ─────────────────────────────────────────────────────

function registerFabricHealthProbes(deps: InspectorIntegrationDeps): void {
  if (deps.nakama !== undefined) registerNakamaProbe(deps);
  if (deps.shuttle !== undefined) registerShuttleProbe(deps);
  if (deps.weave !== undefined) registerWeaveProbe(deps);
  if (deps.connections !== undefined) registerConnectionProbe(deps);
  if (deps.bridge !== undefined) registerBridgeProbe(deps);
}

// ── Probe Builders ──────────────────────────────────────────────

function registerNakamaProbe(deps: InspectorIntegrationDeps): void {
  const nakama = deps.nakama;
  if (nakama === undefined) return;
  deps.health.registerProbe({
    name: 'nakama-orchestrator',
    fabric: 'nakama-fabric',
    evaluate: () => buildTickProbe(deps.clock, nakama.getTickCount()),
  });
}

function registerShuttleProbe(deps: InspectorIntegrationDeps): void {
  const shuttle = deps.shuttle;
  if (shuttle === undefined) return;
  deps.health.registerProbe({
    name: 'shuttle-orchestrator',
    fabric: 'shuttle',
    evaluate: () => buildShuttleProbeResult(deps.clock, shuttle),
  });
}

function registerWeaveProbe(deps: InspectorIntegrationDeps): void {
  const weave = deps.weave;
  if (weave === undefined) return;
  deps.health.registerProbe({
    name: 'weave-orchestrator',
    fabric: 'silfen-weave',
    evaluate: () => buildWeaveProbeResult(deps.clock, weave),
  });
}

function registerConnectionProbe(deps: InspectorIntegrationDeps): void {
  const connections = deps.connections;
  if (connections === undefined) return;
  deps.health.registerProbe({
    name: 'player-connections',
    fabric: 'loom-core',
    evaluate: () => buildConnectionProbeResult(deps.clock, connections),
  });
}

function registerBridgeProbe(deps: InspectorIntegrationDeps): void {
  const bridge = deps.bridge;
  if (bridge === undefined) return;
  deps.health.registerProbe({
    name: 'bridge-service',
    fabric: 'loom-core',
    evaluate: () => buildBridgeProbeResult(deps.clock, bridge),
  });
}

// ── Probe Result Builders ───────────────────────────────────────

function buildTickProbe(
  clock: { readonly nowMicroseconds: () => number },
  tickCount: number,
): InspectorProbeResult {
  const start = clock.nowMicroseconds();
  const status: InspectorHealthStatus = tickCount > 0 ? 'healthy' : 'degraded';
  const message = 'Tick count: ' + String(tickCount);
  return { status, message, durationMicroseconds: clock.nowMicroseconds() - start };
}

function buildShuttleProbeResult(
  clock: { readonly nowMicroseconds: () => number },
  shuttle: ShuttleHealthPort,
): InspectorProbeResult {
  const start = clock.nowMicroseconds();
  const stats = shuttle.getStats();
  const ticks = shuttle.getTickCount();
  const status: InspectorHealthStatus = ticks > 0 ? 'healthy' : 'degraded';
  const msg = 'Ticks: ' + String(ticks) + ', NPCs: ' + String(stats.totalNpcsProcessed);
  return { status, message: msg, durationMicroseconds: clock.nowMicroseconds() - start };
}

function buildWeaveProbeResult(
  clock: { readonly nowMicroseconds: () => number },
  weave: WeaveHealthPort,
): InspectorProbeResult {
  const start = clock.nowMicroseconds();
  const stats = weave.getStats();
  const ticks = weave.getTickCount();
  const abortRate = computeAbortRate(stats);
  const status = classifyWeaveHealth(ticks, abortRate);
  const msg = buildWeaveMessage(ticks, stats, abortRate);
  return { status, message: msg, durationMicroseconds: clock.nowMicroseconds() - start };
}

function computeAbortRate(stats: {
  readonly totalTransitsCompleted: number;
  readonly totalTransitsAborted: number;
}): number {
  const total = stats.totalTransitsCompleted + stats.totalTransitsAborted;
  if (total === 0) return 0;
  return stats.totalTransitsAborted / total;
}

function classifyWeaveHealth(ticks: number, abortRate: number): InspectorHealthStatus {
  if (ticks === 0) return 'degraded';
  if (abortRate > 0.5) return 'unhealthy';
  if (abortRate > 0.2) return 'degraded';
  return 'healthy';
}

function buildWeaveMessage(
  ticks: number,
  stats: { readonly totalTransitsCompleted: number; readonly totalTransitsAborted: number },
  abortRate: number,
): string {
  const rate = (abortRate * 100).toFixed(1);
  return 'Ticks: ' + String(ticks) +
    ', Completed: ' + String(stats.totalTransitsCompleted) +
    ', Aborted: ' + String(stats.totalTransitsAborted) +
    ', Abort rate: ' + rate + '%';
}

function buildConnectionProbeResult(
  clock: { readonly nowMicroseconds: () => number },
  connections: ConnectionHealthPort,
): InspectorProbeResult {
  const start = clock.nowMicroseconds();
  const stats = connections.getStats();
  const msg = 'Active: ' + String(stats.activeConnections) +
    ', Pending: ' + String(stats.pendingConnections);
  return { status: 'healthy', message: msg, durationMicroseconds: clock.nowMicroseconds() - start };
}

function buildBridgeProbeResult(
  clock: { readonly nowMicroseconds: () => number },
  bridge: BridgeHealthPort,
): InspectorProbeResult {
  const start = clock.nowMicroseconds();
  const stats = bridge.getStats();
  const status: InspectorHealthStatus = stats.totalPushes > 0 ? 'healthy' : 'degraded';
  const msg = 'Total pushes: ' + String(stats.totalPushes);
  return { status, message: msg, durationMicroseconds: clock.nowMicroseconds() - start };
}

// ── Exports ─────────────────────────────────────────────────────

export { registerFabricHealthProbes };
