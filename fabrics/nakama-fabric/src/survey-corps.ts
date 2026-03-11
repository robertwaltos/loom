/**
 * Survey Corps Mission Engine — Exploration and world-unlocking system.
 *
 * Bible v1.1 Part 6: Survey Corps & World Discovery
 *
 * The Survey Corps is the player-driven exploration force that discovers
 * and unlocks new worlds across the 600-world lattice over ~35 real years.
 * Missions follow a strict lifecycle with risk, reward, and reputation:
 *
 *   PROPOSED → APPROVED → OUTBOUND → ON_SITE → RETURNING
 *     → COMPLETED (success) | FAILED (risk outcome) | ABORTED (recalled)
 *
 * Mission types:
 *   EXPLORATION     — Initial discovery of uncharted worlds
 *   DEEP_SURVEY     — Detailed analysis of discovered worlds
 *   RESOURCE_MAPPING — Economic potential assessment
 *   HAZARD_ASSESSMENT — Threat evaluation and safety rating
 *   COLONY_PREP     — Final preparation before colonization
 *
 * "The first footprint on an alien world belongs to the dynasty
 *  brave enough to fund the expedition."
 */

// ─── Port Types ─────────────────────────────────────────────────────

export interface SurveyCorpsClock {
  readonly nowMicroseconds: () => number;
}

export interface SurveyCorpsIdGenerator {
  readonly generate: () => string;
}

export interface MissionRewardPort {
  readonly issueReward: (dynastyId: string, amount: bigint, reason: string) => void;
}

export interface WorldUnlockPort {
  readonly unlockWorld: (worldId: string, surveyData: SurveyData) => void;
}

// ─── Types ───────────────────────────────────────────────────────────

export type MissionType =
  | 'exploration'
  | 'deep_survey'
  | 'resource_mapping'
  | 'hazard_assessment'
  | 'colony_prep';

export type MissionPhase =
  | 'proposed'
  | 'approved'
  | 'outbound'
  | 'on_site'
  | 'returning'
  | 'completed'
  | 'failed'
  | 'aborted';

export interface SurveyData {
  readonly worldId: string;
  readonly missionId: string;
  readonly missionType: MissionType;
  readonly discoveredAt: number;
  readonly surveyorDynastyId: string;
  readonly resourceRating: number;
  readonly hazardRating: number;
}

export interface CrewMember {
  readonly dynastyId: string;
  readonly role: CrewRole;
  readonly assignedAt: number;
  readonly experienceLevel: number;
}

export type CrewRole = 'commander' | 'navigator' | 'scientist' | 'engineer' | 'scout';

export interface MissionLogEntry {
  readonly entryId: string;
  readonly missionId: string;
  readonly timestamp: number;
  readonly message: string;
  readonly phase: MissionPhase;
}

export interface MissionTarget {
  readonly worldId: string;
  readonly stellarClass: string;
  readonly distanceLightYears: number;
  readonly knownHazards: number;
}

export interface MissionReward {
  readonly kalonBounty: bigint;
  readonly namingRights: boolean;
  readonly resourceDataValue: number;
}

export interface Mission {
  readonly missionId: string;
  readonly missionType: MissionType;
  readonly phase: MissionPhase;
  readonly target: MissionTarget;
  readonly crew: ReadonlyArray<CrewMember>;
  readonly difficulty: number;
  readonly riskFactor: number;
  readonly reward: MissionReward;
  readonly proposedAt: number;
  readonly phaseChangedAt: number;
  readonly phaseDurationsUs: Readonly<Record<string, number>>;
  readonly sponsorDynastyId: string;
  readonly logEntries: ReadonlyArray<MissionLogEntry>;
  readonly completedSurveyData: SurveyData | null;
}

export interface ProposeMissionParams {
  readonly missionType: MissionType;
  readonly target: MissionTarget;
  readonly sponsorDynastyId: string;
}

export interface AssignCrewParams {
  readonly missionId: string;
  readonly dynastyId: string;
  readonly role: CrewRole;
  readonly experienceLevel: number;
}

