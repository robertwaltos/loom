/**
 * @loom/silfen-weave — Seamless world transition orchestration.
 *
 * The Silfen Weave is the lattice connecting all worlds in The Loom.
 * Transit between worlds requires establishing frequency locks between
 * lattice nodes, with coherence thresholds gating progression.
 *
 * Lattice Nodes: Topology, frequency signatures, resonance beacons.
 * Frequency Locks: Transit state machine, coherence tracking.
 * Transit Anomaly Detector: Coherence pattern analysis, spoofing detection.
 * Transit Validator: Rule-based entity validation for world transitions.
 * Frequency Signature Matcher: Deep comparison, drift detection, candidate ranking.
 * Transit Queue: Priority-ordered entity transition request management.
 * World Connectivity Graph: Directed graph with shortest path finding.
 * Coherence Monitor: World coherence level tracking and alert generation.
 * Transit Cooldown Tracker: Per-entity cooldown enforcement between transits.
 * World Event Log: Per-world timestamped event logging with rotation.
 * Survey Roster: Survey Corps member lifecycle and deployment tracking.
 * Transit Ledger: Immutable record of all world-to-world transits.
 */

export { createLatticeNodeRegistry } from './lattice-node.js';
export type {
  LatticeNodeRegistry,
  LatticeNode,
  LatticeRoute,
  FrequencySignature,
  ResonanceBeacon,
  BeaconStatus,
  PrecisionRating,
  RegisterNodeParams,
} from './lattice-node.js';
export {
  createFrequencyLockService,
  classifyCoherence,
  DEFAULT_LOCK_CONFIG as FREQUENCY_LOCK_CONFIG,
  COHERENCE_THRESHOLDS,
} from './frequency-lock.js';
export type {
  FrequencyLockService,
  FrequencyDeps,
  FrequencyLockConfig,
  FrequencyLockStats,
  LockState,
  CoherenceLevel as FrequencyCoherenceLevel,
  FrequencyRecord,
  AttunementProgress,
  DisruptionEvent as FrequencyDisruptionEvent,
  FrequencyClockPort,
  FrequencyIdGeneratorPort,
} from './frequency-lock.js';
export {
  createSurveyMissionEngine,
  calculateTransitDurationUs,
  SURVEY_CONSTANTS,
} from './survey-mission.js';
export type {
  SurveyMissionEngine,
  SurveyMission,
  SurveyVessel,
  SurveyPriority,
  VesselStatus,
  MissionPhase,
  MissionPhaseTransition,
  RegisterVesselParams,
  InitiateMissionParams,
} from './survey-mission.js';
export { createLatticeCorridorEngine } from './lattice-corridor.js';
export type {
  LatticeCorridorEngine,
  TransitCorridor,
  CorridorPhase,
  OpenCorridorParams,
  CorridorTransition,
  TransitEvent,
  LatticeCorridorDeps,
  CorridorNodePort,
  CorridorLockPort,
  CorridorLockTransition,
  CorridorIdGenerator,
} from './lattice-corridor.js';
export { createTransitAnomalyDetector, DEFAULT_ANOMALY_CONFIG } from './transit-anomaly.js';
export type {
  TransitAnomalyDetector,
  TransitAnomaly,
  AnomalyType,
  AnomalySeverity,
  AnomalyDetectorConfig,
  AnomalyDetectorDeps,
  AnomalyIdGenerator,
  AnomalyCallback,
} from './transit-anomaly.js';
export {
  createTransitValidator,
  requiredComponentsRule,
  worldCapacityRule,
  entityLockRule,
} from './transit-validator.js';
export type {
  TransitValidator,
  TransitValidatorDeps,
  TransitValidationRule,
  ValidationContext,
  TransitValidationResult,
  ValidationIssue,
  ValidationSeverity,
  WorldCapacityInfo,
} from './transit-validator.js';
export { createFrequencySignatureMatcher, DEFAULT_DRIFT_THRESHOLD } from './frequency-matcher.js';
export type {
  FrequencySignatureMatcher,
  MatchableSignature,
  CandidateSignature,
  SignatureMatch,
  MatchQuality,
  RankedMatch,
  SignatureDrift,
  DriftSeverity,
  DriftThreshold,
  FrequencyBandwidth,
} from './frequency-matcher.js';
export { WeaveError } from './weave-errors.js';
export type { WeaveErrorCode } from './weave-errors.js';
export {
  nodeNotFound,
  nodeAlreadyExists,
  routeNotFound,
  lockNotFound,
  lockAlreadyExists,
  lockInvalidTransition,
  coherenceOutOfRange,
  beaconInvalidStatus,
  transitFailed,
  vesselNotFound,
  vesselAlreadyExists,
  vesselInsufficientFuel,
  vesselNotDocked,
  missionNotFound,
  missionInvalidPhase,
  worldAlreadySurveyed,
  surveyPriorityDenied,
  corridorNotFound,
  corridorAlreadyExists,
  corridorNoRoute,
  corridorEntityInTransit,
  corridorInvalidPhase,
} from './weave-errors.js';
export { createTransitQueue } from './transit-queue.js';
export type {
  TransitQueue,
  TransitQueueDeps,
  TransitQueueConfig,
  TransitPriority,
  TransitRequest,
  TransitQueueEntry,
  EnqueueResult,
  TransitQueueStats,
} from './transit-queue.js';
export { createWorldConnectivityGraph } from './world-connectivity.js';
export type {
  WorldConnectivityGraph,
  WorldEdge,
  AddEdgeParams,
  PathResult,
  ConnectivityStats,
} from './world-connectivity.js';
export { createCoherenceMonitor, DEFAULT_COHERENCE_CONFIG } from './coherence-monitor.js';
export type {
  CoherenceMonitor,
  CoherenceMonitorDeps,
  CoherenceConfig,
  CoherenceLevel,
  CoherenceSample,
  CoherenceSubject,
  RegisterSubjectParams,
  RecordSampleParams,
  CoherenceAlert,
  CoherenceStats,
} from './coherence-monitor.js';
export { createTransitCooldownTracker, DEFAULT_COOLDOWN_CONFIG } from './transit-cooldown.js';
export type {
  TransitCooldownTracker,
  TransitCooldownDeps,
  CooldownConfig,
  CooldownRecord,
  StartCooldownParams,
  CooldownStats,
} from './transit-cooldown.js';
export { createWorldEventLog, DEFAULT_EVENT_LOG_CONFIG } from './world-event-log.js';
export type {
  WorldEventLog,
  WorldEventLogDeps,
  WorldEvent,
  LogEventParams,
  EventSeverity as WorldEventSeverity,
  EventLogConfig,
  EventLogStats,
} from './world-event-log.js';
export { createSurveyRoster } from './survey-roster.js';
export type {
  SurveyRoster,
  SurveyRosterDeps,
  RosterMember,
  RosterMemberStatus,
  SurveySpecialisation,
  EnrollParams as SurveyEnrollParams,
  RosterStats,
} from './survey-roster.js';
export { createTransitLedger } from './transit-ledger.js';
export type {
  TransitLedger,
  TransitLedgerDeps,
  TransitRecord,
  RecordTransitParams,
  TransitLedgerStats,
} from './transit-ledger.js';
export { createWorldWeatherEngine } from './world-weather.js';
export type {
  WorldWeatherEngine,
  WorldWeatherDeps,
  WeatherType,
  WeatherSeverity,
  WeatherCondition,
  SetWeatherParams,
  WorldWeatherSnapshot,
  WorldWeatherStats,
} from './world-weather.js';
export { createWorldResourceMap } from './world-resource-map.js';
export type {
  WorldResourceMap,
  WorldResourceDeps,
  ResourceType,
  ResourceDeposit,
  RegisterDepositParams as ResourceRegisterParams,
  ExtractionResult,
  WorldResourceStats,
} from './world-resource-map.js';
export { createWorldTimeZoneService } from './world-time-zone.js';
export type {
  WorldTimeZoneService,
  WorldTimeZoneDeps,
  WorldTimeConfig,
  WorldLocalTime,
  WorldTimeZoneStats,
} from './world-time-zone.js';
export { createWorldPortalRegistry } from './world-portal.js';
export type {
  WorldPortalRegistry,
  WorldPortalDeps,
  PortalStatus,
  PortalSnapshot,
  CreatePortalParams,
  WorldPortalStats,
} from './world-portal.js';
export { createWeaveOrchestrator, DEFAULT_WEAVE_CONFIG } from './weave-orchestrator.js';
export type {
  WeaveOrchestrator,
  WeaveOrchestratorDeps,
  WeaveOrchestratorConfig,
  WeaveOrchestratorStats,
  WeaveTickResult,
  WeaveQueuePort,
  WeaveCorridorPort,
  WeaveCoherencePort,
  WeaveSurveyPort,
  WeaveLedgerPort,
  WeaveQueueEntry,
  WeaveCorridorRecord,
  WeaveCorridorTransition,
} from './weave-orchestrator.js';
export { createCorridorStabilityService, DEFAULT_STABILITY_CONFIG } from './corridor-stability.js';
export type {
  CorridorStabilityService,
  CorridorStabilityDeps,
  CorridorStabilityRecord,
  StabilityGrade,
  StabilizationResult,
  DegradationEvent,
  DegradationCause,
  StabilityConfig,
  CorridorStabilityStats,
} from './corridor-stability.js';
export { createTransitAnalyticsService } from './transit-analytics.js';
export type {
  TransitAnalyticsService,
  TransitAnalyticsDeps,
  TransitRecord as AnalyticsTransitRecord,
  RouteTrafficSummary,
  WorldTrafficSummary,
  TrafficBottleneck,
  BottleneckSeverity,
  TransitPattern,
  PatternType,
  TransitAnalyticsStats,
} from './transit-analytics.js';
export { createTransitScheduler } from './transit-scheduler.js';
export type {
  TransitScheduler,
  TransitSchedulerDeps,
  SchedulerClock,
  SchedulerIdGenerator,
  TransitWindow,
  CreateWindowParams,
  WindowStatus,
  RecurringSchedule,
  CreateScheduleParams,
  RecurrenceInterval,
  QueueEntry,
  BlackoutPeriod,
  CreateBlackoutParams,
  EnrollResult,
  SchedulerStats,
} from './transit-scheduler.js';
export { createResonanceAmplifier, DEFAULT_AMPLIFIER_CONFIG } from './resonance-amplifier.js';
export type {
  ResonanceAmplifier,
  ResonanceAmplifierDeps,
  AmplifierClock,
  AmplifierIdGenerator,
  Amplifier,
  PlaceAmplifierParams,
  AmplifierStatus,
  ResonanceField,
  HarmonicInterference,
  InterferenceSeverity,
  DecayEvent,
  PlacementRecommendation,
  PlacementReason,
  AmplifierConfig,
  AmplifierStats,
} from './resonance-amplifier.js';
export { createTransitInsurance, DEFAULT_INSURANCE_CONFIG } from './transit-insurance.js';
export type {
  TransitInsurance,
  TransitInsuranceDeps,
  InsuranceClock,
  InsuranceIdGenerator,
  InsurancePolicy,
  CreatePolicyParams,
  PolicyStatus,
  RiskTier,
  InsuranceClaim,
  FileClaimParams,
  ClaimResult,
  RiskAssessment,
  RenewalResult,
  ActuarialStats,
  InsuranceConfig,
} from './transit-insurance.js';
export { createLatticeTopology } from './lattice-topology.js';
export type {
  LatticeTopology,
  LatticeTopologyDeps,
  TopologyClock,
  TopologyIdGenerator,
  TopologyNode,
  TopologyEdge,
  Cluster,
  BridgeNode,
  PartitionAnalysis,
  NetworkComponent,
  RedundancyScore,
  RedundancyGrade,
  OptimizationRecommendation,
  OptimizationType,
  RecommendationPriority,
  ResilienceMetrics,
} from './lattice-topology.js';
export {
  createCorridorNetworkService,
  computeEffectiveWeight,
  MAX_PATH_LENGTH,
  DEFAULT_EDGE_WEIGHT,
} from './corridor-network.js';
export type {
  CorridorNetworkService,
  NetworkDeps,
  NetworkClockPort,
  NetworkIdGeneratorPort,
  NetworkNode,
  NetworkEdge,
  CorridorWeight,
  PathRequest as NetworkPathRequest,
  PathResult as NetworkPathResult,
  NetworkStats,
} from './corridor-network.js';
export { createWorldDiscoveryModule } from './world-discovery.js';
export type {
  DiscoveryStage,
  UnlockCondition,
  SurveyProgress,
  WorldDiscoveryRecord,
  WorldDiscoveryDeps,
  WorldDiscoveryModule,
  RecordSurveyResult,
  CheckConditionsResult,
  AdvanceStageResult,
  GetProgressResult,
  SetConditionsResult,
} from './world-discovery.js';
export { createTransitCapacityModule } from './transit-capacity.js';
export type {
  CongestionLevel,
  CorridorCapacity,
  TransitLoad,
  CapacityReport,
  TransitCapacityDeps,
  TransitCapacityModule,
  RecordTransitResult,
  GetCongestionResult,
  GetCapacityResult,
  GetReportResult,
} from './transit-capacity.js';
export { createWeaveEventBusModule } from './weave-event-bus.js';
export type {
  EventPriority,
  WeaveEvent,
  EventRelay,
  WorldFilter,
  RelayResult,
  WeaveEventBusDeps,
  WeaveEventBusModule,
  PublishResult,
  RelayToWorldResult,
  GetEventResult,
} from './weave-event-bus.js';

