/**
 * Regression Detector — Performance regression detection and alerting.
 *
 * The Inspector's regression detector compares current system metrics
 * against established baselines to identify performance degradation.
 * When metrics regress beyond thresholds, alerts are generated and
 * tracked.
 *
 * Regression detection workflow:
 *   1. Set baseline for a metric (manual or auto-captured)
 *   2. Record metric snapshots over time
 *   3. Compare snapshots against baseline
 *   4. Detect regressions when metric degrades beyond threshold
 *   5. Generate alerts for regressions
 *   6. Track regression history for trend analysis
 *   7. Optionally auto-update baselines when performance improves
 *
 * Severity levels:
 *   MINOR    — 5-15% regression (informational)
 *   MODERATE — 15-30% regression (warning)
 *   SEVERE   — >30% regression (critical)
 *
 * Metric types:
 *   - Latency (lower is better)
 *   - Throughput (higher is better)
 *   - Error rate (lower is better)
 *   - Resource usage (lower is better)
 *   - Custom metrics
 *
 * "The Inspector measures twice, alerts once. Every regression caught early."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type RegressionSeverity = 'MINOR' | 'MODERATE' | 'SEVERE';
export type MetricDirection = 'LOWER_IS_BETTER' | 'HIGHER_IS_BETTER';

export interface MetricBaseline {
  readonly metricName: string;
  readonly value: number;
  readonly direction: MetricDirection;
  readonly capturedAt: bigint;
  readonly source: string;
}

export interface MetricSnapshot {
  readonly metricName: string;
  readonly value: number;
  readonly capturedAt: bigint;
  readonly metadata: Record<string, unknown>;
}

export interface RegressionAlert {
  readonly id: string;
  readonly metricName: string;
  readonly baselineValue: number;
  readonly currentValue: number;
  readonly regressionPercent: number;
  readonly severity: RegressionSeverity;
  readonly detectedAt: bigint;
  readonly message: string;
}

export interface RegressionThreshold {
  readonly minorPercent: number;
  readonly moderatePercent: number;
  readonly severePercent: number;
}

export interface BaselineReport {
  readonly generatedAt: bigint;
  readonly totalBaselines: number;
  readonly baselinesByMetric: ReadonlyArray<MetricBaseline>;
  readonly oldestBaseline: bigint | null;
  readonly newestBaseline: bigint | null;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface RegressionDetector {
  setBaseline(metricName: string, value: number, direction: MetricDirection, source: string): void;
  recordSnapshot(snapshot: MetricSnapshot): void;
  detectRegressions(threshold: RegressionThreshold): ReadonlyArray<RegressionAlert>;
  updateBaseline(metricName: string, value: number, source: string): boolean;
  getBaseline(metricName: string): MetricBaseline | null;
  getRegressionHistory(metricName: string, limit: number): ReadonlyArray<RegressionAlert>;
  getBaselineReport(): BaselineReport;
  getSnapshotCount(metricName: string): number;
  clearSnapshots(metricName: string): number;
  clearOldAlerts(ageThresholdMicroseconds: bigint): number;
  getMetrics(): ReadonlyArray<string>;
  hasBaseline(metricName: string): boolean;
  getLatestSnapshot(metricName: string): MetricSnapshot | null;
  computeRegressionPercent(metricName: string, currentValue: number): number | null;
}

export interface RegressionDetectorDeps {
  readonly clock: RegressionClockPort;
  readonly logger: RegressionLoggerPort;
  readonly idGenerator: RegressionIdGeneratorPort;
  readonly maxSnapshotsPerMetric: number;
  readonly maxAlertsPerMetric: number;
}

interface RegressionClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface RegressionLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

interface RegressionIdGeneratorPort {
  readonly generate: () => string;
}

// ─── State ──────────────────────────────────────────────────────────

interface DetectorState {
  readonly baselines: Map<string, MetricBaseline>;
  readonly snapshots: Map<string, MetricSnapshot[]>;
  readonly alerts: Map<string, RegressionAlert[]>;
  readonly deps: RegressionDetectorDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createRegressionDetector(deps: RegressionDetectorDeps): RegressionDetector {
  const state: DetectorState = {
    baselines: new Map(),
    snapshots: new Map(),
    alerts: new Map(),
    deps,
  };

  return {
    setBaseline: (n, v, d, s) => {
      setBaselineImpl(state, n, v, d, s);
    },
    recordSnapshot: (s) => {
      recordSnapshotImpl(state, s);
    },
    detectRegressions: (t) => detectRegressionsImpl(state, t),
    updateBaseline: (n, v, s) => updateBaselineImpl(state, n, v, s),
    getBaseline: (n) => getBaselineImpl(state, n),
    getRegressionHistory: (n, l) => getRegressionHistoryImpl(state, n, l),
    getBaselineReport: () => getBaselineReportImpl(state),
    getSnapshotCount: (n) => getSnapshotCountImpl(state, n),
    clearSnapshots: (n) => clearSnapshotsImpl(state, n),
    clearOldAlerts: (age) => clearOldAlertsImpl(state, age),
    getMetrics: () => getMetricsImpl(state),
    hasBaseline: (n) => hasBaselineImpl(state, n),
    getLatestSnapshot: (n) => getLatestSnapshotImpl(state, n),
    computeRegressionPercent: (n, v) => computeRegressionPercentImpl(state, n, v),
  };
}

// ─── Baseline Management ────────────────────────────────────────────

function setBaselineImpl(
  state: DetectorState,
  metricName: string,
  value: number,
  direction: MetricDirection,
  source: string,
): void {
  const now = state.deps.clock.nowMicroseconds();
  const baseline: MetricBaseline = {
    metricName,
    value,
    direction,
    capturedAt: now,
    source,
  };

  state.baselines.set(metricName, baseline);
  state.deps.logger.info('Baseline set', { metric: metricName, value, source });
}

function updateBaselineImpl(
  state: DetectorState,
  metricName: string,
  value: number,
  source: string,
): boolean {
  const existing = state.baselines.get(metricName);
  if (existing === undefined) return false;

  const now = state.deps.clock.nowMicroseconds();
  const updated: MetricBaseline = {
    metricName,
    value,
    direction: existing.direction,
    capturedAt: now,
    source,
  };

  state.baselines.set(metricName, updated);
  state.deps.logger.info('Baseline updated', { metric: metricName, value, source });
  return true;
}

function getBaselineImpl(state: DetectorState, metricName: string): MetricBaseline | null {
  const baseline = state.baselines.get(metricName);
  return baseline !== undefined ? baseline : null;
}

function getBaselineReportImpl(state: DetectorState): BaselineReport {
  const now = state.deps.clock.nowMicroseconds();
  const baselines = Array.from(state.baselines.values());

  let oldest: bigint | null = null;
  let newest: bigint | null = null;

  for (const baseline of baselines) {
    if (oldest === null || baseline.capturedAt < oldest) {
      oldest = baseline.capturedAt;
    }
    if (newest === null || baseline.capturedAt > newest) {
      newest = baseline.capturedAt;
    }
  }

  return {
    generatedAt: now,
    totalBaselines: baselines.length,
    baselinesByMetric: baselines,
    oldestBaseline: oldest,
    newestBaseline: newest,
  };
}

// ─── Snapshot Recording ─────────────────────────────────────────────

function recordSnapshotImpl(state: DetectorState, snapshot: MetricSnapshot): void {
  const existing = state.snapshots.get(snapshot.metricName);
  if (existing !== undefined) {
    existing.push(snapshot);
    trimSnapshots(existing, state.deps.maxSnapshotsPerMetric);
  } else {
    state.snapshots.set(snapshot.metricName, [snapshot]);
  }
}

function getSnapshotCountImpl(state: DetectorState, metricName: string): number {
  const snapshots = state.snapshots.get(metricName);
  return snapshots !== undefined ? snapshots.length : 0;
}

function clearSnapshotsImpl(state: DetectorState, metricName: string): number {
  const snapshots = state.snapshots.get(metricName);
  if (snapshots === undefined) return 0;

  const count = snapshots.length;
  state.snapshots.delete(metricName);
  state.deps.logger.info('Snapshots cleared', { metric: metricName, count });
  return count;
}

function trimSnapshots(snapshots: MetricSnapshot[], maxSize: number): void {
  while (snapshots.length > maxSize) {
    snapshots.shift();
  }
}

// ─── Regression Detection ───────────────────────────────────────────

function detectRegressionsImpl(
  state: DetectorState,
  threshold: RegressionThreshold,
): ReadonlyArray<RegressionAlert> {
  const alerts: RegressionAlert[] = [];

  for (const [metricName, snapshots] of state.snapshots.entries()) {
    const baseline = state.baselines.get(metricName);
    if (baseline === undefined) continue;
    if (snapshots.length === 0) continue;

    const latestSnapshot = snapshots[snapshots.length - 1];
    if (latestSnapshot === undefined) continue;

    const alert = checkRegression(state, baseline, latestSnapshot, threshold);
    if (alert !== null) {
      alerts.push(alert);
      recordAlert(state, alert);
    }
  }

  return alerts;
}

function checkRegression(
  state: DetectorState,
  baseline: MetricBaseline,
  snapshot: MetricSnapshot,
  threshold: RegressionThreshold,
): RegressionAlert | null {
  const regressionPercent = computeRegressionPercent(baseline, snapshot);
  if (regressionPercent < threshold.minorPercent) return null;

  const severity = determineSeverity(regressionPercent, threshold);
  const alertId = state.deps.idGenerator.generate();
  const message = buildRegressionMessage(baseline.metricName, regressionPercent, severity);

  state.deps.logger.warn('Regression detected', {
    metric: baseline.metricName,
    regression: regressionPercent,
    severity,
  });

  return {
    id: alertId,
    metricName: baseline.metricName,
    baselineValue: baseline.value,
    currentValue: snapshot.value,
    regressionPercent,
    severity,
    detectedAt: snapshot.capturedAt,
    message,
  };
}

function computeRegressionPercent(baseline: MetricBaseline, snapshot: MetricSnapshot): number {
  if (baseline.direction === 'LOWER_IS_BETTER') {
    if (snapshot.value <= baseline.value) return 0;
    return ((snapshot.value - baseline.value) / baseline.value) * 100;
  } else {
    if (snapshot.value >= baseline.value) return 0;
    return ((baseline.value - snapshot.value) / baseline.value) * 100;
  }
}

function determineSeverity(
  regressionPercent: number,
  threshold: RegressionThreshold,
): RegressionSeverity {
  if (regressionPercent >= threshold.severePercent) return 'SEVERE';
  if (regressionPercent >= threshold.moderatePercent) return 'MODERATE';
  return 'MINOR';
}

function buildRegressionMessage(
  metricName: string,
  percent: number,
  severity: RegressionSeverity,
): string {
  const formatted = String(percent.toFixed(1)) + '%';
  return severity + ' regression in ' + metricName + ': ' + formatted + ' degradation';
}

// ─── Alert Management ───────────────────────────────────────────────

function recordAlert(state: DetectorState, alert: RegressionAlert): void {
  const existing = state.alerts.get(alert.metricName);
  if (existing !== undefined) {
    existing.push(alert);
    trimAlerts(existing, state.deps.maxAlertsPerMetric);
  } else {
    state.alerts.set(alert.metricName, [alert]);
  }
}

function getRegressionHistoryImpl(
  state: DetectorState,
  metricName: string,
  limit: number,
): ReadonlyArray<RegressionAlert> {
  const alerts = state.alerts.get(metricName);
  if (alerts === undefined) return [];
  if (limit >= alerts.length) return [...alerts];
  return alerts.slice(alerts.length - limit);
}

function clearOldAlertsImpl(state: DetectorState, ageThresholdMicroseconds: bigint): number {
  const now = state.deps.clock.nowMicroseconds();
  const cutoff = now - ageThresholdMicroseconds;
  let cleared = 0;

  for (const [metricName, alerts] of state.alerts.entries()) {
    const filtered = alerts.filter((a) => a.detectedAt <= cutoff);
    const removedCount = alerts.length - filtered.length;
    cleared += removedCount;

    if (filtered.length === 0) {
      state.alerts.delete(metricName);
    } else if (removedCount > 0) {
      state.alerts.set(metricName, filtered);
    }
  }

  if (cleared > 0) {
    state.deps.logger.info('Old alerts cleared', { count: cleared });
  }

  return cleared;
}

function trimAlerts(alerts: RegressionAlert[], maxSize: number): void {
  while (alerts.length > maxSize) {
    alerts.shift();
  }
}

// ─── Additional Queries ─────────────────────────────────────────────

function getMetricsImpl(state: DetectorState): ReadonlyArray<string> {
  const metrics = new Set<string>();

  for (const metricName of state.baselines.keys()) {
    metrics.add(metricName);
  }

  for (const metricName of state.snapshots.keys()) {
    metrics.add(metricName);
  }

  return Array.from(metrics).sort();
}

function hasBaselineImpl(state: DetectorState, metricName: string): boolean {
  return state.baselines.has(metricName);
}

function getLatestSnapshotImpl(state: DetectorState, metricName: string): MetricSnapshot | null {
  const snapshots = state.snapshots.get(metricName);
  if (snapshots === undefined || snapshots.length === 0) return null;

  const latest = snapshots[snapshots.length - 1];
  return latest !== undefined ? latest : null;
}

function computeRegressionPercentImpl(
  state: DetectorState,
  metricName: string,
  currentValue: number,
): number | null {
  const baseline = state.baselines.get(metricName);
  if (baseline === undefined) return null;

  if (baseline.direction === 'LOWER_IS_BETTER') {
    if (currentValue <= baseline.value) return 0;
    return ((currentValue - baseline.value) / baseline.value) * 100;
  } else {
    if (currentValue >= baseline.value) return 0;
    return ((baseline.value - currentValue) / baseline.value) * 100;
  }
}
