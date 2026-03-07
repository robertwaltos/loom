/**
 * Metrics Registry — Lightweight in-process metrics for all fabrics.
 *
 * Provides three metric types:
 *   Counter:   Monotonically increasing values (events, errors, operations)
 *   Gauge:     Point-in-time values (population, health, queue depth)
 *   Histogram: Distribution of values (latency, duration, sizes)
 *
 * All metrics are namespaced by fabric and subsystem:
 *   "nakama.kalon.transfers_total"
 *   "shuttle.population.health"
 *   "silfen_weave.corridor.transit_duration_us"
 *
 * Thread-safe for single-threaded Node.js. No external dependencies.
 * Designed for future export to Prometheus/OpenTelemetry adapters.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricMeta {
  readonly name: string;
  readonly type: MetricType;
  readonly description: string;
  readonly labels: ReadonlyArray<string>;
}

export interface CounterMetric {
  readonly meta: MetricMeta;
  increment(labels?: Readonly<Record<string, string>>, delta?: number): void;
  getValue(labels?: Readonly<Record<string, string>>): number;
}

export interface GaugeMetric {
  readonly meta: MetricMeta;
  set(value: number, labels?: Readonly<Record<string, string>>): void;
  increment(labels?: Readonly<Record<string, string>>, delta?: number): void;
  decrement(labels?: Readonly<Record<string, string>>, delta?: number): void;
  getValue(labels?: Readonly<Record<string, string>>): number;
}

export interface HistogramMetric {
  readonly meta: MetricMeta;
  observe(value: number, labels?: Readonly<Record<string, string>>): void;
  getCount(labels?: Readonly<Record<string, string>>): number;
  getSum(labels?: Readonly<Record<string, string>>): number;
  getMin(labels?: Readonly<Record<string, string>>): number;
  getMax(labels?: Readonly<Record<string, string>>): number;
  getMean(labels?: Readonly<Record<string, string>>): number;
}

export interface MetricSnapshot {
  readonly name: string;
  readonly type: MetricType;
  readonly description: string;
  readonly series: ReadonlyArray<MetricSeries>;
}

export interface MetricSeries {
  readonly labels: Readonly<Record<string, string>>;
  readonly value: number;
  readonly count?: number;
  readonly sum?: number;
  readonly min?: number;
  readonly max?: number;
}

// ─── Registry Interface ──────────────────────────────────────────────

export interface MetricsRegistry {
  createCounter(name: string, description: string, labels?: ReadonlyArray<string>): CounterMetric;
  createGauge(name: string, description: string, labels?: ReadonlyArray<string>): GaugeMetric;
  createHistogram(name: string, description: string, labels?: ReadonlyArray<string>): HistogramMetric;
  getMetric(name: string): MetricMeta | undefined;
  snapshot(): ReadonlyArray<MetricSnapshot>;
  reset(): void;
  metricCount(): number;
}

// ─── State ─────────────────────────────────────────────────────────

interface CounterState {
  readonly meta: MetricMeta;
  readonly values: Map<string, number>;
}

interface GaugeState {
  readonly meta: MetricMeta;
  readonly values: Map<string, number>;
}

interface HistogramState {
  readonly meta: MetricMeta;
  readonly entries: Map<string, HistogramEntry>;
}

interface HistogramEntry {
  count: number;
  sum: number;
  min: number;
  max: number;
}

interface RegistryState {
  readonly counters: Map<string, CounterState>;
  readonly gauges: Map<string, GaugeState>;
  readonly histograms: Map<string, HistogramState>;
}

// ─── Factory ───────────────────────────────────────────────────────

export function createMetricsRegistry(): MetricsRegistry {
  const state: RegistryState = {
    counters: new Map(),
    gauges: new Map(),
    histograms: new Map(),
  };

  return {
    createCounter: (n, d, l) => createCounterImpl(state, n, d, l),
    createGauge: (n, d, l) => createGaugeImpl(state, n, d, l),
    createHistogram: (n, d, l) => createHistogramImpl(state, n, d, l),
    getMetric: (n) => getMetricImpl(state, n),
    snapshot: () => buildSnapshot(state),
    reset: () => { resetImpl(state); },
    metricCount: () => totalMetrics(state),
  };
}

// ─── Label Key ─────────────────────────────────────────────────────

function labelKey(labels?: Readonly<Record<string, string>>): string {
  if (labels === undefined) return '';
  const keys = Object.keys(labels).sort();
  return keys.map((k) => k + '=' + (labels[k] ?? '')).join(',');
}

// ─── Counter Implementation ────────────────────────────────────────

function createCounterImpl(
  state: RegistryState,
  name: string,
  description: string,
  labels?: ReadonlyArray<string>,
): CounterMetric {
  assertNameUnique(state, name);
  const meta: MetricMeta = { name, type: 'counter', description, labels: labels ?? [] };
  const cs: CounterState = { meta, values: new Map() };
  state.counters.set(name, cs);

  return {
    meta,
    increment(lbl, delta = 1) {
      const key = labelKey(lbl);
      const current = cs.values.get(key) ?? 0;
      cs.values.set(key, current + Math.max(0, delta));
    },
    getValue(lbl) {
      return cs.values.get(labelKey(lbl)) ?? 0;
    },
  };
}

// ─── Gauge Implementation ──────────────────────────────────────────

function createGaugeImpl(
  state: RegistryState,
  name: string,
  description: string,
  labels?: ReadonlyArray<string>,
): GaugeMetric {
  assertNameUnique(state, name);
  const meta: MetricMeta = { name, type: 'gauge', description, labels: labels ?? [] };
  const gs: GaugeState = { meta, values: new Map() };
  state.gauges.set(name, gs);

  return {
    meta,
    set(value, lbl) {
      gs.values.set(labelKey(lbl), value);
    },
    increment(lbl, delta = 1) {
      const key = labelKey(lbl);
      const current = gs.values.get(key) ?? 0;
      gs.values.set(key, current + delta);
    },
    decrement(lbl, delta = 1) {
      const key = labelKey(lbl);
      const current = gs.values.get(key) ?? 0;
      gs.values.set(key, current - delta);
    },
    getValue(lbl) {
      return gs.values.get(labelKey(lbl)) ?? 0;
    },
  };
}

// ─── Histogram Implementation ──────────────────────────────────────

function createHistogramImpl(
  state: RegistryState,
  name: string,
  description: string,
  labels?: ReadonlyArray<string>,
): HistogramMetric {
  assertNameUnique(state, name);
  const meta: MetricMeta = { name, type: 'histogram', description, labels: labels ?? [] };
  const hs: HistogramState = { meta, entries: new Map() };
  state.histograms.set(name, hs);
  return buildHistogramMetric(meta, hs);
}

function buildHistogramMetric(meta: MetricMeta, hs: HistogramState): HistogramMetric {
  return {
    meta,
    observe(value, lbl) { observeHistogram(hs, value, lbl); },
    getCount(lbl) { return hs.entries.get(labelKey(lbl))?.count ?? 0; },
    getSum(lbl) { return hs.entries.get(labelKey(lbl))?.sum ?? 0; },
    getMin(lbl) { return hs.entries.get(labelKey(lbl))?.min ?? 0; },
    getMax(lbl) { return hs.entries.get(labelKey(lbl))?.max ?? 0; },
    getMean(lbl) { return histogramMean(hs, lbl); },
  };
}

function observeHistogram(
  hs: HistogramState,
  value: number,
  lbl?: Readonly<Record<string, string>>,
): void {
  const key = labelKey(lbl);
  const entry = hs.entries.get(key);
  if (entry === undefined) {
    hs.entries.set(key, { count: 1, sum: value, min: value, max: value });
  } else {
    entry.count += 1;
    entry.sum += value;
    if (value < entry.min) entry.min = value;
    if (value > entry.max) entry.max = value;
  }
}

function histogramMean(
  hs: HistogramState,
  lbl?: Readonly<Record<string, string>>,
): number {
  const entry = hs.entries.get(labelKey(lbl));
  if (entry === undefined || entry.count === 0) return 0;
  return entry.sum / entry.count;
}

// ─── Queries ───────────────────────────────────────────────────────

function getMetricImpl(state: RegistryState, name: string): MetricMeta | undefined {
  const counter = state.counters.get(name);
  if (counter !== undefined) return counter.meta;
  const gauge = state.gauges.get(name);
  if (gauge !== undefined) return gauge.meta;
  const histogram = state.histograms.get(name);
  if (histogram !== undefined) return histogram.meta;
  return undefined;
}

// ─── Snapshot ──────────────────────────────────────────────────────

function buildSnapshot(state: RegistryState): ReadonlyArray<MetricSnapshot> {
  const snapshots: MetricSnapshot[] = [];

  for (const cs of state.counters.values()) {
    snapshots.push(buildCounterSnapshot(cs));
  }
  for (const gs of state.gauges.values()) {
    snapshots.push(buildGaugeSnapshot(gs));
  }
  for (const hs of state.histograms.values()) {
    snapshots.push(buildHistogramSnapshot(hs));
  }
  return snapshots;
}

function buildCounterSnapshot(cs: CounterState): MetricSnapshot {
  const series: MetricSeries[] = [];
  for (const [key, value] of cs.values.entries()) {
    series.push({ labels: parseLabels(key), value });
  }
  return { name: cs.meta.name, type: 'counter', description: cs.meta.description, series };
}

function buildGaugeSnapshot(gs: GaugeState): MetricSnapshot {
  const series: MetricSeries[] = [];
  for (const [key, value] of gs.values.entries()) {
    series.push({ labels: parseLabels(key), value });
  }
  return { name: gs.meta.name, type: 'gauge', description: gs.meta.description, series };
}

function buildHistogramSnapshot(hs: HistogramState): MetricSnapshot {
  const series: MetricSeries[] = [];
  for (const [key, entry] of hs.entries.entries()) {
    series.push({
      labels: parseLabels(key),
      value: entry.count === 0 ? 0 : entry.sum / entry.count,
      count: entry.count,
      sum: entry.sum,
      min: entry.min,
      max: entry.max,
    });
  }
  return { name: hs.meta.name, type: 'histogram', description: hs.meta.description, series };
}

function parseLabels(key: string): Readonly<Record<string, string>> {
  if (key === '') return {};
  const result: Record<string, string> = {};
  for (const pair of key.split(',')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx >= 0) {
      result[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
    }
  }
  return result;
}

// ─── Reset ─────────────────────────────────────────────────────────

function resetImpl(state: RegistryState): void {
  for (const cs of state.counters.values()) cs.values.clear();
  for (const gs of state.gauges.values()) gs.values.clear();
  for (const hs of state.histograms.values()) hs.entries.clear();
}

// ─── Helpers ───────────────────────────────────────────────────────

function totalMetrics(state: RegistryState): number {
  return state.counters.size + state.gauges.size + state.histograms.size;
}

function assertNameUnique(state: RegistryState, name: string): void {
  if (state.counters.has(name) || state.gauges.has(name) || state.histograms.has(name)) {
    throw new Error('Metric ' + name + ' already registered');
  }
}