export interface MissionPhaseTransition {
  readonly missionId: string;
  readonly from: MissionPhase;
  readonly to: MissionPhase;
  readonly at: number;
  readonly reason: string;
}

export interface SurveyCorpsStats {
  readonly totalMissions: number;
  readonly activeMissions: number;
  readonly completedMissions: number;
  readonly failedMissions: number;
  readonly abortedMissions: number;
  readonly worldsUnlocked: number;
}

export interface SurveyCorpsEngine {
  proposeMission(params: ProposeMissionParams): Mission;
  approveMission(missionId: string): MissionPhaseTransition;
  assignCrew(params: AssignCrewParams): CrewMember;
  removeCrew(missionId: string, dynastyId: string): void;
  getMission(missionId: string): Mission;
  tryGetMission(missionId: string): Mission | undefined;
  advancePhase(missionId: string): MissionPhaseTransition | null;
  abortMission(missionId: string, reason: string): MissionPhaseTransition;
  completeMission(
    missionId: string,
    resourceRating: number,
    hazardRating: number,
  ): MissionPhaseTransition;
  failMission(missionId: string, reason: string): MissionPhaseTransition;
  addLogEntry(missionId: string, message: string): MissionLogEntry;
  getLogEntries(missionId: string): ReadonlyArray<MissionLogEntry>;
  listByPhase(phase: MissionPhase): ReadonlyArray<Mission>;
  listByDynasty(dynastyId: string): ReadonlyArray<Mission>;
  calculateDifficulty(target: MissionTarget): number;
  calculateRisk(difficulty: number, crew: ReadonlyArray<CrewMember>): number;
  calculateReward(missionType: MissionType, difficulty: number): MissionReward;
  calculatePhaseDurations(target: MissionTarget, missionType: MissionType): Record<string, number>;
  getStats(): SurveyCorpsStats;
}

// ─── Constants ───────────────────────────────────────────────────────

const US_PER_HOUR = 3_600_000_000;

const STELLAR_DIFFICULTY: Readonly<Record<string, number>> = {
  M: 1,
  K: 2,
  G: 3,
  F: 4,
  A: 5,
  B: 7,
  O: 9,
};

const MISSION_TYPE_MULTIPLIER: Readonly<Record<MissionType, number>> = {
  exploration: 1.0,
  deep_survey: 1.2,
  resource_mapping: 0.8,
  hazard_assessment: 1.5,
  colony_prep: 1.3,
};

const BASE_BOUNTY_MICRO = 10_000n;

const BASE_TRAVEL_HOURS = 24;

const PHASE_SEQUENCE: ReadonlyArray<MissionPhase> = [
  'proposed',
  'approved',
  'outbound',
  'on_site',
  'returning',
];

const TERMINAL_PHASES: ReadonlySet<MissionPhase> = new Set(['completed', 'failed', 'aborted']);

const ON_SITE_DURATION_HOURS: Readonly<Record<MissionType, number>> = {
  exploration: 48,
  deep_survey: 96,
  resource_mapping: 72,
  hazard_assessment: 36,
  colony_prep: 120,
};

// ─── State ───────────────────────────────────────────────────────────

interface MutableCrewMember {
  readonly dynastyId: string;
  readonly role: CrewRole;
  readonly assignedAt: number;
  readonly experienceLevel: number;
}

interface MutableMission {
  readonly missionId: string;
  readonly missionType: MissionType;
  phase: MissionPhase;
  readonly target: MissionTarget;
  readonly crew: MutableCrewMember[];
  readonly difficulty: number;
  riskFactor: number;
  readonly reward: MissionReward;
  readonly proposedAt: number;
  phaseChangedAt: number;
  readonly phaseDurationsUs: Record<string, number>;
  readonly sponsorDynastyId: string;
  readonly logEntries: MutableLogEntry[];
  completedSurveyData: SurveyData | null;
}

interface MutableLogEntry {
  readonly entryId: string;
  readonly missionId: string;
  readonly timestamp: number;
  readonly message: string;
  readonly phase: MissionPhase;
}

