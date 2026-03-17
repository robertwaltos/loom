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
 * Threshold Alert: Metric threshold breach alerting with acknowledgement.
 * Metric Collection Registry: Counters, gauges, histograms, and summaries with percentiles.
 * Alert Engine: Advanced alerting with state lifecycle and grouping.
 * Performance Profiler (v2): Nested spans, budget tracking, hot path identification.
 * Quality Gate Engine: Automated quality checkpoints with composite gates.
 * Future: Perceptual testing.
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
export { createThresholdAlertService } from './threshold-alert.js';
export type {
  ThresholdAlertService,
  ThresholdAlertDeps,
  ThresholdRule,
  ThresholdDirection as ThresholdRuleDirection,
  ThresholdAlertSeverity,
  ThresholdAlertStatus,
  ThresholdAlert,
  CreateThresholdRuleParams,
  ThresholdEvaluateParams,
  ThresholdAlertStats,
} from './threshold-alert.js';
export { createMetricExporterService } from './metric-exporter.js';
export type {
  MetricExporterService,
  MetricExporterDeps,
  ExportFormat,
  MetricSource,
  MetricSample,
  RegisterSourceParams as ExporterRegisterSourceParams,
  ExportSnapshot,
  MetricExporterStats,
} from './metric-exporter.js';
export { createUptimeMonitor } from './uptime-monitor.js';
export type {
  UptimeMonitorService,
  UptimeMonitorDeps,
  ServiceState,
  UptimeRegisterParams,
  UptimeSnapshot,
  UptimeMonitorStats,
} from './uptime-monitor.js';
export { createMetricCollectionRegistry } from './metric-registry.js';
export type {
  MetricCollectionRegistry,
  RegistryMetricType,
  RegistryMetricMeta,
  RegistryCounter,
  RegistryGauge,
  RegistryHistogram,
  RegistrySummary,
  RegistryMetricSnapshot,
  RegistryMetricSeries,
} from './metric-registry.js';
export { createAlertEngine } from './alert-engine.js';
export type {
  AlertEngine,
  AlertEngineDeps,
  AlertEngineSeverity,
  AlertEngineState,
  AlertEngineRule,
  AlertRuleKind,
  AlertThresholdDir,
  AlertRecord,
  AlertHistoryEntry,
  AlertDispatch,
  AlertMetricProvider,
  AlertDispatchCallback,
} from './alert-engine.js';
export { createPerfProfiler } from './perf-profiler.js';
export type {
  PerfProfiler,
  PerfProfilerDeps,
  PerfSpanEntry,
  PerfSpanAggregation,
  PerfBudget,
  PerfBudgetViolation,
  PerfHotPath,
  PerfFrameReport,
  PerfProfilerStats,
} from './perf-profiler.js';
export { createQualityGateEngine } from './quality-gate.js';
export type {
  QualityGateEngine,
  QualityGateDeps,
  GateVerdict,
  GateConditionKind,
  GateCompositeOp,
  GateCondition,
  GateDefinition,
  CompositeGateDefinition,
  GateConditionResult,
  GateEvaluation,
  GateHistoryRecord,
  GateReport,
  GateMetricProvider,
} from './quality-gate.js';
export { createTraceCollector } from './trace-collector.js';
export type {
  TraceId,
  SpanId,
  TraceSpan,
  SpanCorrelation,
  TraceReport,
  StartSpanResult,
  EndSpanResult,
  AddTagResult,
  TraceCollectorDeps,
  TraceCollector,
} from './trace-collector.js';
export { createSlaMonitor } from './sla-monitor.js';
export type {
  SlaMetricType,
  SlaTarget,
  SlaMetric,
  SlaWindow,
  ComplianceReport,
  SlaAlert,
  SetTargetResult,
  RecordMetricResult,
  SlaMonitorDeps,
  SlaMonitor,
} from './sla-monitor.js';

export { createChaosEngineer } from './chaos-engineer.js';
export type {
  FaultType,
  ExperimentStatus,
  ChaosScenario,
  InjectionTarget,
  FaultParameters,
  ChaosExperiment,
  ExperimentResult,
  Observation,
  ResilienceReport,
  Weakness,
  ChaosEngineer,
  ChaosEngineerDeps,
} from './chaos-engineer.js';
export { createRegressionDetector } from './regression-detector.js';
export type {
  RegressionSeverity,
  MetricDirection,
  MetricBaseline,
  MetricSnapshot as RegressionMetricSnapshot,
  RegressionAlert,
  RegressionThreshold,
  BaselineReport,
  RegressionDetector,
  RegressionDetectorDeps,
} from './regression-detector.js';

