/**
 * Metrics Aggregator System — Rolling time-window aggregations for system metrics.
 *
 * Metrics must be registered before samples are accepted. Samples are stored
 * with timestamps so aggregations can be computed over rolling windows
 * (1MIN / 5MIN / 15MIN / 1HOUR). Aggregations include count, sum, min, max,
 * avg, p50, and p95. Samples older than a given threshold can be purged.
 *
 * "The Inspector examines the weave through many lenses."
 *
 * Fabric: inspector
 * Thread tier: 1
 */

// ─── Port Interfaces ─────────────────────────────────────────────────────────

interface MetricsAggClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface MetricsAggIdGenPort {
  readonly next: () => string;
}

interface MetricsAggLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type MetricName = string;

export type AggregateWindow = '1MIN' | '5MIN' | '15MIN' | '1HOUR';

export type MetricError = 'metric-not-found' | 'invalid-value' | 'invalid-window';

export interface MetricSampleRecord {
  readonly sampleId: string;
  readonly metricName: MetricName;
  readonly value: number;
  readonly tags: Record<string, string>;
  readonly recordedAt: bigint;
}

export interface MetricAggregation {
  readonly metricName: MetricName;
  readonly window: AggregateWindow;
  readonly count: number;
  readonly sum: number;
  readonly min: number;
  readonly max: number;
  readonly avg: number;
  readonly p50: number;
  readonly p95: number;
  readonly windowStartAt: bigint;
  readonly windowEndAt: bigint;
}

