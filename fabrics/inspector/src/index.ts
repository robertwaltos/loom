/**
 * @loom/inspector — Monitoring, metrics, and quality control.
 *
 * Metrics Registry: In-process counters, gauges, and histograms.
 * Health Check Engine: Fabric and subsystem health monitoring.
 * Alerting Engine: Threshold-based metric alerts with cooldown.
 * Metrics Aggregator: Time-windowed aggregation, trend analysis, rate-of-change.
 * Diagnostic Reporter: Aggregated health, alerts, and metrics reporting.
 * Performance Profiler: Execution timing for systems and operations.
 * Anomaly Detector: Statistical anomaly detection on metric streams.
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
export { createMetricsAggregator, DEFAULT_AGGREGATOR_CONFIG } from './metrics-aggregator.js';
export type {
  MetricsAggregator,
  AggregatorDeps,
  AggregatorConfig,
  AggregatedMetric,
  TrendDirection,
  MetricValuePort,
} from './metrics-aggregator.js';
export { createDiagnosticReporter } from './diagnostic-reporter.js';
export type {
  DiagnosticReporter,
  DiagnosticReporterDeps,
  DiagnosticReport,
  ReportSeverity,
  HealthSummarySection,
  FabricStatus,
  AlertSummarySection,
  AlertEntry,
  MetricSummarySection,
  MetricEntry,
  Recommendation,
  DiagnosticHealthPort,
  DiagnosticAlertPort,
  DiagnosticMetricPort,
  DiagnosticIdGenerator,
} from './diagnostic-reporter.js';
export { createPerformanceProfiler } from './performance-profiler.js';
export type {
  PerformanceProfiler,
  PerformanceProfilerDeps,
  ProfileEntry,
  OperationProfile,
  ProfilerStats,
} from './performance-profiler.js';
export { createMetricsDashboard } from './metrics-dashboard.js';
export type {
  MetricsDashboard,
  MetricsDashboardDeps,
  DashboardMetric,
  AddMetricParams,
  DashboardPanel,
  DashboardStats,
} from './metrics-dashboard.js';
export { createAnomalyDetector, DEFAULT_ANOMALY_CONFIG } from './anomaly-detector.js';
export type {
  AnomalyDetector,
  AnomalyDetectorDeps,
  AnomalyConfig,
  Anomaly,
  AnomalySeverity,
  MetricRegistration,
  AnomalyDetectorStats,
} from './anomaly-detector.js';
