/**
 * Metric Collection Registry — Full-featured in-process metrics.
 *
 * Metric types:
 *   COUNTER:   Monotonically increasing (increment, get)
 *   GAUGE:     Arbitrary up/down values (set, increment, decrement)
 *   HISTOGRAM: Distribution tracking with percentile computation (p50/p90/p99)
 *   SUMMARY:   Rolling statistics (mean, min, max, stddev)
 *
 * All metrics support named labels (key-value tags) for dimensional
 * filtering. Snapshots provide full point-in-time metric state
 * for export to monitoring backends.
 *
 * "Every thread in The Loom is measured."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type RegistryMetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface RegistryMetricMeta {
  readonly name: string;
  readonly type: RegistryMetricType;
  readonly description: string;
  readonly labels: ReadonlyArray<string>;
}

export interface RegistryCounter {
  readonly meta: RegistryMetricMeta;
  readonly increment: (labels?: Readonly<Record<string, string>>, delta?: number) => void;
  readonly getValue: (labels?: Readonly<Record<string, string>>) => number;
}

export interface RegistryGauge {
  readonly meta: RegistryMetricMeta;
  readonly set: (value: number, labels?: Readonly<Record<string, string>>) => void;
  readonly increment: (labels?: Readonly<Record<string, string>>, delta?: number) => void;
  readonly decrement: (labels?: Readonly<Record<string, string>>, delta?: number) => void;
  readonly getValue: (labels?: Readonly<Record<string, string>>) => number;
}

export interface RegistryHistogram {
  readonly meta: RegistryMetricMeta;
  readonly observe: (value: number, labels?: Readonly<Record<string, string>>) => void;
  readonly getCount: (labels?: Readonly<Record<string, string>>) => number;
  readonly getSum: (labels?: Readonly<Record<string, string>>) => number;
  readonly getPercentile: (p: number, labels?: Readonly<Record<string, string>>) => number;
}

export interface RegistrySummary {
  readonly meta: RegistryMetricMeta;
  readonly observe: (value: number, labels?: Readonly<Record<string, string>>) => void;
  readonly getMean: (labels?: Readonly<Record<string, string>>) => number;
  readonly getMin: (labels?: Readonly<Record<string, string>>) => number;
  readonly getMax: (labels?: Readonly<Record<string, string>>) => number;
  readonly getStddev: (labels?: Readonly<Record<string, string>>) => number;
  readonly getCount: (labels?: Readonly<Record<string, string>>) => number;
}

export interface RegistryMetricSnapshot {
  readonly name: string;
  readonly type: RegistryMetricType;
  readonly description: string;
  readonly series: ReadonlyArray<RegistryMetricSeries>;
}

export interface RegistryMetricSeries {
  readonly labels: Readonly<Record<string, string>>;
  readonly value: number;
  readonly count?: number;
  readonly sum?: number;
  readonly min?: number;
  readonly max?: number;
  readonly p50?: number;
  readonly p90?: number;
  readonly p99?: number;
  readonly stddev?: number;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface MetricCollectionRegistry {
  readonly createCounter: (
    name: string,
    description: string,
    labels?: ReadonlyArray<string>,
  ) => RegistryCounter;
  readonly createGauge: (
    name: string,
    description: string,
    labels?: ReadonlyArray<string>,
  ) => RegistryGauge;
  readonly createHistogram: (
    name: string,
    description: string,
    labels?: ReadonlyArray<string>,
  ) => RegistryHistogram;
  readonly createSummary: (
    name: string,
    description: string,
    labels?: ReadonlyArray<string>,
  ) => RegistrySummary;
  readonly getMetric: (name: string) => RegistryMetricMeta | undefined;
  readonly snapshot: () => ReadonlyArray<RegistryMetricSnapshot>;
  readonly reset: () => void;
  readonly metricCount: () => number;
}

// ─── Internal State ─────────────────────────────────────────────────

interface CounterState {
  readonly meta: RegistryMetricMeta;
  readonly values: Map<string, number>;
}

interface GaugeState {
  readonly meta: RegistryMetricMeta;
  readonly values: Map<string, number>;
}

interface HistogramState {
  readonly meta: RegistryMetricMeta;
  readonly observations: Map<string, number[]>;
}

interface SummaryState {
  readonly meta: RegistryMetricMeta;
  readonly observations: Map<string, number[]>;
}

interface RegistryState {
  readonly counters: Map<string, CounterState>;
  readonly gauges: Map<string, GaugeState>;
  readonly histograms: Map<string, HistogramState>;
  readonly summaries: Map<string, SummaryState>;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createMetricCollectionRegistry(): MetricCollectionRegistry {
  const state: RegistryState = {
    counters: new Map(),
    gauges: new Map(),
    histograms: new Map(),
    summaries: new Map(),
  };

  return {
    createCounter: (n, d, l) => createCounterImpl(state, n, d, l),
    createGauge: (n, d, l) => createGaugeImpl(state, n, d, l),
    createHistogram: (n, d, l) => createHistogramImpl(state, n, d, l),
    createSummary: (n, d, l) => createSummaryImpl(state, n, d, l),
    getMetric: (n) => getMetricImpl(state, n),
    snapshot: () => buildSnapshot(state),
    reset: () => {
      resetImpl(state);
    },
    metricCount: () => totalMetrics(state),
  };
}

// ─── Label Key ──────────────────────────────────────────────────────

function labelKey(labels?: Readonly<Record<string, string>>): string {
  if (labels === undefined) return '';
  const keys = Object.keys(labels).sort();
  return keys.map((k) => k + '=' + (labels[k] ?? '')).join(',');
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

// ─── Counter ────────────────────────────────────────────────────────

function createCounterImpl(
  state: RegistryState,
  name: string,
  description: string,
  labels?: ReadonlyArray<string>,
): RegistryCounter {
  assertNameUnique(state, name);
  const meta: RegistryMetricMeta = { name, type: 'counter', description, labels: labels ?? [] };
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

// ─── Gauge ──────────────────────────────────────────────────────────

function createGaugeImpl(
  state: RegistryState,
  name: string,
  description: string,
  labels?: ReadonlyArray<string>,
): RegistryGauge {
  assertNameUnique(state, name);
  const meta: RegistryMetricMeta = { name, type: 'gauge', description, labels: labels ?? [] };
  const gs: GaugeState = { meta, values: new Map() };
  state.gauges.set(name, gs);

  return {
    meta,
    set(value, lbl) {
      gs.values.set(labelKey(lbl), value);
    },
    increment(lbl, delta = 1) {
      const key = labelKey(lbl);
      gs.values.set(key, (gs.values.get(key) ?? 0) + delta);
    },
    decrement(lbl, delta = 1) {
      const key = labelKey(lbl);
      gs.values.set(key, (gs.values.get(key) ?? 0) - delta);
    },
    getValue(lbl) {
      return gs.values.get(labelKey(lbl)) ?? 0;
    },
  };
}

// ─── Histogram ──────────────────────────────────────────────────────

function createHistogramImpl(
  state: RegistryState,
  name: string,
  description: string,
  labels?: ReadonlyArray<string>,
): RegistryHistogram {
  assertNameUnique(state, name);
  const meta: RegistryMetricMeta = { name, type: 'histogram', description, labels: labels ?? [] };
  const hs: HistogramState = { meta, observations: new Map() };
  state.histograms.set(name, hs);

  return {
    meta,
    observe(value, lbl) {
      observeHistogram(hs, value, lbl);
    },
    getCount(lbl) {
      return (hs.observations.get(labelKey(lbl)) ?? []).length;
    },
    getSum(lbl) {
      return sumOf(hs.observations.get(labelKey(lbl)) ?? []);
    },
    getPercentile(p, lbl) {
      return percentile(hs.observations.get(labelKey(lbl)) ?? [], p);
    },
  };
}

function observeHistogram(
  hs: HistogramState,
  value: number,
  lbl?: Readonly<Record<string, string>>,
): void {
  const key = labelKey(lbl);
  let obs = hs.observations.get(key);
  if (obs === undefined) {
    obs = [];
    hs.observations.set(key, obs);
  }
  obs.push(value);
}

function percentile(values: ReadonlyArray<number>, p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  const clamped = Math.max(0, Math.min(sorted.length - 1, idx));
  return sorted[clamped] ?? 0;
}

function sumOf(values: ReadonlyArray<number>): number {
  let s = 0;
  for (const v of values) s += v;
  return s;
}

// ─── Summary ────────────────────────────────────────────────────────

function createSummaryImpl(
  state: RegistryState,
  name: string,
  description: string,
  labels?: ReadonlyArray<string>,
): RegistrySummary {
  assertNameUnique(state, name);
  const meta: RegistryMetricMeta = { name, type: 'summary', description, labels: labels ?? [] };
  const ss: SummaryState = { meta, observations: new Map() };
  state.summaries.set(name, ss);

  return {
    meta,
    observe(value, lbl) {
      observeSummary(ss, value, lbl);
    },
    getMean(lbl) {
      return meanOf(ss.observations.get(labelKey(lbl)) ?? []);
    },
    getMin(lbl) {
      return minOf(ss.observations.get(labelKey(lbl)) ?? []);
    },
    getMax(lbl) {
      return maxOf(ss.observations.get(labelKey(lbl)) ?? []);
    },
    getStddev(lbl) {
      return stddevOf(ss.observations.get(labelKey(lbl)) ?? []);
    },
    getCount(lbl) {
      return (ss.observations.get(labelKey(lbl)) ?? []).length;
    },
  };
}

function observeSummary(
  ss: SummaryState,
  value: number,
  lbl?: Readonly<Record<string, string>>,
): void {
  const key = labelKey(lbl);
  let obs = ss.observations.get(key);
  if (obs === undefined) {
    obs = [];
    ss.observations.set(key, obs);
  }
  obs.push(value);
}

function meanOf(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0;
  return sumOf(values) / values.length;
}

function minOf(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0;
  let m = values[0] ?? 0;
  for (const v of values) {
    if (v < m) m = v;
  }
  return m;
}

function maxOf(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0;
  let m = values[0] ?? 0;
  for (const v of values) {
    if (v > m) m = v;
  }
  return m;
}

function stddevOf(values: ReadonlyArray<number>): number {
  if (values.length < 2) return 0;
  const mean = meanOf(values);
  let sumSq = 0;
  for (const v of values) {
    const diff = v - mean;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / values.length);
}

// ─── Queries ────────────────────────────────────────────────────────

function getMetricImpl(state: RegistryState, name: string): RegistryMetricMeta | undefined {
  if (state.counters.has(name)) return state.counters.get(name)?.meta;
  if (state.gauges.has(name)) return state.gauges.get(name)?.meta;
  if (state.histograms.has(name)) return state.histograms.get(name)?.meta;
  if (state.summaries.has(name)) return state.summaries.get(name)?.meta;
  return undefined;
}

// ─── Snapshot ───────────────────────────────────────────────────────

function buildSnapshot(state: RegistryState): ReadonlyArray<RegistryMetricSnapshot> {
  const result: RegistryMetricSnapshot[] = [];
  for (const cs of state.counters.values()) result.push(counterSnapshot(cs));
  for (const gs of state.gauges.values()) result.push(gaugeSnapshot(gs));
  for (const hs of state.histograms.values()) result.push(histogramSnapshot(hs));
  for (const ss of state.summaries.values()) result.push(summarySnapshot(ss));
  return result;
}

function counterSnapshot(cs: CounterState): RegistryMetricSnapshot {
  const series: RegistryMetricSeries[] = [];
  for (const [key, value] of cs.values.entries()) {
    series.push({ labels: parseLabels(key), value });
  }
  return { name: cs.meta.name, type: 'counter', description: cs.meta.description, series };
}

function gaugeSnapshot(gs: GaugeState): RegistryMetricSnapshot {
  const series: RegistryMetricSeries[] = [];
  for (const [key, value] of gs.values.entries()) {
    series.push({ labels: parseLabels(key), value });
  }
  return { name: gs.meta.name, type: 'gauge', description: gs.meta.description, series };
}

function histogramSnapshot(hs: HistogramState): RegistryMetricSnapshot {
  const series: RegistryMetricSeries[] = [];
  for (const [key, obs] of hs.observations.entries()) {
    series.push({
      labels: parseLabels(key),
      value: meanOf(obs),
      count: obs.length,
      sum: sumOf(obs),
      p50: percentile(obs, 50),
      p90: percentile(obs, 90),
      p99: percentile(obs, 99),
    });
  }
  return { name: hs.meta.name, type: 'histogram', description: hs.meta.description, series };
}

function summarySnapshot(ss: SummaryState): RegistryMetricSnapshot {
  const series: RegistryMetricSeries[] = [];
  for (const [key, obs] of ss.observations.entries()) {
    series.push({
      labels: parseLabels(key),
      value: meanOf(obs),
      count: obs.length,
      min: minOf(obs),
      max: maxOf(obs),
      stddev: stddevOf(obs),
    });
  }
  return { name: ss.meta.name, type: 'summary', description: ss.meta.description, series };
}

// ─── Reset ──────────────────────────────────────────────────────────

function resetImpl(state: RegistryState): void {
  for (const cs of state.counters.values()) cs.values.clear();
  for (const gs of state.gauges.values()) gs.values.clear();
  for (const hs of state.histograms.values()) hs.observations.clear();
  for (const ss of state.summaries.values()) ss.observations.clear();
}

// ─── Helpers ────────────────────────────────────────────────────────

function totalMetrics(state: RegistryState): number {
  return state.counters.size + state.gauges.size + state.histograms.size + state.summaries.size;
}

function assertNameUnique(state: RegistryState, name: string): void {
  const taken =
    state.counters.has(name) ||
    state.gauges.has(name) ||
    state.histograms.has(name) ||
    state.summaries.has(name);
  if (taken) {
    throw new Error('Metric ' + name + ' already registered');
  }
}