// -- Wave 10: Wormhole Stabilizer -------------------------------------------
export {
  createWormholeState,
  createWormhole,
  injectEnergy,
  degradeStability,
  checkCollapse,
  getStabilityLevel,
  getStabilityReport,
  getCollapseHistory,
  getCollapseHistoryForWorld,
  setDecayRate,
  getAllWormholes,
  getActiveWormholes,
  getCriticalWormholes,
  getStabilizationEvents,
  getTotalEnergySpent,
  getWormholeCount,
  getCollapseCount,
  getWormhole,
  emergencyStabilization,
  batchDegrade,
  getWormholesForWorld,
  getAverageStability,
} from './wormhole-stabilizer.js';
export type {
  StabilityLevel,
  Wormhole,
  StabilizationEvent,
  CollapseRecord,
  EnergyReport,
  WormholeState,
  WormholeError,
} from './wormhole-stabilizer.js';

// -- Wave 10: Lattice Repair -------------------------------------------------
export {
  createLatticeState,
  registerNode as registerRepairNode,
  registerCrew,
  reportDamage,
  assignCrew,
  progressRepair,
  completeRepair,
  getRepairQueue,
  getRepairProgress,
  getLatticeReport,
  emergencyRepair,
  getNode as getRepairNode,
  getCrew,
  getDamageRecord,
  getAllNodes as getAllRepairNodes,
  getAllCrews,
  getDamagesForNode,
  getUnrepairedDamages,
  getNodesForWorld,
  getDamagedNodes,
  getActiveRepairs,
  getCrewAssignment,
  releaseCrewFromNode,
  getNodeCount,
  getCrewCount,
  getDamageCount,
  getRepairQueueLength,
  forceCompleteRepair,
  getTopCrews,
  batchProgressRepairs,
  getWorldHealth,
  autoAssignCrews,
} from './lattice-repair.js';
export type {
  DamageSeverity,
  LatticeNode as RepairLatticeNode,
  DamageRecord,
  RepairCrew,
  RepairAssignment,
  RepairProgress,
  LatticeReport,
  LatticeState,
  LatticeError,
} from './lattice-repair.js';

