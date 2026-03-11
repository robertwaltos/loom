/**
 * Anomaly Detector System — Statistical anomaly detection using rolling baselines.
 *
 * Each registered metric maintains a rolling window of up to 20 samples.
 * Once 5 samples are accumulated, values are checked against a configured
 * sensitivity threshold (LOW/MEDIUM/HIGH). Spikes and drops are detected via
 * standard-deviation comparison. FLATLINE and TREND checks use the last 5 values.
 *
 * "If a thread breaks pattern, the Inspector sees it first."
 *
 * Fabric: inspector
 * Thread tier: 1
 */

// ─── Port Interfaces ─────────────────────────────────────────────────────────

interface AnomalyClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface AnomalyIdGenPort {
  readonly next: () => string;
}

interface AnomalyLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type MetricName = string;
export type AnomalyId = string;

export type AnomalyError =
  | 'metric-not-found'
  | 'insufficient-data'
  | 'invalid-value'
  | 'invalid-sensitivity';
export type AnomalyType = 'SPIKE' | 'DROP' | 'TREND_UP' | 'TREND_DOWN' | 'FLATLINE';
export type AnomalySensitivity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Anomaly {
  readonly anomalyId: AnomalyId;
  readonly metricName: MetricName;
  readonly type: AnomalyType;
  readonly value: number;
  readonly baselineValue: number;
  readonly deviationPercent: number;
  readonly detectedAt: bigint;
  readonly sensitivity: AnomalySensitivity;
}

