/**
 * Survey Mission Engine — Core gameplay loop for world discovery.
 *
 * Bible v1.1 Part 1.2, Part 8: Survey vessels use bubble projection to
 * reach uncharted worlds, deploy resonance beacons, and establish new
 * Lattice nodes. 600 worlds unlock over ~35 real years.
 *
 * Key constraints:
 *   - Ships cannot chain-jump (must refuel between missions)
 *   - Fuel consumption = distanceLY / maxRangeLY
 *   - Transit time = distanceLY / effectiveVelocity (in real years)
 *   - Survey priority gated by subscription tier
 *   - One Survey Mark per world (600 possible)
 *
 * Mission lifecycle:
 *   PREPARING → IN_TRANSIT → ARRIVED → DEPLOYING → COMPLETED
 *   Any phase → ABORTED (before COMPLETED)
 *   PREPARING → FAILED (insufficient fuel, denied priority)
 */

import {
  vesselNotFound,
  vesselAlreadyExists,
  vesselInsufficientFuel,
  vesselNotDocked,
  missionNotFound,
  missionInvalidPhase,
  worldAlreadySurveyed,
  surveyPriorityDenied,
} from './weave-errors.js';

// ─── Types ───────────────────────────────────────────────────────────

export type SurveyPriority = 'none' | 'standard' | 'priority' | 'priority_with_observer';

export type VesselStatus = 'docked' | 'deployed' | 'returning';

export type MissionPhase =
  | 'preparing'
  | 'in_transit'
  | 'arrived'
  | 'deploying'
  | 'completed'
  | 'failed'
  | 'aborted';

export interface SurveyVessel {
  readonly vesselId: string;
  readonly dynastyId: string;
  readonly fusionCharge: number;
  readonly maxRangeLY: number;
  readonly effectiveVelocity: number;
  readonly status: VesselStatus;
  readonly registeredAt: number;
}

export interface SurveyMission {
  readonly missionId: string;
  readonly dynastyId: string;
  readonly vesselId: string;
  readonly originNodeId: string;
  readonly targetWorldId: string;
  readonly phase: MissionPhase;
  readonly priority: SurveyPriority;
  readonly distanceLY: number;
  readonly estimatedTransitUs: number;
  readonly departedAt: number | null;
  readonly arrivedAt: number | null;
  readonly completedAt: number | null;
  readonly deployedBeaconId: string | null;
}

export interface MissionPhaseTransition {
  readonly missionId: string;
  readonly from: MissionPhase;
  readonly to: MissionPhase;
  readonly at: number;
  readonly reason: string;
}

export interface RegisterVesselParams {
  readonly vesselId: string;
  readonly dynastyId: string;
  readonly maxRangeLY: number;
  readonly effectiveVelocity: number;
}

export interface InitiateMissionParams {
  readonly missionId: string;
  readonly vesselId: string;
  readonly originNodeId: string;
  readonly targetWorldId: string;
  readonly distanceLY: number;
  readonly priority: SurveyPriority;
}

export interface SurveyMissionEngine {
  registerVessel(params: RegisterVesselParams): SurveyVessel;
  getVessel(vesselId: string): SurveyVessel;
  tryGetVessel(vesselId: string): SurveyVessel | undefined;
  refuelVessel(vesselId: string): SurveyVessel;

  initiateMission(params: InitiateMissionParams): SurveyMission;
  getMission(missionId: string): SurveyMission;
  tryGetMission(missionId: string): SurveyMission | undefined;
  evaluateTransit(missionId: string): MissionPhaseTransition | null;
  confirmArrival(missionId: string): MissionPhaseTransition;
  beginBeaconDeployment(missionId: string): MissionPhaseTransition;
  completeMission(missionId: string, beaconId: string): MissionPhaseTransition;
  abortMission(missionId: string, reason: string): MissionPhaseTransition;

  listByDynasty(dynastyId: string): ReadonlyArray<SurveyMission>;
  listByPhase(phase: MissionPhase): ReadonlyArray<SurveyMission>;
  isWorldSurveyed(worldId: string): boolean;
  surveyedWorldCount(): number;
  vesselCount(): number;
  missionCount(): number;
}

