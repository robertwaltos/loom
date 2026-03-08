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
  createFrequencyLockEngine,
  calculateLockDurationUs,
  COHERENCE_PARTIAL,
  COHERENCE_CRITICAL,
  COHERENCE_TRANSIT,
} from './frequency-lock.js';
export type {
  FrequencyLockEngine,
  FrequencyLock,
  LockStatus,
  LockTransition,
  InitiateLockParams,
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
export { createTransitValidator, requiredComponentsRule, worldCapacityRule, entityLockRule } from './transit-validator.js';
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
