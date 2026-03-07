/**
 * @loom/silfen-weave — Seamless world transition orchestration.
 *
 * The Silfen Weave is the lattice connecting all worlds in The Loom.
 * Transit between worlds requires establishing frequency locks between
 * lattice nodes, with coherence thresholds gating progression.
 *
 * Lattice Nodes: Topology, frequency signatures, resonance beacons.
 * Frequency Locks: Transit state machine, coherence tracking.
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
} from './weave-errors.js';
