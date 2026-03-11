/**
 * SLA Monitor — SLA compliance tracking, degradation alerts
 * Fabric: inspector
 * Thread tier: M (Multi-agent orchestration)
 */

// ============================================================================
// Port Definitions (duplicated per fabric isolation)
// ============================================================================

interface SlaMonitorClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface SlaMonitorLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

export type SlaMetricType = 'LATENCY_P99' | 'LATENCY_P95' | 'UPTIME' | 'ERROR_RATE';

export interface SlaTarget {
  readonly metricType: SlaMetricType;
  readonly targetValue: number;
  readonly windowMicros: bigint;
  readonly alertThreshold: number;
}

export interface SlaMetric {
  readonly metricType: SlaMetricType;
  readonly value: number;
  readonly timestampMicros: bigint;
}

export interface SlaWindow {
  readonly metricType: SlaMetricType;
  readonly startMicros: bigint;
  readonly endMicros: bigint;
  readonly metrics: SlaMetric[];
}

export interface ComplianceReport {
  readonly metricType: SlaMetricType;
  readonly targetValue: number;
  readonly actualValue: number;
  readonly compliant: boolean;
  readonly violationCount: number;
  readonly windowStartMicros: bigint;
  readonly windowEndMicros: bigint;
}

export interface SlaAlert {
  readonly metricType: SlaMetricType;
  readonly targetValue: number;
  readonly actualValue: number;
  readonly severity: 'WARNING' | 'CRITICAL';
  readonly timestampMicros: bigint;
  readonly message: string;
}

export type SetTargetResult = 'OK';
export type RecordMetricResult = 'OK' | 'TARGET_NOT_FOUND';

// ============================================================================
// State
// ============================================================================

interface SlaMonitorState {
  readonly targets: Map<SlaMetricType, SlaTarget>;
  readonly metrics: Map<SlaMetricType, SlaMetric[]>;
  readonly alerts: SlaAlert[];
  totalMetrics: bigint;
  totalViolations: bigint;
  readonly maxMetricsPerType: number;
}

export interface SlaMonitorDeps {
  readonly clock: SlaMonitorClockPort;
  readonly logger: SlaMonitorLoggerPort;
}

export interface SlaMonitor {
  readonly setSlaTarget: (target: SlaTarget) => SetTargetResult;
  readonly recordMetric: (metric: SlaMetric) => RecordMetricResult;
  readonly computeCompliance: (metricType: SlaMetricType) => ComplianceReport | 'TARGET_NOT_FOUND';
  readonly checkBreaches: () => SlaAlert[];
  readonly getComplianceReport: (
    metricType: SlaMetricType,
    startMicros: bigint,
    endMicros: bigint,
  ) => ComplianceReport | 'TARGET_NOT_FOUND';
  readonly getAlerts: (since: bigint) => SlaAlert[];
  readonly pruneOldMetrics: (olderThanMicros: bigint) => number;
  readonly getStats: () => {
    readonly totalMetrics: bigint;
    readonly totalViolations: bigint;
    readonly activeTargets: number;
    readonly alertCount: number;
  };
}

// ============================================================================
// Factory
// ============================================================================

export function createSlaMonitor(deps: SlaMonitorDeps): SlaMonitor {
  const state: SlaMonitorState = {
    targets: new Map(),
    metrics: new Map(),
    alerts: [],
    totalMetrics: 0n,
    totalViolations: 0n,
    maxMetricsPerType: 10000,
  };

  return {
    setSlaTarget: (target) => setSlaTarget(state, deps, target),
    recordMetric: (metric) => recordMetric(state, deps, metric),
    computeCompliance: (metricType) => computeCompliance(state, deps, metricType),
    checkBreaches: () => checkBreaches(state, deps),
    getComplianceReport: (metricType, start, end) =>
      getComplianceReport(state, metricType, start, end),
    getAlerts: (since) => getAlerts(state, since),
    pruneOldMetrics: (olderThan) => pruneOldMetrics(state, deps, olderThan),
    getStats: () => getStats(state),
  };
}

// ============================================================================
// Core Functions
// ============================================================================

function setSlaTarget(
  state: SlaMonitorState,
  deps: SlaMonitorDeps,
  target: SlaTarget,
): SetTargetResult {
  state.targets.set(target.metricType, target);

  deps.logger.info('SLA target set', {
    metricType: target.metricType,
    targetValue: target.targetValue,
    windowMicros: String(target.windowMicros),
  });

  return 'OK';
}

function recordMetric(
  state: SlaMonitorState,
  deps: SlaMonitorDeps,
  metric: SlaMetric,
): RecordMetricResult {
  const target = state.targets.get(metric.metricType);
  if (target === undefined) {
    deps.logger.warn('Metric recorded without target', { metricType: metric.metricType });
    return 'TARGET_NOT_FOUND';
  }

  let metricList = state.metrics.get(metric.metricType);
  if (metricList === undefined) {
    metricList = [];
    state.metrics.set(metric.metricType, metricList);
  }

  metricList.push(metric);
  state.totalMetrics = state.totalMetrics + 1n;

  if (metricList.length > state.maxMetricsPerType) {
    metricList.shift();
  }

  if (metric.value > target.targetValue) {
    state.totalViolations = state.totalViolations + 1n;

    const severity = metric.value > target.alertThreshold ? 'CRITICAL' : 'WARNING';

    const alert: SlaAlert = {
      metricType: metric.metricType,
      targetValue: target.targetValue,
      actualValue: metric.value,
      severity,
      timestampMicros: metric.timestampMicros,
      message: buildAlertMessage(metric.metricType, target.targetValue, metric.value),
    };

    state.alerts.push(alert);

    deps.logger.warn('SLA violation detected', {
      metricType: metric.metricType,
      targetValue: target.targetValue,
      actualValue: metric.value,
      severity,
    });
  }

  return 'OK';
}

