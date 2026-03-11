/**
 * SLA Monitor System — Service Level Agreement tracking with violation detection.
 *
 * Tracks SLAs per service and metric type. Reports violations on metric ingestion.
 * Status thresholds: COMPLIANT → AT_RISK → VIOLATED with hysteresis margins.
 *
 * "The Inspector holds every thread to account."
 *
 * Fabric: inspector
 * Thread tier: 1
 */

// ─── Port Interfaces ──────────────────────────────────────────────────────────

interface SLAMonitorClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface SLAMonitorIdGenPort {
  readonly next: () => string;
}

interface SLAMonitorLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type SLAId = string;
export type ServiceId = string;

export type SLAError =
  | 'sla-not-found'
  | 'service-not-found'
  | 'already-registered'
  | 'invalid-target'
  | 'invalid-window';

export type SLAStatus = 'COMPLIANT' | 'AT_RISK' | 'VIOLATED';

export type SLAMetricType = 'UPTIME' | 'LATENCY_P99' | 'ERROR_RATE' | 'THROUGHPUT';

const VALID_WINDOWS = ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type SLAWindow = (typeof VALID_WINDOWS)[number];

export interface SLA {
  readonly slaId: SLAId;
  readonly serviceId: ServiceId;
  readonly metric: SLAMetricType;
  readonly target: number;
  readonly window: SLAWindow;
  status: SLAStatus;
  currentValue: number;
  readonly createdAt: bigint;
}

export interface SLAViolation {
  readonly violationId: string;
  readonly slaId: SLAId;
  readonly serviceId: ServiceId;
  readonly metric: SLAMetricType;
  readonly targetValue: number;
  readonly actualValue: number;
  readonly detectedAt: bigint;
}