interface EngineState {
  readonly missions: Map<string, MutableMission>;
  readonly clock: SurveyCorpsClock;
  readonly idGenerator: SurveyCorpsIdGenerator;
  readonly rewardPort: MissionRewardPort;
  readonly worldUnlockPort: WorldUnlockPort;
  worldsUnlocked: number;
}

// ─── Factory ─────────────────────────────────────────────────────────

export interface SurveyCorpsDeps {
  readonly clock: SurveyCorpsClock;
  readonly idGenerator: SurveyCorpsIdGenerator;
  readonly rewardPort: MissionRewardPort;
  readonly worldUnlockPort: WorldUnlockPort;
}

export function createSurveyCorpsEngine(deps: SurveyCorpsDeps): SurveyCorpsEngine {
  const state = buildEngineState(deps);
  return bindEngineMethods(state);
}

function buildEngineState(deps: SurveyCorpsDeps): EngineState {
  return {
    missions: new Map(),
    clock: deps.clock,
    idGenerator: deps.idGenerator,
    rewardPort: deps.rewardPort,
    worldUnlockPort: deps.worldUnlockPort,
    worldsUnlocked: 0,
  };
}

function bindEngineMethods(state: EngineState): SurveyCorpsEngine {
  return {
    proposeMission: (p) => proposeMissionImpl(state, p),
    approveMission: (id) => approveMissionImpl(state, id),
    assignCrew: (p) => assignCrewImpl(state, p),
    removeCrew: (mid, did) => {
      removeCrewImpl(state, mid, did);
    },
    getMission: (id) => getMissionImpl(state, id),
    tryGetMission: (id) => tryGetMissionImpl(state, id),
    advancePhase: (id) => advancePhaseImpl(state, id),
    abortMission: (id, reason) => abortMissionImpl(state, id, reason),
    completeMission: (id, rr, hr) => completeMissionImpl(state, id, rr, hr),
    failMission: (id, reason) => failMissionImpl(state, id, reason),
    addLogEntry: (id, msg) => addLogEntryImpl(state, id, msg),
    getLogEntries: (id) => getLogEntriesImpl(state, id),
    listByPhase: (p) => listByPhaseImpl(state, p),
    listByDynasty: (did) => listByDynastyImpl(state, did),
    calculateDifficulty: (t) => calculateDifficultyPure(t),
    calculateRisk: (d, c) => calculateRiskPure(d, c),
    calculateReward: (mt, d) => calculateRewardPure(mt, d),
    calculatePhaseDurations: (t, mt) => calculatePhaseDurationsPure(t, mt),
    getStats: () => computeStats(state),
  };
}

// ─── Mission Lifecycle ──────────────────────────────────────────────

function proposeMissionImpl(state: EngineState, params: ProposeMissionParams): Mission {
  const missionId = state.idGenerator.generate();
  const now = state.clock.nowMicroseconds();
  const difficulty = calculateDifficultyPure(params.target);
  const reward = calculateRewardPure(params.missionType, difficulty);
  const durations = calculatePhaseDurationsPure(params.target, params.missionType);

  const mission: MutableMission = {
    missionId,
    missionType: params.missionType,
    phase: 'proposed',
    target: params.target,
    crew: [],
    difficulty,
    riskFactor: 0,
    reward,
    proposedAt: now,
    phaseChangedAt: now,
    phaseDurationsUs: durations,
    sponsorDynastyId: params.sponsorDynastyId,
    logEntries: [],
    completedSurveyData: null,
  };

  state.missions.set(missionId, mission);
  appendLog(state, mission, 'Mission proposed to ' + params.target.worldId);
  return toReadonlyMission(mission);
}

function approveMissionImpl(state: EngineState, missionId: string): MissionPhaseTransition {
  const mission = getMutable(state, missionId);
  assertPhase(mission, 'proposed');
  if (mission.crew.length === 0) {
    throw new Error('Mission ' + missionId + ' has no crew assigned');
  }
  mission.riskFactor = calculateRiskPure(mission.difficulty, mission.crew);
  return applyPhaseTransition(state, mission, 'approved', 'Mission approved with crew');
}

