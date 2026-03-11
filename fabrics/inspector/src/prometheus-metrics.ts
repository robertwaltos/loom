/**
 * Prometheus Metrics Adapter — Bridges the inspector MetricsRegistry
 * to prom-client for /metrics scraping.
 *
 * Registers prom-client metrics alongside the in-memory registry,
 * so every counter/gauge/histogram recorded in the Loom is also
 * visible to Prometheus.
 *
 * Thread: steel/inspector/prometheus-metrics
 * Tier: 1
 */

import {
  Registry,
  Counter,
  Gauge,
  Histogram,
  collectDefaultMetrics,
} from 'prom-client';

// ─── Types ──────────────────────────────────────────────────────

export interface PrometheusAdapterConfig {
  readonly prefix?: string | undefined;
  readonly defaultLabels?: Readonly<Record<string, string>> | undefined;
  readonly collectDefaults?: boolean | undefined;
}

export interface PrometheusAdapter {
  readonly registry: Registry;
  readonly counter: (name: string, help: string, labelNames?: readonly string[]) => PrometheusCounter;
  readonly gauge: (name: string, help: string, labelNames?: readonly string[]) => PrometheusGauge;
  readonly histogram: (
    name: string,
    help: string,
    buckets?: readonly number[],
    labelNames?: readonly string[],
  ) => PrometheusHistogram;
  readonly metrics: () => Promise<string>;
  readonly contentType: string;
}

export interface PrometheusCounter {
  readonly inc: (labels?: Record<string, string>, value?: number) => void;
}

export interface PrometheusGauge {
  readonly set: (value: number, labels?: Record<string, string>) => void;
  readonly inc: (labels?: Record<string, string>, value?: number) => void;
  readonly dec: (labels?: Record<string, string>, value?: number) => void;
}

export interface PrometheusHistogram {
  readonly observe: (value: number, labels?: Record<string, string>) => void;
}

// ─── Default Buckets ────────────────────────────────────────────

const DEFAULT_LATENCY_BUCKETS = [
  0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
] as const;

// ─── Factory ────────────────────────────────────────────────────

export function createPrometheusAdapter(
  config: PrometheusAdapterConfig = {},
): PrometheusAdapter {
  const registry = new Registry();
  const prefix = config.prefix ?? 'loom_';

  if (config.defaultLabels !== undefined) {
    registry.setDefaultLabels(config.defaultLabels);
  }

  if (config.collectDefaults !== false) {
    collectDefaultMetrics({ register: registry, prefix });
  }

  return {
    registry,
    counter: (name, help, labelNames) =>
      createCounter(registry, prefix + name, help, labelNames),
    gauge: (name, help, labelNames) =>
      createGauge(registry, prefix + name, help, labelNames),
    histogram: (name, help, buckets, labelNames) =>
      createHistogram(registry, prefix + name, help, buckets, labelNames),
    metrics: () => registry.metrics(),
    contentType: registry.contentType,
  };
}

// ─── Counter ────────────────────────────────────────────────────

function createCounter(
  registry: Registry,
  name: string,
  help: string,
  labelNames?: readonly string[],
): PrometheusCounter {
  const counter = new Counter({
    name,
    help,
    labelNames: labelNames !== undefined ? [...labelNames] : [],
    registers: [registry],
  });

  return {
    inc: (labels, value) => {
      if (labels !== undefined) {
        counter.labels(labels).inc(value ?? 1);
      } else {
        counter.inc(value ?? 1);
      }
    },
  };
}

// ─── Gauge ──────────────────────────────────────────────────────

function createGauge(
  registry: Registry,
  name: string,
  help: string,
  labelNames?: readonly string[],
): PrometheusGauge {
  const gauge = new Gauge({
    name,
    help,
    labelNames: labelNames !== undefined ? [...labelNames] : [],
    registers: [registry],
  });

  return {
    set: (value, labels) => {
      if (labels !== undefined) {
        gauge.labels(labels).set(value);
      } else {
        gauge.set(value);
      }
    },
    inc: (labels, value) => {
      if (labels !== undefined) {
        gauge.labels(labels).inc(value ?? 1);
      } else {
        gauge.inc(value ?? 1);
      }
    },
    dec: (labels, value) => {
      if (labels !== undefined) {
        gauge.labels(labels).dec(value ?? 1);
      } else {
        gauge.dec(value ?? 1);
      }
    },
  };
}

// ─── Histogram ──────────────────────────────────────────────────

function createHistogram(
  registry: Registry,
  name: string,
  help: string,
  buckets?: readonly number[],
  labelNames?: readonly string[],
): PrometheusHistogram {
  const histogram = new Histogram({
    name,
    help,
    buckets: buckets !== undefined ? [...buckets] : [...DEFAULT_LATENCY_BUCKETS],
    labelNames: labelNames !== undefined ? [...labelNames] : [],
    registers: [registry],
  });

  return {
    observe: (value, labels) => {
      if (labels !== undefined) {
        histogram.labels(labels).observe(value);
      } else {
        histogram.observe(value);
      }
    },
  };
}