export interface SLAReport {
  readonly serviceId: ServiceId;
  readonly totalSLAs: number;
  readonly compliant: number;
  readonly atRisk: number;
  readonly violated: number;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface SLAMonitorSystem {
  registerService(serviceId: ServiceId): { success: true } | { success: false; error: SLAError };
  createSLA(
    serviceId: ServiceId,
    metric: SLAMetricType,
    target: number,
    window: SLAWindow,
  ): SLA | SLAError;
  reportMetric(
    serviceId: ServiceId,
    metric: SLAMetricType,
    value: number,
  ):
    | { success: true; violations: ReadonlyArray<SLAViolation> }
    | { success: false; error: SLAError };
  getSLAReport(serviceId: ServiceId): SLAReport | undefined;
  getSLA(slaId: SLAId): SLA | undefined;
  listViolations(serviceId: ServiceId, limit: number): ReadonlyArray<SLAViolation>;
}

// ─── Deps ─────────────────────────────────────────────────────────────────────

export interface SLAMonitorSystemDeps {
  readonly clock: SLAMonitorClockPort;
  readonly idGen: SLAMonitorIdGenPort;
  readonly logger: SLAMonitorLoggerPort;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface MonitorState {
  readonly services: Set<ServiceId>;
  readonly slas: Map<SLAId, SLA>;
  readonly violations: SLAViolation[];
  readonly deps: SLAMonitorSystemDeps;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createSLAMonitorSystem(deps: SLAMonitorSystemDeps): SLAMonitorSystem {
  const state: MonitorState = {
    services: new Set(),
    slas: new Map(),
    violations: [],
    deps,
  };

  return {
    registerService: (serviceId) => registerServiceImpl(state, serviceId),
    createSLA: (serviceId, metric, target, window) =>
      createSLAImpl(state, serviceId, metric, target, window),
    reportMetric: (serviceId, metric, value) => reportMetricImpl(state, serviceId, metric, value),
    getSLAReport: (serviceId) => getSLAReportImpl(state, serviceId),
    getSLA: (slaId) => state.slas.get(slaId),
    listViolations: (serviceId, limit) => listViolationsImpl(state, serviceId, limit),
  };
}

// ─── Register Service ─────────────────────────────────────────────────────────

function registerServiceImpl(
  state: MonitorState,
  serviceId: ServiceId,
): { success: true } | { success: false; error: SLAError } {
  if (state.services.has(serviceId)) return { success: false, error: 'already-registered' };
  state.services.add(serviceId);
  state.deps.logger.info('sla-service-registered', { serviceId });
  return { success: true };
}

// ─── Create SLA ───────────────────────────────────────────────────────────────

function createSLAImpl(
  state: MonitorState,
  serviceId: ServiceId,
  metric: SLAMetricType,
  target: number,
  window: SLAWindow,
): SLA | SLAError {
  if (!state.services.has(serviceId)) return 'service-not-found';
  if (!isValidWindow(window)) return 'invalid-window';
  if (!isValidTarget(metric, target)) return 'invalid-target';

  const slaId = state.deps.idGen.next();
  const sla: SLA = {
    slaId,
    serviceId,
    metric,
    target,
    window,
    status: 'COMPLIANT',
    currentValue: 0,
    createdAt: state.deps.clock.nowMicroseconds(),
  };

  state.slas.set(slaId, sla);
  state.deps.logger.info('sla-created', { slaId, serviceId, metric, target });
  return sla;
}

function isValidWindow(window: string): window is SLAWindow {
  return (VALID_WINDOWS as readonly string[]).includes(window);
}

function isValidTarget(metric: SLAMetricType, target: number): boolean {
  switch (metric) {
    case 'UPTIME':
      return target >= 0 && target <= 100;
    case 'ERROR_RATE':
      return target >= 0 && target <= 100;
    case 'LATENCY_P99':
      return target > 0;
    case 'THROUGHPUT':
      return target > 0;
  }
}

// ─── Report Metric ────────────────────────────────────────────────────────────

function reportMetricImpl(
  state: MonitorState,
  serviceId: ServiceId,
  metric: SLAMetricType,
  value: number,
):
  | { success: true; violations: ReadonlyArray<SLAViolation> }
  | { success: false; error: SLAError } {
  if (!state.services.has(serviceId)) return { success: false, error: 'service-not-found' };

  const now = state.deps.clock.nowMicroseconds();
  const newViolations: SLAViolation[] = [];

  for (const sla of state.slas.values()) {
    if (sla.serviceId !== serviceId || sla.metric !== metric) continue;

    const prevStatus = sla.status;
    sla.currentValue = value;
    sla.status = computeStatus(metric, value, sla.target);

    if (sla.status === 'VIOLATED' && prevStatus !== 'VIOLATED') {
      const violation = buildViolation(state.deps.idGen.next(), sla, value, now);
      state.violations.push(violation);
      newViolations.push(violation);
      state.deps.logger.warn('sla-violated', {
        slaId: sla.slaId,
        serviceId,
        metric,
        value,
        target: sla.target,
      });
    }
  }

  return { success: true, violations: newViolations };
}

function computeStatus(metric: SLAMetricType, value: number, target: number): SLAStatus {
  if (isHigherBetter(metric)) {
    const ratio = value / target;
    if (ratio >= 0.95) return 'COMPLIANT';
    if (ratio >= 0.8) return 'AT_RISK';
    return 'VIOLATED';
  }
  if (value <= target) return 'COMPLIANT';
  if (value <= target * 1.05) return 'AT_RISK';
  return 'VIOLATED';
}

function isHigherBetter(metric: SLAMetricType): boolean {
  return metric === 'UPTIME' || metric === 'THROUGHPUT';
}

function buildViolation(
  violationId: string,
  sla: SLA,
  actualValue: number,
  detectedAt: bigint,
): SLAViolation {
  return {
    violationId,
    slaId: sla.slaId,
    serviceId: sla.serviceId,
    metric: sla.metric,
    targetValue: sla.target,
    actualValue,
    detectedAt,
  };
}

// ─── SLA Report ───────────────────────────────────────────────────────────────

function getSLAReportImpl(state: MonitorState, serviceId: ServiceId): SLAReport | undefined {
  if (!state.services.has(serviceId)) return undefined;

  const serviceSLAs = [...state.slas.values()].filter((s) => s.serviceId === serviceId);
  const compliant = serviceSLAs.filter((s) => s.status === 'COMPLIANT').length;
  const atRisk = serviceSLAs.filter((s) => s.status === 'AT_RISK').length;
  const violated = serviceSLAs.filter((s) => s.status === 'VIOLATED').length;

  return { serviceId, totalSLAs: serviceSLAs.length, compliant, atRisk, violated };
}

// ─── List Violations ──────────────────────────────────────────────────────────

function listViolationsImpl(
  state: MonitorState,
  serviceId: ServiceId,
  limit: number,
): ReadonlyArray<SLAViolation> {
  const filtered = state.violations.filter((v) => v.serviceId === serviceId);
  return filtered.slice(-limit);
}