export interface MetricRegistry {
  readonly metricName: MetricName;
  readonly description: string;
  readonly unit: string;
  readonly registeredAt: bigint;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface MetricsAggregatorSystem {
  registerMetric(
    metricName: MetricName,
    description: string,
    unit: string,
  ): MetricRegistry | MetricError;
  recordSample(
    metricName: MetricName,
    value: number,
    tags?: Record<string, string>,
  ): MetricSampleRecord | MetricError;
  aggregate(metricName: MetricName, window: AggregateWindow): MetricAggregation | MetricError;
  getRecentSamples(metricName: MetricName, limit: number): ReadonlyArray<MetricSampleRecord>;
  listMetrics(): ReadonlyArray<MetricRegistry>;
  purgeSamples(
    metricName: MetricName,
    olderThanUs: bigint,
  ): { success: true; purged: number } | { success: false; error: MetricError };
}

// ─── Deps ────────────────────────────────────────────────────────────────────

export interface MetricsAggregatorSystemDeps {
  readonly clock: MetricsAggClockPort;
  readonly idGen: MetricsAggIdGenPort;
  readonly logger: MetricsAggLoggerPort;
}

// ─── Window Sizes ─────────────────────────────────────────────────────────────

const WINDOW_SIZE_US: Record<AggregateWindow, bigint> = {
  '1MIN': 60_000_000n,
  '5MIN': 300_000_000n,
  '15MIN': 900_000_000n,
  '1HOUR': 3_600_000_000n,
};

// ─── State ───────────────────────────────────────────────────────────────────

interface AggSystemState {
  readonly registrations: Map<MetricName, MetricRegistry>;
  readonly samples: Map<MetricName, MetricSampleRecord[]>;
  readonly deps: MetricsAggregatorSystemDeps;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createMetricsAggregatorSystem(
  deps: MetricsAggregatorSystemDeps,
): MetricsAggregatorSystem {
  const state: AggSystemState = {
    registrations: new Map(),
    samples: new Map(),
    deps,
  };

  return {
    registerMetric: (metricName, description, unit) =>
      registerMetricImpl(state, metricName, description, unit),
    recordSample: (metricName, value, tags) =>
      recordSampleImpl(state, metricName, value, tags ?? {}),
    aggregate: (metricName, window) => aggregateImpl(state, metricName, window),
    getRecentSamples: (metricName, limit) => getRecentSamplesImpl(state, metricName, limit),
    listMetrics: () => [...state.registrations.values()],
    purgeSamples: (metricName, olderThanUs) => purgeSamplesImpl(state, metricName, olderThanUs),
  };
}

// ─── Register Metric ──────────────────────────────────────────────────────────

function registerMetricImpl(
  state: AggSystemState,
  metricName: MetricName,
  description: string,
  unit: string,
): MetricRegistry | MetricError {
  const existing = state.registrations.get(metricName);
  if (existing !== undefined) return existing;

  const registry: MetricRegistry = {
    metricName,
    description,
    unit,
    registeredAt: state.deps.clock.nowMicroseconds(),
  };
  state.registrations.set(metricName, registry);
  state.samples.set(metricName, []);
  state.deps.logger.info('metric-registered', { metricName, unit });
  return registry;
}

// ─── Record Sample ────────────────────────────────────────────────────────────

function recordSampleImpl(
  state: AggSystemState,
  metricName: MetricName,
  value: number,
  tags: Record<string, string>,
): MetricSampleRecord | MetricError {
  if (!state.registrations.has(metricName)) return 'metric-not-found';
  if (!Number.isFinite(value)) return 'invalid-value';

  const sampleId = state.deps.idGen.next();
  const sample: MetricSampleRecord = {
    sampleId,
    metricName,
    value,
    tags,
    recordedAt: state.deps.clock.nowMicroseconds(),
  };

  const bucket = state.samples.get(metricName);
  if (bucket !== undefined) bucket.push(sample);
  return sample;
}

// ─── Aggregate ───────────────────────────────────────────────────────────────

function aggregateImpl(
  state: AggSystemState,
  metricName: MetricName,
  window: AggregateWindow,
): MetricAggregation | MetricError {
  if (!state.registrations.has(metricName)) return 'metric-not-found';

  const windowSizeUs = WINDOW_SIZE_US[window];
  const windowEndAt = state.deps.clock.nowMicroseconds();
  const windowStartAt = windowEndAt - windowSizeUs;

  const allSamples = state.samples.get(metricName) ?? [];
  const inWindow = allSamples.filter((s) => s.recordedAt >= windowStartAt);

  return computeAggregation(metricName, window, inWindow, windowStartAt, windowEndAt);
}

function computeAggregation(
  metricName: MetricName,
  window: AggregateWindow,
  samples: ReadonlyArray<MetricSampleRecord>,
  windowStartAt: bigint,
  windowEndAt: bigint,
): MetricAggregation {
  if (samples.length === 0) {
    return zeroAggregation(metricName, window, windowStartAt, windowEndAt);
  }

  const values = samples.map((s) => s.value).sort((a, b) => a - b);
  const count = values.length;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const min = values[0] ?? 0;
  const max = values[count - 1] ?? 0;
  const avg = sum / count;
  const p50 = values[Math.floor(count * 0.5)] ?? 0;
  const p95 = values[Math.floor(count * 0.95)] ?? 0;

  return { metricName, window, count, sum, min, max, avg, p50, p95, windowStartAt, windowEndAt };
}

function zeroAggregation(
  metricName: MetricName,
  window: AggregateWindow,
  windowStartAt: bigint,
  windowEndAt: bigint,
): MetricAggregation {
  return {
    metricName,
    window,
    count: 0,
    sum: 0,
    min: 0,
    max: 0,
    avg: 0,
    p50: 0,
    p95: 0,
    windowStartAt,
    windowEndAt,
  };
}

// ─── Get Recent Samples ───────────────────────────────────────────────────────

function getRecentSamplesImpl(
  state: AggSystemState,
  metricName: MetricName,
  limit: number,
): ReadonlyArray<MetricSampleRecord> {
  const bucket = state.samples.get(metricName);
  if (bucket === undefined) return [];
  return bucket.slice(-limit);
}

// ─── Purge Samples ────────────────────────────────────────────────────────────

function purgeSamplesImpl(
  state: AggSystemState,
  metricName: MetricName,
  olderThanUs: bigint,
): { success: true; purged: number } | { success: false; error: MetricError } {
  if (!state.registrations.has(metricName)) return { success: false, error: 'metric-not-found' };

  const bucket = state.samples.get(metricName);
  if (bucket === undefined) return { success: true, purged: 0 };

  const before = bucket.length;
  const kept = bucket.filter((s) => s.recordedAt >= olderThanUs);
  bucket.length = 0;
  for (const s of kept) bucket.push(s);
  const purged = before - bucket.length;
  return { success: true, purged };
}
