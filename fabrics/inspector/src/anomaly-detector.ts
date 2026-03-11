/**
 * anomaly-detector.ts — Statistical anomaly detection.
 *
 * Monitors numeric metric streams for anomalous values using a
 * sliding window with mean/stddev analysis. When a value exceeds
 * the configured number of standard deviations from the rolling
 * mean, it is flagged as an anomaly. Supports per-metric
 * configuration and anomaly history.
 */

// ── Ports ────────────────────────────────────────────────────────

interface AnomalyClock {
  readonly nowMicroseconds: () => number;
}

interface AnomalyIdGenerator {
  readonly next: () => string;
}

// ── Types ────────────────────────────────────────────────────────

interface AnomalyConfig {
  readonly windowSize: number;
  readonly deviationThreshold: number;
  readonly minSamples: number;
}

type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

interface Anomaly {
  readonly anomalyId: string;
  readonly metricName: string;
  readonly value: number;
  readonly mean: number;
  readonly stddev: number;
  readonly deviations: number;
  readonly severity: AnomalySeverity;
  readonly detectedAt: number;
}

interface MetricRegistration {
  readonly metricName: string;
  readonly config?: Partial<AnomalyConfig>;
}

interface AnomalyDetectorStats {
  readonly trackedMetrics: number;
  readonly totalSamples: number;
  readonly totalAnomalies: number;
}

// ── Public API ───────────────────────────────────────────────────

interface AnomalyDetector {
  readonly registerMetric: (reg: MetricRegistration) => boolean;
  readonly removeMetric: (metricName: string) => boolean;
  readonly recordValue: (metricName: string, value: number) => Anomaly | null;
  readonly getAnomalies: (metricName: string) => readonly Anomaly[];
  readonly getRecentAnomalies: (limit: number) => readonly Anomaly[];
  readonly getStats: () => AnomalyDetectorStats;
}

interface AnomalyDetectorDeps {
  readonly clock: AnomalyClock;
  readonly idGenerator: AnomalyIdGenerator;
}

// ── State ────────────────────────────────────────────────────────

interface AnomalyState {
  readonly metrics: Map<string, MetricWindow>;
  readonly allAnomalies: Anomaly[];
  readonly deps: AnomalyDetectorDeps;
  readonly defaultConfig: AnomalyConfig;
  totalSamples: number;
}

interface MetricWindow {
  readonly metricName: string;
  readonly config: AnomalyConfig;
  readonly values: number[];
  readonly anomalies: Anomaly[];
}

// ── Defaults ─────────────────────────────────────────────────────

const DEFAULT_ANOMALY_CONFIG: AnomalyConfig = {
  windowSize: 100,
  deviationThreshold: 3,
  minSamples: 10,
};

// ── Operations ───────────────────────────────────────────────────

function registerMetricImpl(state: AnomalyState, reg: MetricRegistration): boolean {
  if (state.metrics.has(reg.metricName)) return false;
  state.metrics.set(reg.metricName, {
    metricName: reg.metricName,
    config: { ...state.defaultConfig, ...reg.config },
    values: [],
    anomalies: [],
  });
  return true;
}

function removeMetricImpl(state: AnomalyState, metricName: string): boolean {
  return state.metrics.delete(metricName);
}

function computeMean(values: readonly number[]): number {
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function computeStddev(values: readonly number[], mean: number): number {
  let sumSq = 0;
  for (const v of values) {
    const diff = v - mean;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / values.length);
}

function classifySeverity(deviations: number): AnomalySeverity {
  if (deviations >= 5) return 'critical';
  if (deviations >= 4) return 'high';
  if (deviations >= 3) return 'medium';
  return 'low';
}

function createAnomaly(
  state: AnomalyState,
  metricName: string,
  value: number,
  mean: number,
  stddev: number,
  deviations: number,
): Anomaly {
  return {
    anomalyId: state.deps.idGenerator.next(),
    metricName,
    value,
    mean,
    stddev,
    deviations,
    severity: classifySeverity(deviations),
    detectedAt: state.deps.clock.nowMicroseconds(),
  };
}

function addSample(window: MetricWindow, value: number): void {
  window.values.push(value);
  if (window.values.length > window.config.windowSize) {
    window.values.shift();
  }
}

function recordValueImpl(state: AnomalyState, metricName: string, value: number): Anomaly | null {
  const window = state.metrics.get(metricName);
  if (!window) return null;
  addSample(window, value);
  state.totalSamples++;
  if (window.values.length < window.config.minSamples) return null;
  const mean = computeMean(window.values);
  const stddev = computeStddev(window.values, mean);
  if (stddev === 0) return null;
  const deviations = Math.abs(value - mean) / stddev;
  if (deviations < window.config.deviationThreshold) return null;
  const anomaly = createAnomaly(state, metricName, value, mean, stddev, deviations);
  window.anomalies.push(anomaly);
  state.allAnomalies.push(anomaly);
  return anomaly;
}

function getStatsImpl(state: AnomalyState): AnomalyDetectorStats {
  return {
    trackedMetrics: state.metrics.size,
    totalSamples: state.totalSamples,
    totalAnomalies: state.allAnomalies.length,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createAnomalyDetector(
  deps: AnomalyDetectorDeps,
  config?: Partial<AnomalyConfig>,
): AnomalyDetector {
  const state: AnomalyState = {
    metrics: new Map(),
    allAnomalies: [],
    deps,
    defaultConfig: { ...DEFAULT_ANOMALY_CONFIG, ...config },
    totalSamples: 0,
  };
  return {
    registerMetric: (r) => registerMetricImpl(state, r),
    removeMetric: (n) => removeMetricImpl(state, n),
    recordValue: (n, v) => recordValueImpl(state, n, v),
    getAnomalies: (n) => {
      const w = state.metrics.get(n);
      return w ? [...w.anomalies] : [];
    },
    getRecentAnomalies: (limit) => state.allAnomalies.slice(-limit),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createAnomalyDetector, DEFAULT_ANOMALY_CONFIG };
export type {
  AnomalyDetector,
  AnomalyDetectorDeps,
  AnomalyConfig,
  Anomaly,
  AnomalySeverity,
  MetricRegistration,
  AnomalyDetectorStats,
};
