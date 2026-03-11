/**
 * Survey Mission Orchestrator — Tick-based lifecycle management for all active missions.
 *
 * Bible v1.1 Part 6: Survey Corps & World Discovery
 *
 * The orchestrator runs on each game tick, evaluating all active missions
 * and advancing them through their lifecycle. It handles:
 *
 *   - Phase advancement based on elapsed time
 *   - Risk outcome rolls when missions reach hazardous phases
 *   - Automatic mission completion and world unlocking
 *   - Abort processing on crew recall
 *   - Corps-wide statistics tracking
 *
 * Risk rolls occur during ON_SITE phase with probability based on
 * difficulty and crew experience. Failed rolls trigger mission failure.
 *
 * "The Lattice reveals itself only to those who dare to look."
 */

import type {
  SurveyCorpsEngine,
  Mission,
  MissionPhase,
  MissionPhaseTransition,
  SurveyCorpsStats,
} from './survey-corps.js';

// ─── Port Types ─────────────────────────────────────────────────────

export interface OrchestratorClock {
  readonly nowMicroseconds: () => number;
}

export interface OrchestratorRng {
  readonly random: () => number;
}

export interface OrchestratorLogger {
  readonly log: (missionId: string, event: string, detail: string) => void;
}

// ─── Types ───────────────────────────────────────────────────────────

export interface MissionTickResult {
  readonly missionId: string;
  readonly transition: MissionPhaseTransition | null;
  readonly riskRolled: boolean;
  readonly riskOutcome: RiskOutcome | null;
}

export type RiskOutcome = 'survived' | 'casualty' | 'total_loss';

export interface OrchestratorTickResult {
  readonly tickTimestamp: number;
  readonly missionsEvaluated: number;
  readonly transitions: ReadonlyArray<MissionPhaseTransition>;
  readonly riskEvents: ReadonlyArray<RiskEvent>;
  readonly completions: ReadonlyArray<string>;
  readonly failures: ReadonlyArray<string>;
}

export interface RiskEvent {
  readonly missionId: string;
  readonly riskFactor: number;
  readonly roll: number;
  readonly outcome: RiskOutcome;
  readonly casualties: number;
}

export interface AbortRequest {
  readonly missionId: string;
  readonly reason: string;
  readonly requestedBy: string;
}

export interface OrchestratorConfig {
  readonly casualtyThreshold: number;
  readonly totalLossThreshold: number;
  readonly autoCompleteOnReturn: boolean;
  readonly defaultResourceRating: number;
  readonly defaultHazardRating: number;
}

export interface SurveyMissionOrchestrator {
  tick(): OrchestratorTickResult;
  processAborts(requests: ReadonlyArray<AbortRequest>): ReadonlyArray<MissionPhaseTransition>;
  evaluateMission(missionId: string): MissionTickResult;
  rollRisk(missionId: string): RiskEvent | null;
  getCorpsStats(): SurveyCorpsStats;
  getPendingAborts(): ReadonlyArray<AbortRequest>;
  queueAbort(request: AbortRequest): void;
  getConfig(): OrchestratorConfig;
}

// ─── Constants ───────────────────────────────────────────────────────

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  casualtyThreshold: 0.7,
  totalLossThreshold: 0.95,
  autoCompleteOnReturn: true,
  defaultResourceRating: 5,
  defaultHazardRating: 3,
};

const RISK_PHASES: ReadonlySet<MissionPhase> = new Set(['on_site', 'outbound']);

const ACTIVE_PHASES: ReadonlySet<MissionPhase> = new Set([
  'approved',
  'outbound',
  'on_site',
  'returning',
]);

// ─── State ───────────────────────────────────────────────────────────

interface OrchestratorState {
  readonly engine: SurveyCorpsEngine;
  readonly clock: OrchestratorClock;
  readonly rng: OrchestratorRng;
  readonly logger: OrchestratorLogger;
  readonly config: OrchestratorConfig;
  readonly pendingAborts: AbortRequest[];
  readonly riskRolledMissions: Set<string>;
}

// ─── Factory ─────────────────────────────────────────────────────────

export interface SurveyMissionOrchestratorDeps {
  readonly engine: SurveyCorpsEngine;
  readonly clock: OrchestratorClock;
  readonly rng: OrchestratorRng;
  readonly logger: OrchestratorLogger;
  readonly config?: Partial<OrchestratorConfig>;
}