// ─── Crew Management ────────────────────────────────────────────────

function assignCrewImpl(state: EngineState, params: AssignCrewParams): CrewMember {
  const mission = getMutable(state, params.missionId);
  assertNotTerminal(mission);
  if (mission.phase !== 'proposed' && mission.phase !== 'approved') {
    throw new Error('Cannot assign crew after mission launch');
  }
  const existing = mission.crew.find((c) => c.dynastyId === params.dynastyId);
  if (existing) {
    throw new Error('Dynasty ' + params.dynastyId + ' already assigned');
  }
  const member: MutableCrewMember = {
    dynastyId: params.dynastyId,
    role: params.role,
    assignedAt: state.clock.nowMicroseconds(),
    experienceLevel: params.experienceLevel,
  };
  mission.crew.push(member);
  appendLog(state, mission, 'Crew assigned: ' + params.dynastyId + ' as ' + params.role);
  return toReadonlyCrew(member);
}

function removeCrewImpl(state: EngineState, missionId: string, dynastyId: string): void {
  const mission = getMutable(state, missionId);
  if (mission.phase !== 'proposed') {
    throw new Error('Cannot remove crew after approval');
  }
  const idx = mission.crew.findIndex((c) => c.dynastyId === dynastyId);
  if (idx === -1) {
    throw new Error('Dynasty ' + dynastyId + ' not in crew');
  }
  mission.crew.splice(idx, 1);
  appendLog(state, mission, 'Crew removed: ' + dynastyId);
}

// ─── Phase Advancement ──────────────────────────────────────────────

function advancePhaseImpl(state: EngineState, missionId: string): MissionPhaseTransition | null {
  const mission = getMutable(state, missionId);
  if (TERMINAL_PHASES.has(mission.phase)) return null;

  const now = state.clock.nowMicroseconds();
  const elapsed = now - mission.phaseChangedAt;
  const durationKey = mission.phase;
  const required = mission.phaseDurationsUs[durationKey];

  if (required === undefined || elapsed < required) return null;

  const nextPhase = getNextPhase(mission.phase);
  if (nextPhase === null) return null;

  return applyPhaseTransition(state, mission, nextPhase, 'Phase duration elapsed');
}

function getNextPhase(current: MissionPhase): MissionPhase | null {
  const idx = PHASE_SEQUENCE.indexOf(current);
  if (idx === -1 || idx >= PHASE_SEQUENCE.length - 1) return null;
  const next = PHASE_SEQUENCE[idx + 1];
  return next !== undefined ? next : null;
}

// ─── Terminal Transitions ───────────────────────────────────────────

function abortMissionImpl(
  state: EngineState,
  missionId: string,
  reason: string,
): MissionPhaseTransition {
  const mission = getMutable(state, missionId);
  assertNotTerminal(mission);
  return applyPhaseTransition(state, mission, 'aborted', 'Mission aborted: ' + reason);
}

function completeMissionImpl(
  state: EngineState,
  missionId: string,
  resourceRating: number,
  hazardRating: number,
): MissionPhaseTransition {
  const mission = getMutable(state, missionId);
  assertPhase(mission, 'returning');
  const now = state.clock.nowMicroseconds();

  const surveyData = buildSurveyData(mission, now, resourceRating, hazardRating);
  mission.completedSurveyData = surveyData;

  state.worldUnlockPort.unlockWorld(mission.target.worldId, surveyData);
  issueMissionRewards(state, mission);
  state.worldsUnlocked++;

  return applyPhaseTransition(state, mission, 'completed', 'Mission completed successfully');
}

function failMissionImpl(
  state: EngineState,
  missionId: string,
  reason: string,
): MissionPhaseTransition {
  const mission = getMutable(state, missionId);
  assertNotTerminal(mission);
  return applyPhaseTransition(state, mission, 'failed', 'Mission failed: ' + reason);
}

