/**
 * Metrics Aggregator — Time-windowed metric aggregation and trend analysis.
 *
 * Collects periodic snapshots from the MetricsRegistry and computes:
 *   - Rolling averages over configurable windows
 *   - Rate-of-change (per-second) for counters
 *   - Min/max/mean over windows for gauges and histograms
 *   - Trend direction (rising, falling, stable)
 *
 * "The Inspector examines the weave through many lenses."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type TrendDirection = 'rising' | 'falling' | 'stable';

export interface AggregatedMetric {
  readonly name: string;
  readonly windowSizeUs: number;
  readonly sampleCount: number;
  readonly currentValue: number;
  readonly mean: number;
  readonly min: number;
  readonly max: number;
  readonly trend: TrendDirection;
  readonly ratePerSecond: number | null;
}

export interface AggregatorConfig {
  readonly windowSizeUs: number;
  readonly maxSamples: number;
  readonly trendThreshold: number;
}

export const DEFAULT_AGGREGATOR_CONFIG: AggregatorConfig = {
  windowSizeUs: 60_000_000,
  maxSamples: 120,
  trendThreshold: 0.01,
};

// ─── Port Interfaces ────────────────────────────────────────────────

export type MetricValuePort = (metricName: string) => number | undefined;

export interface AggregatorDeps {
  readonly clock: { nowMicroseconds(): number };
  readonly getMetricValue: MetricValuePort;
  readonly config?: Partial<AggregatorConfig>;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface MetricsAggregator {
  track(metricName: string): void;
  untrack(metricName: string): boolean;
  sample(): number;
  getAggregation(metricName: string): AggregatedMetric | undefined;
  getAllAggregations(): ReadonlyArray<AggregatedMetric>;
  getTrackedMetrics(): ReadonlyArray<string>;
  trackedCount(): number;
  reset(metricName: string): boolean;
}

// ─── State ──────────────────────────────────────────────────────────

interface Sample {
  readonly value: number;
  readonly at: number;
}

interface MetricTrack {
  readonly samples: Sample[];
}

interface AggregatorState {
  readonly tracks: Map<string, MetricTrack>;
  readonly config: AggregatorConfig;
  readonly deps: AggregatorDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createMetricsAggregator(
  deps: AggregatorDeps,
): MetricsAggregator {
  const config: AggregatorConfig = {
    ...DEFAULT_AGGREGATOR_CONFIG,
    ...deps.config,
  };

  const state: AggregatorState = {
    tracks: new Map(),
    config,
    deps,
  };

  return {
    track: (n) => { trackImpl(state, n); },
    untrack: (n) => untrackImpl(state, n),
    sample: () => sampleAll(state),
    getAggregation: (n) => getAggregationImpl(state, n),
    getAllAggregations: () => getAllAggregationsImpl(state),
    getTrackedMetrics: () => [...state.tracks.keys()],
    trackedCount: () => state.tracks.size,
    reset: (n) => resetTrack(state, n),
  };
}

// ─── Track Management ───────────────────────────────────────────────

function trackImpl(state: AggregatorState, name: string): void {
  if (!state.tracks.has(name)) {
    state.tracks.set(name, { samples: [] });
  }
}

function untrackImpl(state: AggregatorState, name: string): boolean {
  return state.tracks.delete(name);
}

function resetTrack(state: AggregatorState, name: string): boolean {
  const track = state.tracks.get(name);
  if (track === undefined) return false;
  track.samples.length = 0;
  return true;
}

// ─── Sampling ───────────────────────────────────────────────────────

function sampleAll(state: AggregatorState): number {
  const now = state.deps.clock.nowMicroseconds();
  let sampled = 0;

  for (const [name, track] of state.tracks.entries()) {
    const value = state.deps.getMetricValue(name);
    if (value !== undefined) {
      addSample(track, value, now, state.config);
      sampled += 1;
    }
  }

  return sampled;
}

function addSample(
  track: MetricTrack,
  value: number,
  at: number,
  config: AggregatorConfig,
): void {
  track.samples.push({ value, at });
  if (track.samples.length > config.maxSamples) {
    track.samples.shift();
  }
}

// ─── Aggregation ────────────────────────────────────────────────────

function getAggregationImpl(
  state: AggregatorState,
  name: string,
): AggregatedMetric | undefined {
  const track = state.tracks.get(name);
  if (track === undefined) return undefined;
  return buildAggregation(name, track, state.config);
}

function getAllAggregationsImpl(
  state: AggregatorState,
): ReadonlyArray<AggregatedMetric> {
  const results: AggregatedMetric[] = [];
  for (const [name, track] of state.tracks.entries()) {
    results.push(buildAggregation(name, track, state.config));
  }
  return results;
}

function buildAggregation(
  name: string,
  track: MetricTrack,
  config: AggregatorConfig,
): AggregatedMetric {
  if (track.samples.length === 0) {
    return emptyAggregation(name, config.windowSizeUs);
  }

  const windowSamples = getWindowSamples(track, config);
  return computeAggregation(name, windowSamples, config);
}

function emptyAggregation(
  name: string,
  windowSizeUs: number,
): AggregatedMetric {
  return {
    name,
    windowSizeUs,
    sampleCount: 0,
    currentValue: 0,
    mean: 0,
    min: 0,
    max: 0,
    trend: 'stable',
    ratePerSecond: null,
  };
}

// ─── Window Filtering ───────────────────────────────────────────────

function getWindowSamples(
  track: MetricTrack,
  config: AggregatorConfig,
): ReadonlyArray<Sample> {
  if (track.samples.length === 0) return [];
  const latest = track.samples[track.samples.length - 1];
  if (latest === undefined) return [];
  const cutoff = latest.at - config.windowSizeUs;
  return track.samples.filter((s) => s.at >= cutoff);
}

// ─── Computation ────────────────────────────────────────────────────

function computeAggregation(
  name: string,
  samples: ReadonlyArray<Sample>,
  config: AggregatorConfig,
): AggregatedMetric {
  if (samples.length === 0) {
    return emptyAggregation(name, config.windowSizeUs);
  }

  const stats = computeStats(samples);
  const trend = computeTrend(samples, config.trendThreshold);
  const rate = computeRate(samples);
  const last = samples[samples.length - 1];

  return {
    name,
    windowSizeUs: config.windowSizeUs,
    sampleCount: samples.length,
    currentValue: last?.value ?? 0,
    mean: stats.mean,
    min: stats.min,
    max: stats.max,
    trend,
    ratePerSecond: rate,
  };
}

interface BasicStats {
  readonly mean: number;
  readonly min: number;
  readonly max: number;
}

function computeStats(samples: ReadonlyArray<Sample>): BasicStats {
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const s of samples) {
    sum += s.value;
    if (s.value < min) min = s.value;
    if (s.value > max) max = s.value;
  }

  return { mean: sum / samples.length, min, max };
}

// ─── Trend Detection ────────────────────────────────────────────────

function computeTrend(
  samples: ReadonlyArray<Sample>,
  threshold: number,
): TrendDirection {
  if (samples.length < 2) return 'stable';
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (first === undefined || last === undefined) return 'stable';

  const delta = last.value - first.value;
  const range = Math.abs(first.value) || 1;
  const normalized = delta / range;

  if (normalized > threshold) return 'rising';
  if (normalized < -threshold) return 'falling';
  return 'stable';
}

// ─── Rate Calculation ───────────────────────────────────────────────

function computeRate(
  samples: ReadonlyArray<Sample>,
): number | null {
  if (samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (first === undefined || last === undefined) return null;

  const durationUs = last.at - first.at;
  if (durationUs <= 0) return null;

  const durationSeconds = durationUs / 1_000_000;
  return (last.value - first.value) / durationSeconds;
}