export function createSurveyMissionOrchestrator(
  deps: SurveyMissionOrchestratorDeps,
): SurveyMissionOrchestrator {
  const config = mergeConfig(deps.config);
  const state: OrchestratorState = {
    engine: deps.engine,
    clock: deps.clock,
    rng: deps.rng,
    logger: deps.logger,
    config,
    pendingAborts: [],
    riskRolledMissions: new Set(),
  };

  return {
    tick: () => tickImpl(state),
    processAborts: (reqs) => processAbortsImpl(state, reqs),
    evaluateMission: (id) => evaluateMissionImpl(state, id),
    rollRisk: (id) => rollRiskImpl(state, id),
    getCorpsStats: () => state.engine.getStats(),
    getPendingAborts: () => [...state.pendingAborts],
    queueAbort: (req) => {
      queueAbortImpl(state, req);
    },
    getConfig: () => ({ ...state.config }),
  };
}

function mergeConfig(overrides?: Partial<OrchestratorConfig>): OrchestratorConfig {
  if (overrides === undefined) return DEFAULT_ORCHESTRATOR_CONFIG;
  return {
    casualtyThreshold: overrides.casualtyThreshold ?? DEFAULT_ORCHESTRATOR_CONFIG.casualtyThreshold,
    totalLossThreshold:
      overrides.totalLossThreshold ?? DEFAULT_ORCHESTRATOR_CONFIG.totalLossThreshold,
    autoCompleteOnReturn:
      overrides.autoCompleteOnReturn ?? DEFAULT_ORCHESTRATOR_CONFIG.autoCompleteOnReturn,
    defaultResourceRating:
      overrides.defaultResourceRating ?? DEFAULT_ORCHESTRATOR_CONFIG.defaultResourceRating,
    defaultHazardRating:
      overrides.defaultHazardRating ?? DEFAULT_ORCHESTRATOR_CONFIG.defaultHazardRating,
  };
}

// ─── Tick ────────────────────────────────────────────────────────────

function tickImpl(state: OrchestratorState): OrchestratorTickResult {
  const now = state.clock.nowMicroseconds();
  const abortTransitions = processPendingAborts(state);
  const activeMissions = gatherActiveMissions(state);

  const transitions: MissionPhaseTransition[] = [...abortTransitions];
  const riskEvents: RiskEvent[] = [];
  const completions: string[] = [];
  const failures: string[] = [];

  for (const mission of activeMissions) {
    const result = evaluateSingleMission(state, mission);
    if (result.transition !== null) transitions.push(result.transition);
    if (result.riskOutcome !== null && result.riskOutcome !== 'survived') {
      collectRiskEvent(state, mission, riskEvents, failures);
    }
    if (result.transition !== null && result.transition.to === 'completed') {
      completions.push(mission.missionId);
    }
  }

  return {
    tickTimestamp: now,
    missionsEvaluated: activeMissions.length,
    transitions,
    riskEvents,
    completions,
    failures,
  };
}

function gatherActiveMissions(state: OrchestratorState): ReadonlyArray<Mission> {
  const results: Mission[] = [];
  for (const phase of ACTIVE_PHASES) {
    const missions = state.engine.listByPhase(phase);
    for (const m of missions) {
      results.push(m);
    }
  }
  return results;
}

function processPendingAborts(state: OrchestratorState): ReadonlyArray<MissionPhaseTransition> {
  const aborts = [...state.pendingAborts];
  state.pendingAborts.length = 0;
  return processAbortsImpl(state, aborts);
}

// ─── Mission Evaluation ─────────────────────────────────────────────

function evaluateMissionImpl(state: OrchestratorState, missionId: string): MissionTickResult {
  const mission = state.engine.getMission(missionId);
  return evaluateSingleMission(state, mission);
}

function evaluateSingleMission(state: OrchestratorState, mission: Mission): MissionTickResult {
  const riskResult = evaluateRisk(state, mission);

  if (riskResult !== null && riskResult.outcome === 'total_loss') {
    const transition = state.engine.failMission(mission.missionId, 'Total loss during risk event');
    logEvent(state, mission.missionId, 'TOTAL_LOSS', 'Mission lost with all hands');
    return buildTickResult(mission.missionId, transition, true, riskResult.outcome);
  }

  if (riskResult !== null && riskResult.outcome === 'casualty') {
    logEvent(state, mission.missionId, 'CASUALTY', 'Crew casualties sustained');
  }

  const phaseResult = tryAdvancePhase(state, mission);
  const autoComplete = tryAutoComplete(state, mission, phaseResult);

  const finalTransition = autoComplete ?? phaseResult;
  return buildTickResult(
    mission.missionId,
    finalTransition,
    riskResult !== null,
    riskResult?.outcome ?? null,
  );
}

function buildTickResult(
  missionId: string,
  transition: MissionPhaseTransition | null,
  riskRolled: boolean,
  riskOutcome: RiskOutcome | null,
): MissionTickResult {
  return { missionId, transition, riskRolled, riskOutcome };
}

