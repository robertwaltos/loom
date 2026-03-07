/**
 * @loom/inspector — Monitoring, metrics, and quality control.
 *
 * Metrics Registry: In-process counters, gauges, and histograms.
 * Health Check Engine: Fabric and subsystem health monitoring.
 * Alerting Engine: Threshold-based metric alerts with cooldown.
 * Future: Quality gates, perceptual testing.
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
export { createHealthCheckEngine } from './health-check.js';
export type {
  HealthCheckEngine,
  HealthCheckDeps,
  HealthStatus,
  ProbeRegistration,
  ProbeResult,
  HealthReport,
  ProbeReport,
} from './health-check.js';
export { createAlertingEngine } from './alerting-engine.js';
export type {
  AlertingEngine,
  AlertingDeps,
  AlertRule,
  AlertStatus,
  AlertNotification,
  AlertSeverity,
  AlertState,
  ThresholdDirection,
  MetricValueProvider,
  AlertCallback,
} from './alerting-engine.js';