// -- Wave 14: SLA Monitor System ----------------------------------------------
export { createSLAMonitorSystem } from './sla-monitor-system.js';
export type {
  SLAMonitorSystem,
  SLAMonitorSystemDeps,
  SLAId,
  ServiceId as SLAServiceId,
  SLAError,
  SLAStatus,
  SLAMetricType,
  SLAWindow,
  SLA,
  SLAViolation,
  SLAReport,
} from './sla-monitor-system.js';

// -- Wave 14: Resource Profiler -----------------------------------------------
export { createResourceProfilerSystem } from './resource-profiler.js';
export type {
  ResourceProfilerSystem,
  ResourceProfilerSystemDeps,
  ServiceName as ProfilerServiceName,
  ProfileId,
  ProfilerError,
  ResourceType,
  ResourceSample,
  ResourceProfile,
  BottleneckReport,
} from './resource-profiler.js';

// -- Wave 13: Capacity Planner ------------------------------------------------
export { createCapacityPlannerSystem } from './capacity-planner.js';
export type {
  CapacityPlannerSystem,
  CapacityPlannerDeps,
  ResourceName,
  PlanId,
  PlannerError,
  CapacityStatus,
  ResourceCapacity,
  CapacityPlan,
  DemandForecast,
} from './capacity-planner.js';

// -- Wave 13: Trace Collector System ------------------------------------------
export { createTraceCollectorSystem } from './trace-collector-system.js';
export type {
  TraceCollectorSystem,
  TraceCollectorSystemDeps,
  TraceId as TracerTraceId,
  SpanId as TracerSpanId,
  ServiceName,
  TracerError,
  SpanStatus,
  TraceSpan as TracerSpan,
  Trace as TraceRecord,
  TraceStats,
} from './trace-collector-system.js';

// -- Wave 12: Anomaly Detector System ----------------------------------------
export { createAnomalyDetectorSystem } from './anomaly-detector-system.js';
export type {
  AnomalyDetectorSystem,
  AnomalyDetectorSystemDeps,
  MetricName as AnomalyMetricName,
  AnomalyId,
  AnomalyError,
  AnomalyType,
  AnomalySensitivity,
  Anomaly as AnomalyRecord,
  BaselineWindow,
} from './anomaly-detector-system.js';

// -- Wave 12: Dependency Graph -----------------------------------------------
export { createDependencyGraphSystem } from './dependency-graph.js';
export type {
  DependencyGraphSystem,
  DependencyGraphSystemDeps,
  ServiceId,
  DependencyId,
  GraphError,
  ServiceHealth,
  ServiceNode,
  Dependency as ServiceDependency,
  DependencyChain,
  GraphStats,
} from './dependency-graph.js';

// -- Wave 11: Alert Manager --------------------------------------------------
export { createAlertManagerSystem } from './alert-manager.js';
export type {
  AlertManagerSystem,
  AlertManagerSystemDeps,
  AlertId,
  RuleId,
  AlertSeverity as AlertManagerSeverity,
  AlertStatus as AlertManagerStatus,
  AlertError,
  AlertRule as AlertManagerRule,
  Alert,
  AlertSummary,
} from './alert-manager.js';

// -- Wave 11: Metrics Aggregator System --------------------------------------
export { createMetricsAggregatorSystem } from './metrics-aggregator-system.js';
export type {
  MetricsAggregatorSystem,
  MetricsAggregatorSystemDeps,
  MetricName,
  AggregateWindow,
  MetricError,
  MetricSampleRecord,
  MetricAggregation,
  MetricRegistry as MetricRegistryEntry,
} from './metrics-aggregator-system.js';

// -- Wave 10: Load Tester ----------------------------------------------------
export {
  createLoadTester,
  defineScenario,
  addOperation,
  createOperationMix,
  runScenario,
  recordLatency,
  computePercentiles,
  getReport as getLoadTestReport,
  compareScenarios,
  getScenario,
  listScenarios,
  getVirtualUsers,
  clearScenario,
} from './load-tester.js';
export type {
  ResourceType as LoadResourceType,
  OperationType,
  Operation,
  OperationMix,
  VirtualUser,
  LoadScenario,
  LatencyBucket,
  ThroughputResult,
  PercentileData,
  LoadTestReport,
  ScenarioComparison,
  LoadTesterError,
} from './load-tester.js';