// ─── Constants ───────────────────────────────────────────────────────

const US_PER_HOUR = 3_600_000_000;
const HOURS_PER_YEAR = 8_760;

export const SURVEY_CONSTANTS = {
  minEffectiveVelocity: 0.08,
  maxEffectiveVelocity: 0.12,
  minRangeLY: 5,
  maxRangeLY: 8,
} as const;

// ─── State ───────────────────────────────────────────────────────────

interface MutableVessel {
  readonly vesselId: string;
  readonly dynastyId: string;
  fusionCharge: number;
  readonly maxRangeLY: number;
  readonly effectiveVelocity: number;
  status: VesselStatus;
  readonly registeredAt: number;
}

interface MutableMission {
  readonly missionId: string;
  readonly dynastyId: string;
  readonly vesselId: string;
  readonly originNodeId: string;
  readonly targetWorldId: string;
  phase: MissionPhase;
  readonly priority: SurveyPriority;
  readonly distanceLY: number;
  readonly estimatedTransitUs: number;
  departedAt: number | null;
  arrivedAt: number | null;
  completedAt: number | null;
  deployedBeaconId: string | null;
}

interface EngineState {
  readonly vessels: Map<string, MutableVessel>;
  readonly missions: Map<string, MutableMission>;
  readonly surveyedWorlds: Set<string>;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createSurveyMissionEngine(deps: {
  readonly clock: { nowMicroseconds(): number };
}): SurveyMissionEngine {
  const state: EngineState = {
    vessels: new Map(),
    missions: new Map(),
    surveyedWorlds: new Set(),
    clock: deps.clock,
  };

  return {
    registerVessel: (p) => registerVesselImpl(state, p),
    getVessel: (id) => getVesselImpl(state, id),
    tryGetVessel: (id) => tryGetVesselImpl(state, id),
    refuelVessel: (id) => refuelVesselImpl(state, id),
    initiateMission: (p) => initiateMissionImpl(state, p),
    getMission: (id) => getMissionImpl(state, id),
    tryGetMission: (id) => tryGetMissionImpl(state, id),
    evaluateTransit: (id) => evaluateTransitImpl(state, id),
    confirmArrival: (id) => confirmArrivalImpl(state, id),
    beginBeaconDeployment: (id) => beginDeploymentImpl(state, id),
    completeMission: (id, bId) => completeMissionImpl(state, id, bId),
    abortMission: (id, r) => abortMissionImpl(state, id, r),
    listByDynasty: (dId) => listByDynastyImpl(state, dId),
    listByPhase: (p) => listByPhaseImpl(state, p),
    isWorldSurveyed: (wId) => state.surveyedWorlds.has(wId),
    surveyedWorldCount: () => state.surveyedWorlds.size,
    vesselCount: () => state.vessels.size,
    missionCount: () => state.missions.size,
  };
}

// ─── Vessel Operations ──────────────────────────────────────────────

function registerVesselImpl(state: EngineState, params: RegisterVesselParams): SurveyVessel {
  if (state.vessels.has(params.vesselId)) {
    throw vesselAlreadyExists(params.vesselId);
  }
  const vessel: MutableVessel = {
    vesselId: params.vesselId,
    dynastyId: params.dynastyId,
    fusionCharge: 1.0,
    maxRangeLY: params.maxRangeLY,
    effectiveVelocity: params.effectiveVelocity,
    status: 'docked',
    registeredAt: state.clock.nowMicroseconds(),
  };
  state.vessels.set(params.vesselId, vessel);
  return toReadonlyVessel(vessel);
}

function getVesselImpl(state: EngineState, vesselId: string): SurveyVessel {
  const vessel = state.vessels.get(vesselId);
  if (vessel === undefined) throw vesselNotFound(vesselId);
  return toReadonlyVessel(vessel);
}

function tryGetVesselImpl(state: EngineState, vesselId: string): SurveyVessel | undefined {
  const vessel = state.vessels.get(vesselId);
  return vessel !== undefined ? toReadonlyVessel(vessel) : undefined;
}

function refuelVesselImpl(state: EngineState, vesselId: string): SurveyVessel {
  const vessel = getMutableVessel(state, vesselId);
  if (vessel.status !== 'docked') throw vesselNotDocked(vesselId);
  vessel.fusionCharge = 1.0;
  return toReadonlyVessel(vessel);
}

// ─── Mission Reads ──────────────────────────────────────────────────

function getMissionImpl(state: EngineState, missionId: string): SurveyMission {
  const mission = state.missions.get(missionId);
  if (mission === undefined) throw missionNotFound(missionId);
  return toReadonlyMission(mission);
}

function tryGetMissionImpl(state: EngineState, missionId: string): SurveyMission | undefined {
  const mission = state.missions.get(missionId);
  return mission !== undefined ? toReadonlyMission(mission) : undefined;
}

// ─── Mission Initiation ─────────────────────────────────────────────

function initiateMissionImpl(state: EngineState, params: InitiateMissionParams): SurveyMission {
  validateMissionParams(state, params);
  const vessel = getMutableVessel(state, params.vesselId);
  const fuelRequired = params.distanceLY / vessel.maxRangeLY;
  validateFuelAndStatus(vessel, fuelRequired);

  vessel.fusionCharge -= fuelRequired;
  vessel.status = 'deployed';

  const now = state.clock.nowMicroseconds();
  const transitUs = calculateTransitDurationUs(params.distanceLY, vessel.effectiveVelocity);

  const mission: MutableMission = {
    missionId: params.missionId,
    dynastyId: vessel.dynastyId,
    vesselId: params.vesselId,
    originNodeId: params.originNodeId,
    targetWorldId: params.targetWorldId,
    phase: 'in_transit',
    priority: params.priority,
    distanceLY: params.distanceLY,
    estimatedTransitUs: transitUs,
    departedAt: now,
    arrivedAt: null,
    completedAt: null,
    deployedBeaconId: null,
  };
  state.missions.set(params.missionId, mission);
  return toReadonlyMission(mission);
}

function validateMissionParams(state: EngineState, params: InitiateMissionParams): void {
  if (params.priority === 'none') {
    throw surveyPriorityDenied(params.vesselId, params.priority);
  }
  if (state.surveyedWorlds.has(params.targetWorldId)) {
    throw worldAlreadySurveyed(params.targetWorldId);
  }
}

function validateFuelAndStatus(vessel: MutableVessel, fuelRequired: number): void {
  if (vessel.status !== 'docked') throw vesselNotDocked(vessel.vesselId);
  if (vessel.fusionCharge < fuelRequired) {
    throw vesselInsufficientFuel(vessel.vesselId, fuelRequired);
  }
}

// ─── Transit Evaluation ─────────────────────────────────────────────

function evaluateTransitImpl(
  state: EngineState,
  missionId: string,
): MissionPhaseTransition | null {
  const mission = getMutableMission(state, missionId);
  if (mission.phase !== 'in_transit') return null;
  if (mission.departedAt === null) return null;

  const now = state.clock.nowMicroseconds();
  const elapsed = now - mission.departedAt;
  if (elapsed < mission.estimatedTransitUs) return null;

  mission.arrivedAt = now;
  return applyPhaseTransition(mission, 'arrived', now, 'Transit complete — vessel arrived');
}

function confirmArrivalImpl(state: EngineState, missionId: string): MissionPhaseTransition {
  const mission = getMutableMission(state, missionId);
  assertPhase(mission, 'arrived', 'deploying');
  const now = state.clock.nowMicroseconds();
  return applyPhaseTransition(mission, 'deploying', now, 'Arrival confirmed — beginning survey');
}

// ─── Beacon Deployment ──────────────────────────────────────────────

function beginDeploymentImpl(state: EngineState, missionId: string): MissionPhaseTransition {
  const mission = getMutableMission(state, missionId);
  assertPhase(mission, 'arrived', 'deploying');
  const now = state.clock.nowMicroseconds();
  return applyPhaseTransition(mission, 'deploying', now, 'Beacon deployment initiated');
}

function completeMissionImpl(
  state: EngineState,
  missionId: string,
  beaconId: string,
): MissionPhaseTransition {
  const mission = getMutableMission(state, missionId);
  assertPhase(mission, 'deploying', 'completed');
  const now = state.clock.nowMicroseconds();
  mission.deployedBeaconId = beaconId;
  mission.completedAt = now;
  state.surveyedWorlds.add(mission.targetWorldId);
  returnVesselToDocked(state, mission.vesselId);
  return applyPhaseTransition(mission, 'completed', now,
    `Beacon ${beaconId} deployed — world ${mission.targetWorldId} surveyed`);
}

// ─── Abort ──────────────────────────────────────────────────────────

function abortMissionImpl(
  state: EngineState,
  missionId: string,
  reason: string,
): MissionPhaseTransition {
  const mission = getMutableMission(state, missionId);
  if (mission.phase === 'completed' || mission.phase === 'aborted' || mission.phase === 'failed') {
    throw missionInvalidPhase(missionId, mission.phase, 'abortable phase');
  }
  const now = state.clock.nowMicroseconds();
  returnVesselToDocked(state, mission.vesselId);
  return applyPhaseTransition(mission, 'aborted', now, `Mission aborted: ${reason}`);
}

// ─── Queries ────────────────────────────────────────────────────────

function listByDynastyImpl(
  state: EngineState,
  dynastyId: string,
): ReadonlyArray<SurveyMission> {
  const result: SurveyMission[] = [];
  for (const m of state.missions.values()) {
    if (m.dynastyId === dynastyId) result.push(toReadonlyMission(m));
  }
  return result;
}

function listByPhaseImpl(
  state: EngineState,
  phase: MissionPhase,
): ReadonlyArray<SurveyMission> {
  const result: SurveyMission[] = [];
  for (const m of state.missions.values()) {
    if (m.phase === phase) result.push(toReadonlyMission(m));
  }
  return result;
}

// ─── Transit Duration Calculation ───────────────────────────────────

export function calculateTransitDurationUs(distanceLY: number, effectiveVelocity: number): number {
  const yearsInTransit = distanceLY / effectiveVelocity;
  return yearsInTransit * HOURS_PER_YEAR * US_PER_HOUR;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getMutableVessel(state: EngineState, vesselId: string): MutableVessel {
  const vessel = state.vessels.get(vesselId);
  if (vessel === undefined) throw vesselNotFound(vesselId);
  return vessel;
}

function getMutableMission(state: EngineState, missionId: string): MutableMission {
  const mission = state.missions.get(missionId);
  if (mission === undefined) throw missionNotFound(missionId);
  return mission;
}

function returnVesselToDocked(state: EngineState, vesselId: string): void {
  const vessel = state.vessels.get(vesselId);
  if (vessel !== undefined) vessel.status = 'docked';
}

function assertPhase(mission: MutableMission, expected: MissionPhase, target: string): void {
  if (mission.phase !== expected) {
    throw missionInvalidPhase(mission.missionId, mission.phase, target);
  }
}

function applyPhaseTransition(
  mission: MutableMission,
  to: MissionPhase,
  at: number,
  reason: string,
): MissionPhaseTransition {
  const from = mission.phase;
  mission.phase = to;
  return { missionId: mission.missionId, from, to, at, reason };
}

function toReadonlyVessel(vessel: MutableVessel): SurveyVessel {
  return {
    vesselId: vessel.vesselId,
    dynastyId: vessel.dynastyId,
    fusionCharge: vessel.fusionCharge,
    maxRangeLY: vessel.maxRangeLY,
    effectiveVelocity: vessel.effectiveVelocity,
    status: vessel.status,
    registeredAt: vessel.registeredAt,
  };
}

function toReadonlyMission(mission: MutableMission): SurveyMission {
  return {
    missionId: mission.missionId,
    dynastyId: mission.dynastyId,
    vesselId: mission.vesselId,
    originNodeId: mission.originNodeId,
    targetWorldId: mission.targetWorldId,
    phase: mission.phase,
    priority: mission.priority,
    distanceLY: mission.distanceLY,
    estimatedTransitUs: mission.estimatedTransitUs,
    departedAt: mission.departedAt,
    arrivedAt: mission.arrivedAt,
    completedAt: mission.completedAt,
    deployedBeaconId: mission.deployedBeaconId,
  };
}