function buildAlertMessage(metricType: SlaMetricType, target: number, actual: number): string {
  const diff = actual - target;
  return metricType + ' exceeded target by ' + String(diff);
}

function computeCompliance(
  state: SlaMonitorState,
  deps: SlaMonitorDeps,
  metricType: SlaMetricType,
): ComplianceReport | 'TARGET_NOT_FOUND' {
  const target = state.targets.get(metricType);
  if (target === undefined) {
    return 'TARGET_NOT_FOUND';
  }

  const nowMicros = deps.clock.nowMicroseconds();
  const windowStartMicros = nowMicros - target.windowMicros;

  return getComplianceReport(state, metricType, windowStartMicros, nowMicros);
}

function getComplianceReport(
  state: SlaMonitorState,
  metricType: SlaMetricType,
  startMicros: bigint,
  endMicros: bigint,
): ComplianceReport | 'TARGET_NOT_FOUND' {
  const target = state.targets.get(metricType);
  if (target === undefined) {
    return 'TARGET_NOT_FOUND';
  }

  const metricList = state.metrics.get(metricType) || [];

  const windowMetrics = metricList.filter(
    (m) => m.timestampMicros >= startMicros && m.timestampMicros <= endMicros,
  );

  if (windowMetrics.length === 0) {
    return {
      metricType,
      targetValue: target.targetValue,
      actualValue: 0,
      compliant: true,
      violationCount: 0,
      windowStartMicros: startMicros,
      windowEndMicros: endMicros,
    };
  }

  const actualValue = calculateMetricValue(metricType, windowMetrics);
  const violationCount = windowMetrics.filter((m) => m.value > target.targetValue).length;

  return {
    metricType,
    targetValue: target.targetValue,
    actualValue,
    compliant:
      metricType === 'UPTIME'
        ? actualValue >= target.targetValue
        : actualValue <= target.targetValue,
    violationCount,
    windowStartMicros: startMicros,
    windowEndMicros: endMicros,
  };
}

function calculateMetricValue(metricType: SlaMetricType, metrics: SlaMetric[]): number {
  if (metrics.length === 0) {
    return 0;
  }

  if (metricType === 'LATENCY_P99') {
    return calculatePercentile(metrics, 0.99);
  }

  if (metricType === 'LATENCY_P95') {
    return calculatePercentile(metrics, 0.95);
  }

  if (metricType === 'UPTIME') {
    const upCount = metrics.filter((m) => m.value > 0).length;
    return upCount / metrics.length;
  }

  if (metricType === 'ERROR_RATE') {
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  return 0;
}

function calculatePercentile(metrics: SlaMetric[], percentile: number): number {
  const sorted = metrics.map((m) => m.value).sort((a, b) => a - b);
  const index = Math.floor(sorted.length * percentile);
  const value = sorted[index];

  if (value === undefined) {
    return 0;
  }

  return value;
}

function checkBreaches(state: SlaMonitorState, deps: SlaMonitorDeps): SlaAlert[] {
  const nowMicros = deps.clock.nowMicroseconds();
  const recentAlerts: SlaAlert[] = [];

  for (const target of state.targets.values()) {
    const windowStartMicros = nowMicros - target.windowMicros;
    const report = getComplianceReport(state, target.metricType, windowStartMicros, nowMicros);

    if (report === 'TARGET_NOT_FOUND') {
      continue;
    }

    if (!report.compliant) {
      const severity = report.actualValue > target.alertThreshold ? 'CRITICAL' : 'WARNING';

      const alert: SlaAlert = {
        metricType: target.metricType,
        targetValue: target.targetValue,
        actualValue: report.actualValue,
        severity,
        timestampMicros: nowMicros,
        message: buildAlertMessage(target.metricType, target.targetValue, report.actualValue),
      };

      recentAlerts.push(alert);
    }
  }

  return recentAlerts;
}

function getAlerts(state: SlaMonitorState, since: bigint): SlaAlert[] {
  return state.alerts.filter((a) => a.timestampMicros >= since);
}

function pruneOldMetrics(
  state: SlaMonitorState,
  deps: SlaMonitorDeps,
  olderThanMicros: bigint,
): number {
  let pruned = 0;

  for (const item of state.metrics.entries()) {
    const metricType = item[0];
    const metricList = item[1];

    if (metricList === undefined) {
      continue;
    }

    const initialLength = metricList.length;

    const filtered = metricList.filter((m) => m.timestampMicros >= olderThanMicros);

    state.metrics.set(metricType, filtered);

    pruned = pruned + (initialLength - filtered.length);
  }

  if (pruned > 0) {
    deps.logger.info('Pruned old metrics', { count: pruned });
  }

  return pruned;
}

function getStats(state: SlaMonitorState) {
  return {
    totalMetrics: state.totalMetrics,
    totalViolations: state.totalViolations,
    activeTargets: state.targets.size,
    alertCount: state.alerts.length,
  };
}