// -- Wave 11: Portal Registry ------------------------------------------------
export { createPortalRegistrySystem } from './portal-registry.js';
export type {
  PortalRegistrySystem,
  Portal,
  PortalTraversal,
  PortalStats,
  PortalId,
  WorldId as PortalWorldId,
  PortalStatus as PortalRegistryStatus,
  PortalError,
  PortalClock,
  PortalIdGenerator,
  PortalLogger,
} from './portal-registry.js';

// -- Wave 11: Navigation Graph -----------------------------------------------
export { createNavigationGraphSystem } from './navigation-graph.js';
export type {
  NavigationGraphSystem,
  NavNode,
  NavEdge,
  PathResult as NavPathResult,
  ConnectivityReport,
  NodeId,
  EdgeId,
  NavigationError,
  NavClock,
  NavIdGenerator,
  NavLogger,
} from './navigation-graph.js';

// -- Wave 11: Transit Bookings -----------------------------------------------
export { createTransitSchedulerSystem } from './transit-bookings.js';
export type {
  TransitSchedulerSystem as TransitBookingSystem,
  TransitSchedule,
  TransitBooking,
  TransitEvent as TransitBookingEvent,
  SchedulerStats as TransitBookingStats,
  ScheduleId,
  PassengerId,
  TransitEventId,
  ScheduleStatus,
  ScheduleError,
  BookingClock,
  BookingIdGenerator,
  BookingLogger,
} from './transit-bookings.js';

