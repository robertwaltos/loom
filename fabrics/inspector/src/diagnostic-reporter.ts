/**
 * Diagnostic Reporter — Aggregated system diagnostics for The Loom.
 *
 * Pulls data from health probes, alert rules, and metric aggregations
 * to produce a unified diagnostic report. Useful for operator dashboards,
 * incident investigation, and automated escalation.
 *
 * Report sections:
 *   - Health summary (per-fabric health status)
 *   - Active alerts (firing alerts with context)
 *   - Key metrics (current values for watched metrics)
 *   - Recommendations (auto-generated action items)
 *
 * "The Inspector's report is the single source of truth."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ReportSeverity = 'nominal' | 'advisory' | 'warning' | 'critical';

export interface DiagnosticReport {
  readonly reportId: string;
  readonly generatedAt: number;
  readonly severity: ReportSeverity;
  readonly healthSummary: HealthSummarySection;
  readonly activeAlerts: AlertSummarySection;
  readonly keyMetrics: MetricSummarySection;
  readonly recommendations: ReadonlyArray<Recommendation>;
}

export interface HealthSummarySection {
  readonly overallStatus: string;
  readonly fabricStatuses: ReadonlyArray<FabricStatus>;
  readonly totalProbes: number;
  readonly healthyCount: number;
  readonly degradedCount: number;
  readonly unhealthyCount: number;
}

export interface FabricStatus {
  readonly fabric: string;
  readonly status: string;
  readonly probeCount: number;
}

export interface AlertSummarySection {
  readonly totalFiring: number;
  readonly criticalCount: number;
  readonly warningCount: number;
  readonly alerts: ReadonlyArray<AlertEntry>;
}

export interface AlertEntry {
  readonly name: string;
  readonly severity: string;
  readonly value: number;
  readonly threshold: number;
  readonly firedAt: number | null;
}

export interface MetricSummarySection {
  readonly entries: ReadonlyArray<MetricEntry>;
}

export interface MetricEntry {
  readonly name: string;
  readonly value: number;
}

export interface Recommendation {
  readonly priority: 'high' | 'medium' | 'low';
  readonly category: string;
  readonly message: string;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface DiagnosticHealthPort {
  evaluate(): {
    readonly overallStatus: string;
    readonly totalProbes: number;
    readonly healthyCount: number;
    readonly degradedCount: number;
    readonly unhealthyCount: number;
    readonly probes: ReadonlyArray<{
      readonly name: string;
      readonly fabric: string;
      readonly status: string;
    }>;
  };
}

export interface DiagnosticAlertPort {
  getFiringAlerts(): ReadonlyArray<{
    readonly name: string;
    readonly severity: string;
    readonly currentValue: number;
    readonly threshold: number;
    readonly firedAt: number | null;
  }>;
}

export interface DiagnosticMetricPort {
  getValue(name: string): number | undefined;
}

export interface DiagnosticIdGenerator {
  next(): string;
}

export interface DiagnosticReporterDeps {
  readonly healthPort: DiagnosticHealthPort;
  readonly alertPort: DiagnosticAlertPort;
  readonly metricPort: DiagnosticMetricPort;
  readonly idGenerator: DiagnosticIdGenerator;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface DiagnosticReporter {
  generate(watchedMetrics: ReadonlyArray<string>): DiagnosticReport;
  getHistory(limit: number): ReadonlyArray<DiagnosticReport>;
  getLastReport(): DiagnosticReport | undefined;
  reportCount(): number;
}

// ─── State ──────────────────────────────────────────────────────────

interface ReporterState {
  readonly history: DiagnosticReport[];
  readonly deps: DiagnosticReporterDeps;
  readonly maxHistory: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createDiagnosticReporter(
  deps: DiagnosticReporterDeps,
  maxHistory?: number,
): DiagnosticReporter {
  const state: ReporterState = {
    history: [],
    deps,
    maxHistory: maxHistory ?? 50,
  };

  return {
    generate: (m) => generateImpl(state, m),
    getHistory: (l) => getHistoryImpl(state, l),
    getLastReport: () => lastReportImpl(state),
    reportCount: () => state.history.length,
  };
}

// ─── Generate Report ────────────────────────────────────────────────

function generateImpl(
  state: ReporterState,
  watchedMetrics: ReadonlyArray<string>,
): DiagnosticReport {
  const healthSummary = buildHealthSummary(state.deps.healthPort);
  const activeAlerts = buildAlertSummary(state.deps.alertPort);
  const keyMetrics = buildMetricSummary(state.deps.metricPort, watchedMetrics);
  const recommendations = buildRecommendations(healthSummary, activeAlerts);
  const severity = computeSeverity(healthSummary, activeAlerts);

  const report: DiagnosticReport = {
    reportId: state.deps.idGenerator.next(),
    generatedAt: state.deps.clock.nowMicroseconds(),
    severity,
    healthSummary,
    activeAlerts,
    keyMetrics,
    recommendations,
  };

  appendReport(state, report);
  return report;
}

// ─── Health Summary ─────────────────────────────────────────────────

function buildHealthSummary(port: DiagnosticHealthPort): HealthSummarySection {
  const report = port.evaluate();
  const fabricStatuses = aggregateFabricStatuses(report.probes);

  return {
    overallStatus: report.overallStatus,
    fabricStatuses,
    totalProbes: report.totalProbes,
    healthyCount: report.healthyCount,
    degradedCount: report.degradedCount,
    unhealthyCount: report.unhealthyCount,
  };
}

function aggregateFabricStatuses(
  probes: ReadonlyArray<{ name: string; fabric: string; status: string }>,
): ReadonlyArray<FabricStatus> {
  const fabricMap = new Map<string, { status: string; count: number }>();

  for (const probe of probes) {
    const existing = fabricMap.get(probe.fabric);
    if (existing === undefined) {
      fabricMap.set(probe.fabric, { status: probe.status, count: 1 });
    } else {
      existing.count += 1;
      existing.status = worstStatus(existing.status, probe.status);
    }
  }

  const result: FabricStatus[] = [];
  for (const [fabric, info] of fabricMap) {
    result.push({ fabric, status: info.status, probeCount: info.count });
  }
  return result;
}

function worstStatus(a: string, b: string): string {
  const rank = statusRank(a);
  const rankB = statusRank(b);
  return rankB > rank ? b : a;
}

function statusRank(status: string): number {
  if (status === 'unhealthy') return 2;
  if (status === 'degraded') return 1;
  return 0;
}

// ─── Alert Summary ──────────────────────────────────────────────────

function buildAlertSummary(port: DiagnosticAlertPort): AlertSummarySection {
  const firing = port.getFiringAlerts();
  let criticalCount = 0;
  let warningCount = 0;
  const alerts: AlertEntry[] = [];

  for (const alert of firing) {
    if (alert.severity === 'critical') criticalCount += 1;
    else warningCount += 1;
    alerts.push({
      name: alert.name,
      severity: alert.severity,
      value: alert.currentValue,
      threshold: alert.threshold,
      firedAt: alert.firedAt,
    });
  }

  return { totalFiring: firing.length, criticalCount, warningCount, alerts };
}

// ─── Metric Summary ─────────────────────────────────────────────────

function buildMetricSummary(
  port: DiagnosticMetricPort,
  names: ReadonlyArray<string>,
): MetricSummarySection {
  const entries: MetricEntry[] = [];
  for (const name of names) {
    const value = port.getValue(name);
    if (value !== undefined) {
      entries.push({ name, value });
    }
  }
  return { entries };
}

// ─── Recommendations ────────────────────────────────────────────────

function buildRecommendations(
  health: HealthSummarySection,
  alerts: AlertSummarySection,
): ReadonlyArray<Recommendation> {
  const recs: Recommendation[] = [];
  addHealthRecommendations(recs, health);
  addAlertRecommendations(recs, alerts);
  return recs;
}

function addHealthRecommendations(recs: Recommendation[], health: HealthSummarySection): void {
  if (health.unhealthyCount > 0) {
    recs.push({
      priority: 'high',
      category: 'health',
      message: String(health.unhealthyCount) + ' probe(s) unhealthy — investigate immediately',
    });
  }
  if (health.degradedCount > 0) {
    recs.push({
      priority: 'medium',
      category: 'health',
      message: String(health.degradedCount) + ' probe(s) degraded — monitor closely',
    });
  }
}

function addAlertRecommendations(recs: Recommendation[], alerts: AlertSummarySection): void {
  if (alerts.criticalCount > 0) {
    recs.push({
      priority: 'high',
      category: 'alerting',
      message:
        String(alerts.criticalCount) + ' critical alert(s) firing — immediate action required',
    });
  }
  if (alerts.warningCount > 0) {
    recs.push({
      priority: 'medium',
      category: 'alerting',
      message: String(alerts.warningCount) + ' warning alert(s) firing — review thresholds',
    });
  }
}

// ─── Severity ───────────────────────────────────────────────────────

function computeSeverity(
  health: HealthSummarySection,
  alerts: AlertSummarySection,
): ReportSeverity {
  if (health.unhealthyCount > 0 || alerts.criticalCount > 0) return 'critical';
  if (health.degradedCount > 0 || alerts.warningCount > 0) return 'warning';
  if (alerts.totalFiring > 0) return 'advisory';
  return 'nominal';
}

// ─── History ────────────────────────────────────────────────────────

function appendReport(state: ReporterState, report: DiagnosticReport): void {
  state.history.push(report);
  while (state.history.length > state.maxHistory) {
    state.history.shift();
  }
}

function getHistoryImpl(state: ReporterState, limit: number): ReadonlyArray<DiagnosticReport> {
  if (limit >= state.history.length) return [...state.history];
  return state.history.slice(state.history.length - limit);
}

function lastReportImpl(state: ReporterState): DiagnosticReport | undefined {
  if (state.history.length === 0) return undefined;
  return state.history[state.history.length - 1];
}