// ─── Rewards ─────────────────────────────────────────────────────────

function issueMissionRewards(state: EngineState, mission: MutableMission): void {
  const perCrewShare = mission.reward.kalonBounty / BigInt(Math.max(mission.crew.length, 1));
  for (const member of mission.crew) {
    const reason = 'Survey Corps bounty for mission ' + mission.missionId;
    state.rewardPort.issueReward(member.dynastyId, perCrewShare, reason);
  }
  const sponsorReason = 'Sponsor bounty for mission ' + mission.missionId;
  state.rewardPort.issueReward(mission.sponsorDynastyId, perCrewShare, sponsorReason);
}

function buildSurveyData(
  mission: MutableMission,
  now: number,
  resourceRating: number,
  hazardRating: number,
): SurveyData {
  const commander = mission.crew.find((c) => c.role === 'commander');
  return {
    worldId: mission.target.worldId,
    missionId: mission.missionId,
    missionType: mission.missionType,
    discoveredAt: now,
    surveyorDynastyId: commander ? commander.dynastyId : mission.sponsorDynastyId,
    resourceRating,
    hazardRating,
  };
}

// ─── Logging ─────────────────────────────────────────────────────────

function addLogEntryImpl(state: EngineState, missionId: string, message: string): MissionLogEntry {
  const mission = getMutable(state, missionId);
  return appendLog(state, mission, message);
}

function appendLog(state: EngineState, mission: MutableMission, message: string): MissionLogEntry {
  const entry: MutableLogEntry = {
    entryId: state.idGenerator.generate(),
    missionId: mission.missionId,
    timestamp: state.clock.nowMicroseconds(),
    message,
    phase: mission.phase,
  };
  mission.logEntries.push(entry);
  return entry;
}

function getLogEntriesImpl(state: EngineState, missionId: string): ReadonlyArray<MissionLogEntry> {
  return getMutable(state, missionId).logEntries;
}

// ─── Queries ─────────────────────────────────────────────────────────

function getMissionImpl(state: EngineState, missionId: string): Mission {
  const mission = state.missions.get(missionId);
  if (!mission) throw new Error('Mission ' + missionId + ' not found');
  return toReadonlyMission(mission);
}

function tryGetMissionImpl(state: EngineState, missionId: string): Mission | undefined {
  const mission = state.missions.get(missionId);
  return mission ? toReadonlyMission(mission) : undefined;
}

function listByPhaseImpl(state: EngineState, phase: MissionPhase): ReadonlyArray<Mission> {
  const results: Mission[] = [];
  for (const mission of state.missions.values()) {
    if (mission.phase === phase) results.push(toReadonlyMission(mission));
  }
  return results;
}

function listByDynastyImpl(state: EngineState, dynastyId: string): ReadonlyArray<Mission> {
  const results: Mission[] = [];
  for (const mission of state.missions.values()) {
    const involved = mission.sponsorDynastyId === dynastyId;
    const inCrew = mission.crew.some((c) => c.dynastyId === dynastyId);
    if (involved || inCrew) results.push(toReadonlyMission(mission));
  }
  return results;
}

// ─── Calculations (Pure) ────────────────────────────────────────────

function calculateDifficultyPure(target: MissionTarget): number {
  const stellarBase = STELLAR_DIFFICULTY[target.stellarClass] ?? 5;
  const distanceFactor = Math.min(target.distanceLightYears / 100, 3);
  const hazardFactor = target.knownHazards * 0.5;
  const raw = stellarBase + distanceFactor + hazardFactor;
  return Math.max(1, Math.min(10, Math.round(raw)));
}

function calculateRiskPure(difficulty: number, crew: ReadonlyArray<CrewMember>): number {
  const baseRisk = difficulty * 0.05;
  const avgExperience = averageExperience(crew);
  const experienceReduction = avgExperience * 0.02;
  const crewSizeBonus = Math.min(crew.length * 0.01, 0.05);
  const raw = baseRisk - experienceReduction - crewSizeBonus;
  return Math.max(0.01, Math.min(0.95, raw));
}