// -- Wave 12: World Anchor ----------------------------------------------------
export { createWorldAnchorSystem } from './world-anchor.js';
export type {
  WorldAnchorSystem,
  WorldAnchor,
  AnchorSummary,
  AnchorType,
  AnchorError,
  Coordinates,
  AnchorId,
  EntityId as AnchorEntityId,
  WorldId as AnchorWorldId,
  AnchorClock,
  AnchorIdGenerator,
  AnchorLogger,
} from './world-anchor.js';

// -- Wave 12: Signal Relay ----------------------------------------------------
export { createSignalRelaySystem } from './signal-relay.js';
export type {
  SignalRelaySystem,
  Signal,
  RelayStats,
  SignalType,
  SignalError,
  SignalId,
  SenderId,
  WorldId as SignalWorldId,
  SignalClock,
  SignalIdGenerator,
  SignalLogger,
} from './signal-relay.js';

// -- Wave 12: Exploration Tracker ---------------------------------------------
export { createExplorationTrackerSystem } from './exploration-tracker.js';

export type {
  ExplorationTrackerSystem,
  WorldExploration,
  RegionExploration,
  ExplorationProfile,
  ExplorationStatus,
  ExplorationError,
  ExplorationId,
  ExplorationEntityId,
  WorldId as ExplorationWorldId,
  RegionId,
  ExplorationClock,
  ExplorationIdGenerator,
  ExplorationLogger,
} from './exploration-tracker.js';

