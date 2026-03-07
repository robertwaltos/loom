/**
 * @loom/inspector — Monitoring, metrics, and quality control.
 *
 * Metrics Registry: In-process counters, gauges, and histograms.
 * Future: Health checks, alerting, quality gates, perceptual testing.
 */

export { createMetricsRegistry } from './metrics-registry.js';
export type {
  MetricsRegistry,
  MetricType,
  MetricMeta,
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  MetricSnapshot,
  MetricSeries,
} from './metrics-registry.js';