// -- Wave 10: Cost Analyser --------------------------------------------------
export {
  createCostAnalyser,
  recordCost,
  recordOperationCost,
  getServiceCosts,
  detectWaste,
  computeEfficiency,
  getCostTrend,
  getCostReport,
  compareServices,
  listServices as listCostServices,
  clearService,
} from './cost-analyser.js';
export type {
  ResourceType as CostResourceType,
  ResourceCost,
  ServiceCosts,
  OperationCost,
  WasteReport,
  EfficiencyScore,
  CostTrend,
  CostDataPoint,
  CostReport,
  CostAnalyserError,
} from './cost-analyser.js';

// ── Phase 2 Infrastructure Adapters ─────────────────────────────

export { createPrometheusAdapter } from './prometheus-metrics.js';
export type {
  PrometheusAdapter,
  PrometheusAdapterConfig,
  PrometheusCounter,
  PrometheusGauge,
  PrometheusHistogram,
} from './prometheus-metrics.js';

export { createOtelTracer } from './otel-tracer.js';
export type {
  OtelTracerAdapter,
  OtelTracerConfig,
  OtelSpanHandle,
} from './otel-tracer.js';

export { createChaosEngine } from './chaos-engine.js';
export type {
  ChaosEngine,
  ChaosEngineDeps,
  ChaosEngineConfig,
  ChaosEngineStats,
  ChaosClockPort,
  ChaosIdPort,
  ChaosLogPort,
  ChaosMetricsPort,
  ChaosExecutorPort,
  ChaosNotificationPort,
  ChaosPhase,
  FaultType as ChaosEngineFaultType,
  ChaosExperiment as ChaosEngineExperiment,
  ExperimentResult as ChaosEngineExperimentResult,
  ChaosEvent,
  SafetyConfig,
  ScheduleExperimentParams,
} from './chaos-engine.js';

// ── Phase 11.3 Player Analytics ─────────────────────────────────

export { createPlayerAnalyticsEngine } from './player-analytics.js';
export type {
  PlayerAnalyticsEngine,
  PlayerAnalyticsDeps,
  PlayerAnalyticsConfig,
  PlayerAnalyticsStats,
  AnalyticsClockPort,
  AnalyticsIdPort,
  AnalyticsLogPort,
  AnalyticsEventPort,
  PlayerMetricsPort,
  CohortStorePort,
  SurveyStorePort,
  PlayStyle,
  FunnelStage,
  ChurnRisk,
  SessionRecord,
  EconomicSnapshot,
  PlayerProfile,
  FunnelReport,
  FunnelStageMetric,
  ChurnPrediction,
  ChurnSignal,
  HeatmapCell,
  EngagementCurve,
  EngagementBucket,
  EconomyAnalytics,
  AbExperiment,
  AbResult,
  VariantResult,
  CohortMetricSet,
  SurveyResponse,
  SurveyResults,
  DifficultyRecommendation,
} from './player-analytics.js';

// ── Phase 22: Error Tracker ──────────────────────────────────────
export { createErrorTracker, createHttpErrorReporter } from './error-tracker.js';
export type {
  ErrorSeverity,
  Breadcrumb,
  ErrorContext,
  ErrorEvent,
  ErrorReporter,
  ErrorTrackerConfig,
  ErrorTracker,
  ErrorTrackerStats,
} from './error-tracker.js';

// ── Phase 23: Contract Ports ──────────────────────────────────────
export { createMockCovenantContractPort, covenantStatusFromCode, covenantCodeFromStatus, applyChainState } from './covenant-contract-port.js';
export type { CovenantContractPort, CovenantContractState, BlockchainTx, MockTxOptions } from './covenant-contract-port.js';
export { hashRecord, buildMerkleTree, buildMerkleProof, verifyMerkleProof, buildBatch, createMockWitnessRegistryPort } from './witness-contract-port.js';
export type { WitnessRecord, WitnessRecordType, WitnessBatch, BatchSubmitResult, VerifyResult, WitnessRegistryPort } from './witness-contract-port.js';