// -- Wave 13: Faction Territory -----------------------------------------------
export { createFactionTerritorySystem } from './faction-territory.js';
export type {
  FactionTerritorySystem,
  RegionControl,
  TerritoryConflict,
  FactionTerritory,
  ControlStatus,
  TerritoryError,
  FactionId,
  RegionId as TerritoryRegionId,
  WorldId as TerritoryWorldId,
  TerritoryClockPort,
  TerritoryIdGeneratorPort,
  TerritoryLoggerPort,
} from './faction-territory.js';

// -- Wave 13: World Event Bus -------------------------------------------------
export { createWorldEventBusSystem } from './world-event-bus.js';
export type {
  WorldEventBusSystem,
  WorldEvent as CrossWorldEvent,
  Subscription as WorldEventSubscription,
  DeliveryRecord as WorldEventDeliveryRecord,
  EventBusError,
  EventPriority as WorldEventPriority,
  EventBusId,
  SubscriberId,
  WorldId as EventBusWorldId,
  WorldEventBusClockPort,
  WorldEventBusIdGeneratorPort,
  WorldEventBusLoggerPort,
} from './world-event-bus.js';

// -- Wave 13: Survey Corps ----------------------------------------------------
export { createSurveyCorpsSystem } from './survey-corps.js';
export type {
  SurveyCorpsSystem,
  Expedition,
  CorpsRecord,
  SurveyReport as CorpsSurveyReport,
  ExpeditionStatus,
  SurveyError,
  ExpeditionId,
  CorpsId,
  WorldId as SurveyCorpsWorldId,
  SurveyCorpsClockPort,
  SurveyCorpsIdGeneratorPort,
  SurveyCorpsLoggerPort,
} from './survey-corps.js';