// ─── Phase Advancement ──────────────────────────────────────────────

function tryAdvancePhase(
  state: OrchestratorState,
  mission: Mission,
): MissionPhaseTransition | null {
  return state.engine.advancePhase(mission.missionId);
}

function tryAutoComplete(
  state: OrchestratorState,
  mission: Mission,
  priorTransition: MissionPhaseTransition | null,
): MissionPhaseTransition | null {
  if (!state.config.autoCompleteOnReturn) return null;

  const currentPhase = priorTransition ? priorTransition.to : mission.phase;
  if (currentPhase !== 'returning') return null;

  const updated = state.engine.getMission(mission.missionId);
  if (updated.phase !== 'returning') return null;

  const now = state.clock.nowMicroseconds();
  const elapsed = now - updated.phaseChangedAt;
  const required = updated.phaseDurationsUs['returning'];

  if (required === undefined || elapsed < required) return null;

  return state.engine.completeMission(
    mission.missionId,
    state.config.defaultResourceRating,
    state.config.defaultHazardRating,
  );
}

// ─── Risk System ────────────────────────────────────────────────────

function evaluateRisk(state: OrchestratorState, mission: Mission): RiskEvent | null {
  if (!RISK_PHASES.has(mission.phase)) return null;
  if (state.riskRolledMissions.has(mission.missionId + ':' + mission.phase)) return null;
  return rollRiskImpl(state, mission.missionId);
}

function rollRiskImpl(state: OrchestratorState, missionId: string): RiskEvent | null {
  const mission = state.engine.getMission(missionId);
  if (!RISK_PHASES.has(mission.phase)) return null;

  state.riskRolledMissions.add(missionId + ':' + mission.phase);
  const roll = state.rng.random();
  const outcome = determineOutcome(state.config, mission.riskFactor, roll);
  const casualties = countCasualties(outcome, mission.crew.length);

  const event: RiskEvent = {
    missionId,
    riskFactor: mission.riskFactor,
    roll,
    outcome,
    casualties,
  };

  logEvent(state, missionId, 'RISK_ROLL', 'Roll: ' + String(roll) + ' Outcome: ' + outcome);
  return event;
}

function determineOutcome(
  config: OrchestratorConfig,
  riskFactor: number,
  roll: number,
): RiskOutcome {
  const failThreshold = 1.0 - riskFactor;
  if (roll >= failThreshold) {
    const severityRoll = roll;
    if (severityRoll >= config.totalLossThreshold) return 'total_loss';
    if (severityRoll >= config.casualtyThreshold) return 'casualty';
  }
  return 'survived';
}

function countCasualties(outcome: RiskOutcome, crewSize: number): number {
  if (outcome === 'total_loss') return crewSize;
  if (outcome === 'casualty') return Math.max(1, Math.floor(crewSize * 0.3));
  return 0;
}

// ─── Risk Event Collection ──────────────────────────────────────────

function collectRiskEvent(
  state: OrchestratorState,
  mission: Mission,
  riskEvents: RiskEvent[],
  failures: string[],
): void {
  const lastEvent = rollRiskImpl(state, mission.missionId);
  if (lastEvent === null) return;
  riskEvents.push(lastEvent);
  if (lastEvent.outcome === 'total_loss') {
    failures.push(mission.missionId);
  }
}

// ─── Abort Processing ───────────────────────────────────────────────

function processAbortsImpl(
  state: OrchestratorState,
  requests: ReadonlyArray<AbortRequest>,
): ReadonlyArray<MissionPhaseTransition> {
  const transitions: MissionPhaseTransition[] = [];
  for (const req of requests) {
    const mission = state.engine.tryGetMission(req.missionId);
    if (mission === undefined) continue;
    if (isTerminal(mission.phase)) continue;
    const transition = state.engine.abortMission(req.missionId, req.reason);
    transitions.push(transition);
    logEvent(state, req.missionId, 'ABORT', 'Aborted by ' + req.requestedBy + ': ' + req.reason);
  }
  return transitions;
}

function queueAbortImpl(state: OrchestratorState, request: AbortRequest): void {
  const existing = state.pendingAborts.find((a) => a.missionId === request.missionId);
  if (existing) return;
  state.pendingAborts.push(request);
}

// ─── Helpers ─────────────────────────────────────────────────────────

function isTerminal(phase: MissionPhase): boolean {
  return phase === 'completed' || phase === 'failed' || phase === 'aborted';
}

function logEvent(
  state: OrchestratorState,
  missionId: string,
  event: string,
  detail: string,
): void {
  state.logger.log(missionId, event, detail);
  state.engine.addLogEntry(missionId, event + ': ' + detail);
}