export interface BaselineWindow {
  readonly metricName: MetricName;
  readonly sampleCount: number;
  readonly mean: number;
  readonly stdDev: number;
  readonly min: number;
  readonly max: number;
  readonly updatedAt: bigint;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface AnomalyDetectorSystem {
  registerMetric(
    metricName: MetricName,
  ): { success: true } | { success: false; error: AnomalyError };
  recordValue(
    metricName: MetricName,
    value: number,
  ): { success: true; anomaly?: Anomaly } | { success: false; error: AnomalyError };
  setThreshold(
    metricName: MetricName,
    sensitivity: AnomalySensitivity,
  ): { success: true } | { success: false; error: AnomalyError };
  getBaseline(metricName: MetricName): BaselineWindow | undefined;
  listAnomalies(metricName?: string): ReadonlyArray<Anomaly>;
  clearAnomalies(
    metricName: MetricName,
  ): { success: true; cleared: number } | { success: false; error: AnomalyError };
}

// ─── Deps ────────────────────────────────────────────────────────────────────

export interface AnomalyDetectorSystemDeps {
  readonly clock: AnomalyClockPort;
  readonly idGen: AnomalyIdGenPort;
  readonly logger: AnomalyLoggerPort;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WINDOW_SIZE = 20;
const MIN_SAMPLES = 5;
const TREND_WINDOW = 5;

const SENSITIVITY_MULTIPLIERS: Record<AnomalySensitivity, number> = {
  LOW: 3,
  MEDIUM: 2,
  HIGH: 1.5,
};

// ─── Internal State ───────────────────────────────────────────────────────────

interface MetricState {
  readonly metricName: MetricName;
  sensitivity: AnomalySensitivity;
  readonly samples: number[];
  readonly anomalies: Anomaly[];
}

interface DetectorState {
  readonly metrics: Map<MetricName, MetricState>;
  readonly allAnomalies: Anomaly[];
  readonly deps: AnomalyDetectorSystemDeps;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createAnomalyDetectorSystem(
  deps: AnomalyDetectorSystemDeps,
): AnomalyDetectorSystem {
  const state: DetectorState = {
    metrics: new Map(),
    allAnomalies: [],
    deps,
  };

  return {
    registerMetric: (metricName) => registerMetricImpl(state, metricName),
    recordValue: (metricName, value) => recordValueImpl(state, metricName, value),
    setThreshold: (metricName, sensitivity) => setThresholdImpl(state, metricName, sensitivity),
    getBaseline: (metricName) => getBaselineImpl(state, metricName),
    listAnomalies: (metricName) => listAnomaliesImpl(state, metricName),
    clearAnomalies: (metricName) => clearAnomaliesImpl(state, metricName),
  };
}

// ─── Register Metric ─────────────────────────────────────────────────────────

function registerMetricImpl(
  state: DetectorState,
  metricName: MetricName,
): { success: true } | { success: false; error: AnomalyError } {
  if (state.metrics.has(metricName)) return { success: false, error: 'metric-not-found' };
  state.metrics.set(metricName, {
    metricName,
    sensitivity: 'MEDIUM',
    samples: [],
    anomalies: [],
  });
  state.deps.logger.info('metric-registered', { metricName });
  return { success: true };
}

// ─── Record Value ─────────────────────────────────────────────────────────────

function recordValueImpl(
  state: DetectorState,
  metricName: MetricName,
  value: number,
): { success: true; anomaly?: Anomaly } | { success: false; error: AnomalyError } {
  const metric = state.metrics.get(metricName);
  if (metric === undefined) return { success: false, error: 'metric-not-found' };
  if (!Number.isFinite(value)) return { success: false, error: 'invalid-value' };

  pushSample(metric.samples, value, WINDOW_SIZE);

  if (metric.samples.length < MIN_SAMPLES) return { success: true };

  const anomaly = detectAnomaly(state, metric, value);
  if (anomaly !== undefined) {
    metric.anomalies.push(anomaly);
    state.allAnomalies.push(anomaly);
    state.deps.logger.warn('anomaly-detected', { metricName, type: anomaly.type, value });
    return { success: true, anomaly };
  }

  return { success: true };
}

function pushSample(samples: number[], value: number, windowSize: number): void {
  samples.push(value);
  if (samples.length > windowSize) samples.shift();
}

function detectAnomaly(
  state: DetectorState,
  metric: MetricState,
  value: number,
): Anomaly | undefined {
  const now = state.deps.clock.nowMicroseconds();
  const samples = metric.samples;
  const mean = computeMean(samples);
  const stdDev = computeStdDev(samples, mean);
  const multiplier = SENSITIVITY_MULTIPLIERS[metric.sensitivity];

  const flatline = checkFlatline(samples);
  if (flatline) return buildAnomaly(state, metric, 'FLATLINE', value, mean, now);

  const trend = checkTrend(samples);
  if (trend !== undefined) return buildAnomaly(state, metric, trend, value, mean, now);

  if (stdDev > 0 && Math.abs(value - mean) > multiplier * stdDev) {
    const type: AnomalyType = value > mean ? 'SPIKE' : 'DROP';
    return buildAnomaly(state, metric, type, value, mean, now);
  }

  return undefined;
}

function checkFlatline(samples: number[]): boolean {
  const last = samples.slice(-TREND_WINDOW);
  if (last.length < TREND_WINDOW) return false;
  const first = last[0];
  return last.every((v) => v === first);
}

function checkTrend(samples: number[]): AnomalyType | undefined {
  const last = samples.slice(-TREND_WINDOW);
  if (last.length < TREND_WINDOW) return undefined;
  if (isStrictlyIncreasing(last)) return 'TREND_UP';
  if (isStrictlyDecreasing(last)) return 'TREND_DOWN';
  return undefined;
}

function isStrictlyIncreasing(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if ((values[i] as number) <= (values[i - 1] as number)) return false;
  }
  return true;
}

function isStrictlyDecreasing(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if ((values[i] as number) >= (values[i - 1] as number)) return false;
  }
  return true;
}

function buildAnomaly(
  state: DetectorState,
  metric: MetricState,
  type: AnomalyType,
  value: number,
  mean: number,
  now: bigint,
): Anomaly {
  const deviationPercent = mean === 0 ? 0 : (Math.abs(value - mean) / mean) * 100;
  return {
    anomalyId: state.deps.idGen.next(),
    metricName: metric.metricName,
    type,
    value,
    baselineValue: mean,
    deviationPercent,
    detectedAt: now,
    sensitivity: metric.sensitivity,
  };
}

// ─── Set Threshold ────────────────────────────────────────────────────────────

function setThresholdImpl(
  state: DetectorState,
  metricName: MetricName,
  sensitivity: AnomalySensitivity,
): { success: true } | { success: false; error: AnomalyError } {
  const metric = state.metrics.get(metricName);
  if (metric === undefined) return { success: false, error: 'metric-not-found' };
  (metric as { sensitivity: AnomalySensitivity }).sensitivity = sensitivity;
  return { success: true };
}

// ─── Get Baseline ─────────────────────────────────────────────────────────────

function getBaselineImpl(state: DetectorState, metricName: MetricName): BaselineWindow | undefined {
  const metric = state.metrics.get(metricName);
  if (metric === undefined) return undefined;
  const samples = metric.samples;
  if (samples.length === 0) {
    return {
      metricName,
      sampleCount: 0,
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      updatedAt: state.deps.clock.nowMicroseconds(),
    };
  }
  const mean = computeMean(samples);
  const stdDev = computeStdDev(samples, mean);
  return {
    metricName,
    sampleCount: samples.length,
    mean,
    stdDev,
    min: Math.min(...samples),
    max: Math.max(...samples),
    updatedAt: state.deps.clock.nowMicroseconds(),
  };
}

// ─── List Anomalies ───────────────────────────────────────────────────────────

function listAnomaliesImpl(state: DetectorState, metricName?: string): ReadonlyArray<Anomaly> {
  if (metricName === undefined) return [...state.allAnomalies];
  const metric = state.metrics.get(metricName);
  return metric ? [...metric.anomalies] : [];
}

// ─── Clear Anomalies ──────────────────────────────────────────────────────────

function clearAnomaliesImpl(
  state: DetectorState,
  metricName: MetricName,
): { success: true; cleared: number } | { success: false; error: AnomalyError } {
  const metric = state.metrics.get(metricName);
  if (metric === undefined) return { success: false, error: 'metric-not-found' };
  const cleared = metric.anomalies.length;
  metric.anomalies.length = 0;
  return { success: true, cleared };
}

// ─── Math Helpers ─────────────────────────────────────────────────────────────

function computeMean(samples: number[]): number {
  let sum = 0;
  for (const v of samples) sum += v;
  return sum / samples.length;
}

function computeStdDev(samples: number[], mean: number): number {
  let sumSq = 0;
  for (const v of samples) {
    const diff = v - mean;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / samples.length);
}