// -- Wave 14: Cosmic Event ----------------------------------------------------
export { createCosmicEventSystem } from './cosmic-event.js';
export type {
  CosmicEventSystem,
  CosmicEvent,
  WorldImpact,
  CosmicForecast,
  CosmicEventType,
  CosmicEventStatus,
  CosmicError,
  EventId as CosmicEventId,
  WorldId as CosmicWorldId,
  CosmicClockPort,
  CosmicIdGeneratorPort,
  CosmicLoggerPort,
} from './cosmic-event.js';

// -- Wave 14: Star Map --------------------------------------------------------
export { createStarMapSystem } from './star-map.js';
export type {
  StarMapSystem,
  Star,
  DistanceResult,
  SectorSummary,
  StarClass,
  StarCoordinates,
  StarError,
  StarId,
  WorldId as StarMapWorldId,
  StarMapClockPort,
  StarMapIdGeneratorPort,
  StarMapLoggerPort,
} from './star-map.js';

// -- Wave 14: Gravity Well ----------------------------------------------------
export { createGravityWellSystem } from './gravity-well.js';
export type {
  GravityWellSystem,
  GravityWell,
  TransitCostCalc,
  WellStats,
  WellStrength,
  GravityError,
  WellId,
  WorldId as GravityWorldId,
  GravityClockPort,
  GravityIdGeneratorPort,
  GravityLoggerPort,
} from './gravity-well.js';

// ── Phase 5 World Streaming ─────────────────────────────────────

export { createWorldStreamingManager, DEFAULT_STREAMING_CONFIG } from './world-streaming.js';
export type {
  WorldStreamingManager,
  StreamingConfig,
  ChunkCoord,
  StreamCommand,
  StreamingClockPort,
} from './world-streaming.js';

// ── Phase 12.1 World Expansion ───────────────────────────────────

export { createWorldExpansionEngine } from './world-expansion.js';
export type {
  ExpansionClockPort,
  ExpansionIdPort,
  ExpansionLogPort,
  ExpansionEventPort,
  WorldGeneratorPort,
  WorldStorePort,
  WorldMetricsPort,
  CulturalTemplate,
  WorldReviewStatus,
  SeasonType,
  SeasonalEventType,
  DegradationType,
  WorldTemplate,
  GeneratedWorldData,
  QualityMetrics,
  PerformanceMetrics,
  WorldCandidate,
  SeasonalEvent,
  SurveyMission as ExpansionSurveyMission,
  EvacuationState,
  WorldExpansionConfig,
  WorldExpansionStats,
  WorldExpansionEngine,
  WorldExpansionDeps,
} from './world-expansion.js';

// ── Phase 12.2 Weave Network ────────────────────────────────────

export { createWeaveNetworkEngine } from './weave-network.js';
export type {
  WeaveNetClockPort,
  WeaveNetIdPort,
  WeaveNetLogPort,
  WeaveNetEventPort,
  CorridorStorePort,
  TransitStorePort,
  PriceOraclePort,
  CorridorTier,
  CorridorStatus,
  WeaveEventType,
  WeaveCorridor,
  WeaveEvent as NetworkWeaveEvent,
  TransitRecord as NetworkTransitRecord,
  TransitTrade,
  StabilizationMission,
  ArbitrageOpportunity,
  NetworkTopology,
  EmergencyCorridorRequest,
  WeaveNetworkConfig,
  WeaveNetworkStats,
  WeaveNetworkEngine,
  WeaveNetworkDeps,
} from './weave-network.js';