function averageExperience(crew: ReadonlyArray<CrewMember>): number {
  if (crew.length === 0) return 0;
  let total = 0;
  for (const member of crew) {
    total += member.experienceLevel;
  }
  return total / crew.length;
}

function calculateRewardPure(missionType: MissionType, difficulty: number): MissionReward {
  const multiplier = MISSION_TYPE_MULTIPLIER[missionType];
  const difficultyMultiplier = BigInt(difficulty);
  const bounty =
    (BASE_BOUNTY_MICRO * difficultyMultiplier * BigInt(Math.round(multiplier * 100))) / 100n;
  return {
    kalonBounty: bounty,
    namingRights: missionType === 'exploration',
    resourceDataValue: Math.round(difficulty * multiplier * 10),
  };
}

function calculatePhaseDurationsPure(
  target: MissionTarget,
  missionType: MissionType,
): Record<string, number> {
  const travelHours = BASE_TRAVEL_HOURS + target.distanceLightYears * 2;
  const onSiteHours = ON_SITE_DURATION_HOURS[missionType];
  return {
    proposed: 0,
    approved: US_PER_HOUR,
    outbound: travelHours * US_PER_HOUR,
    on_site: onSiteHours * US_PER_HOUR,
    returning: travelHours * US_PER_HOUR,
  };
}

// ─── Stats ───────────────────────────────────────────────────────────

function computeStats(state: EngineState): SurveyCorpsStats {
  let active = 0;
  let completed = 0;
  let failed = 0;
  let aborted = 0;
  for (const mission of state.missions.values()) {
    if (mission.phase === 'completed') completed++;
    else if (mission.phase === 'failed') failed++;
    else if (mission.phase === 'aborted') aborted++;
    else active++;
  }
  return {
    totalMissions: state.missions.size,
    activeMissions: active,
    completedMissions: completed,
    failedMissions: failed,
    abortedMissions: aborted,
    worldsUnlocked: state.worldsUnlocked,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getMutable(state: EngineState, missionId: string): MutableMission {
  const mission = state.missions.get(missionId);
  if (!mission) throw new Error('Mission ' + missionId + ' not found');
  return mission;
}

function assertPhase(mission: MutableMission, expected: MissionPhase): void {
  if (mission.phase !== expected) {
    throw new Error(
      'Mission ' + mission.missionId + ' is in phase ' + mission.phase + ', expected ' + expected,
    );
  }
}

function assertNotTerminal(mission: MutableMission): void {
  if (TERMINAL_PHASES.has(mission.phase)) {
    throw new Error('Mission ' + mission.missionId + ' is in terminal phase ' + mission.phase);
  }
}

function applyPhaseTransition(
  state: EngineState,
  mission: MutableMission,
  to: MissionPhase,
  reason: string,
): MissionPhaseTransition {
  const from = mission.phase;
  const now = state.clock.nowMicroseconds();
  mission.phase = to;
  mission.phaseChangedAt = now;
  appendLog(state, mission, reason);
  return { missionId: mission.missionId, from, to, at: now, reason };
}

function toReadonlyCrew(member: MutableCrewMember): CrewMember {
  return {
    dynastyId: member.dynastyId,
    role: member.role,
    assignedAt: member.assignedAt,
    experienceLevel: member.experienceLevel,
  };
}

function toReadonlyMission(mission: MutableMission): Mission {
  return {
    missionId: mission.missionId,
    missionType: mission.missionType,
    phase: mission.phase,
    target: mission.target,
    crew: mission.crew.map(toReadonlyCrew),
    difficulty: mission.difficulty,
    riskFactor: mission.riskFactor,
    reward: mission.reward,
    proposedAt: mission.proposedAt,
    phaseChangedAt: mission.phaseChangedAt,
    phaseDurationsUs: { ...mission.phaseDurationsUs },
    sponsorDynastyId: mission.sponsorDynastyId,
    logEntries: [...mission.logEntries],
    completedSurveyData: mission.completedSurveyData,
  };
}
