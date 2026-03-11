/**
 * Diplomacy Engine — Bilateral diplomatic relations between dynasties.
 *
 * Tracks bilateral relationships with typed states, diplomatic actions,
 * cooldown enforcement, incident history, and a numeric relation score
 * that decays toward neutral over time.
 *
 * Relation States:
 *   NEUTRAL  — Default. Score near zero.
 *   FRIENDLY — Positive diplomacy established.
 *   HOSTILE  — Negative diplomacy declared.
 *   ALLIED   — Formal alliance in effect.
 *   WAR      — Open conflict declared.
 *   EMBARGO  — Economic restrictions active.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface DiplomacyClock {
  readonly nowMicroseconds: () => number;
}

export interface DiplomacyIdGenerator {
  readonly generate: () => string;
}

// ── Types ────────────────────────────────────────────────────────

export type RelationState = 'NEUTRAL' | 'FRIENDLY' | 'HOSTILE' | 'ALLIED' | 'WAR' | 'EMBARGO';

export type DiplomaticAction =
  | 'DECLARE_FRIENDSHIP'
  | 'DECLARE_RIVALRY'
  | 'PROPOSE_TREATY'
  | 'BREAK_TREATY'
  | 'DECLARE_EMBARGO'
  | 'LIFT_EMBARGO'
  | 'DECLARE_WAR'
  | 'MAKE_PEACE';

export interface DiplomaticIncident {
  readonly incidentId: string;
  readonly description: string;
  readonly scoreDelta: number;
  readonly timestamp: number;
}

export interface DiplomaticRelation {
  readonly dynastyA: string;
  readonly dynastyB: string;
  readonly state: RelationState;
  readonly score: number;
  readonly lastActionAt: number;
  readonly incidents: ReadonlyArray<DiplomaticIncident>;
  readonly createdAt: number;
}

export interface DiplomacyActionParams {
  readonly actorId: string;
  readonly targetId: string;
  readonly action: DiplomaticAction;
}

export interface RecordIncidentParams {
  readonly dynastyA: string;
  readonly dynastyB: string;
  readonly description: string;
  readonly scoreDelta: number;
}

export interface DiplomacyEngineConfig {
  readonly cooldownUs: number;
  readonly decayRatePerTick: number;
  readonly maxScore: number;
  readonly minScore: number;
}

export interface DiplomacyEngineStats {
  readonly totalRelations: number;
  readonly friendlyCount: number;
  readonly hostileCount: number;
  readonly alliedCount: number;
  readonly warCount: number;
  readonly embargoCount: number;
  readonly neutralCount: number;
}

export interface DiplomacyEngine {
  readonly performAction: (params: DiplomacyActionParams) => DiplomaticRelation;
  readonly recordIncident: (params: RecordIncidentParams) => DiplomaticRelation;
  readonly getRelation: (dynastyA: string, dynastyB: string) => DiplomaticRelation;
  readonly listRelations: (dynastyId: string) => ReadonlyArray<DiplomaticRelation>;
  readonly getScore: (dynastyA: string, dynastyB: string) => number;
  readonly decayTick: () => number;
  readonly getStats: () => DiplomacyEngineStats;
}

export interface DiplomacyEngineDeps {
  readonly clock: DiplomacyClock;
  readonly idGenerator: DiplomacyIdGenerator;
  readonly config?: Partial<DiplomacyEngineConfig>;
}

// ── Constants ────────────────────────────────────────────────────

const ONE_HOUR_US = 3_600_000_000;

const DEFAULT_DIPLOMACY_CONFIG: DiplomacyEngineConfig = {
  cooldownUs: ONE_HOUR_US,
  decayRatePerTick: 1,
  maxScore: 100,
  minScore: -100,
};

const ACTION_SCORE_DELTAS: Readonly<Record<DiplomaticAction, number>> = {
  DECLARE_FRIENDSHIP: 20,
  DECLARE_RIVALRY: -20,
  PROPOSE_TREATY: 10,
  BREAK_TREATY: -30,
  DECLARE_EMBARGO: -25,
  LIFT_EMBARGO: 15,
  DECLARE_WAR: -50,
  MAKE_PEACE: 25,
};

const ACTION_TARGET_STATE: Readonly<Record<DiplomaticAction, RelationState>> = {
  DECLARE_FRIENDSHIP: 'FRIENDLY',
  DECLARE_RIVALRY: 'HOSTILE',
  PROPOSE_TREATY: 'ALLIED',
  BREAK_TREATY: 'NEUTRAL',
  DECLARE_EMBARGO: 'EMBARGO',
  LIFT_EMBARGO: 'NEUTRAL',
  DECLARE_WAR: 'WAR',
  MAKE_PEACE: 'NEUTRAL',
};

// ── State ────────────────────────────────────────────────────────

interface MutableIncident {
  readonly incidentId: string;
  readonly description: string;
  readonly scoreDelta: number;
  readonly timestamp: number;
}

interface MutableRelation {
  readonly dynastyA: string;
  readonly dynastyB: string;
  state: RelationState;
  score: number;
  lastActionAt: number;
  readonly incidents: MutableIncident[];
  readonly createdAt: number;
}

interface EngineState {
  readonly deps: DiplomacyEngineDeps;
  readonly config: DiplomacyEngineConfig;
  readonly relations: Map<string, MutableRelation>;
}

// ── Helpers ──────────────────────────────────────────────────────

function pairKey(a: string, b: string): string {
  return a < b ? a + ':' + b : b + ':' + a;
}

function clampScore(config: DiplomacyEngineConfig, score: number): number {
  if (score > config.maxScore) return config.maxScore;
  if (score < config.minScore) return config.minScore;
  return score;
}

function relationToReadonly(r: MutableRelation): DiplomaticRelation {
  return {
    dynastyA: r.dynastyA,
    dynastyB: r.dynastyB,
    state: r.state,
    score: r.score,
    lastActionAt: r.lastActionAt,
    incidents: r.incidents.map(incidentToReadonly),
    createdAt: r.createdAt,
  };
}

function incidentToReadonly(i: MutableIncident): DiplomaticIncident {
  return {
    incidentId: i.incidentId,
    description: i.description,
    scoreDelta: i.scoreDelta,
    timestamp: i.timestamp,
  };
}

function getOrCreateRelation(state: EngineState, a: string, b: string): MutableRelation {
  const key = pairKey(a, b);
  const existing = state.relations.get(key);
  if (existing) return existing;
  const now = state.deps.clock.nowMicroseconds();
  const sorted = a < b;
  const relation: MutableRelation = {
    dynastyA: sorted ? a : b,
    dynastyB: sorted ? b : a,
    state: 'NEUTRAL',
    score: 0,
    lastActionAt: 0,
    incidents: [],
    createdAt: now,
  };
  state.relations.set(key, relation);
  return relation;
}

function validateAction(
  state: EngineState,
  relation: MutableRelation,
  action: DiplomaticAction,
): void {
  checkCooldown(state, relation);
  validateTransition(relation.state, action);
}

function checkCooldown(state: EngineState, relation: MutableRelation): void {
  if (relation.lastActionAt === 0) return;
  const now = state.deps.clock.nowMicroseconds();
  const elapsed = now - relation.lastActionAt;
  if (elapsed < state.config.cooldownUs) {
    throw new Error('Cooldown period active; wait before next action');
  }
}

function validateTransition(current: RelationState, action: DiplomaticAction): void {
  if (current === 'WAR' && action !== 'MAKE_PEACE') {
    throw new Error('At war; only MAKE_PEACE is allowed');
  }
  if (action === 'MAKE_PEACE' && current !== 'WAR') {
    throw new Error('Cannot make peace when not at war');
  }
  if (action === 'LIFT_EMBARGO' && current !== 'EMBARGO') {
    throw new Error('No embargo to lift');
  }
}

function deriveStateFromScore(
  config: DiplomacyEngineConfig,
  score: number,
  current: RelationState,
): RelationState {
  if (current === 'WAR' || current === 'EMBARGO' || current === 'ALLIED') {
    return current;
  }
  const threshold = config.maxScore * 0.3;
  if (score >= threshold) return 'FRIENDLY';
  if (score <= -threshold) return 'HOSTILE';
  return 'NEUTRAL';
}

// ── Operations ───────────────────────────────────────────────────

function performActionImpl(state: EngineState, params: DiplomacyActionParams): DiplomaticRelation {
  if (params.actorId === params.targetId) {
    throw new Error('Cannot perform diplomatic action on self');
  }
  const relation = getOrCreateRelation(state, params.actorId, params.targetId);
  validateAction(state, relation, params.action);
  const delta = ACTION_SCORE_DELTAS[params.action];
  relation.score = clampScore(state.config, relation.score + delta);
  relation.state = ACTION_TARGET_STATE[params.action];
  relation.lastActionAt = state.deps.clock.nowMicroseconds();
  return relationToReadonly(relation);
}

function recordIncidentImpl(state: EngineState, params: RecordIncidentParams): DiplomaticRelation {
  if (params.dynastyA === params.dynastyB) {
    throw new Error('Cannot record incident with self');
  }
  const relation = getOrCreateRelation(state, params.dynastyA, params.dynastyB);
  const incident: MutableIncident = {
    incidentId: state.deps.idGenerator.generate(),
    description: params.description,
    scoreDelta: params.scoreDelta,
    timestamp: state.deps.clock.nowMicroseconds(),
  };
  relation.incidents.push(incident);
  relation.score = clampScore(state.config, relation.score + params.scoreDelta);
  relation.state = deriveStateFromScore(state.config, relation.score, relation.state);
  return relationToReadonly(relation);
}

function getRelationImpl(state: EngineState, a: string, b: string): DiplomaticRelation {
  const relation = getOrCreateRelation(state, a, b);
  return relationToReadonly(relation);
}

function listRelationsImpl(state: EngineState, dynastyId: string): DiplomaticRelation[] {
  const results: DiplomaticRelation[] = [];
  for (const r of state.relations.values()) {
    if (r.dynastyA === dynastyId || r.dynastyB === dynastyId) {
      results.push(relationToReadonly(r));
    }
  }
  return results;
}

function getScoreImpl(state: EngineState, a: string, b: string): number {
  const key = pairKey(a, b);
  const r = state.relations.get(key);
  return r ? r.score : 0;
}

function decayTickImpl(state: EngineState): number {
  let decayed = 0;
  for (const r of state.relations.values()) {
    if (r.score === 0) continue;
    if (r.state === 'WAR' || r.state === 'EMBARGO' || r.state === 'ALLIED') continue;
    const direction = r.score > 0 ? -1 : 1;
    const delta = direction * state.config.decayRatePerTick;
    const newScore = r.score + delta;
    const crossedZero = (r.score > 0 && newScore < 0) || (r.score < 0 && newScore > 0);
    r.score = crossedZero ? 0 : newScore;
    r.state = deriveStateFromScore(state.config, r.score, r.state);
    decayed++;
  }
  return decayed;
}

function getStatsImpl(state: EngineState): DiplomacyEngineStats {
  let friendly = 0;
  let hostile = 0;
  let allied = 0;
  let war = 0;
  let embargo = 0;
  let neutral = 0;
  for (const r of state.relations.values()) {
    if (r.state === 'FRIENDLY') friendly++;
    else if (r.state === 'HOSTILE') hostile++;
    else if (r.state === 'ALLIED') allied++;
    else if (r.state === 'WAR') war++;
    else if (r.state === 'EMBARGO') embargo++;
    else neutral++;
  }
  return {
    totalRelations: state.relations.size,
    friendlyCount: friendly,
    hostileCount: hostile,
    alliedCount: allied,
    warCount: war,
    embargoCount: embargo,
    neutralCount: neutral,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function mergeConfig(overrides?: Partial<DiplomacyEngineConfig>): DiplomacyEngineConfig {
  if (!overrides) return DEFAULT_DIPLOMACY_CONFIG;
  return {
    cooldownUs: overrides.cooldownUs ?? DEFAULT_DIPLOMACY_CONFIG.cooldownUs,
    decayRatePerTick: overrides.decayRatePerTick ?? DEFAULT_DIPLOMACY_CONFIG.decayRatePerTick,
    maxScore: overrides.maxScore ?? DEFAULT_DIPLOMACY_CONFIG.maxScore,
    minScore: overrides.minScore ?? DEFAULT_DIPLOMACY_CONFIG.minScore,
  };
}

function createDiplomacyEngine(deps: DiplomacyEngineDeps): DiplomacyEngine {
  const config = mergeConfig(deps.config);
  const state: EngineState = {
    deps,
    config,
    relations: new Map(),
  };
  return {
    performAction: (p) => performActionImpl(state, p),
    recordIncident: (p) => recordIncidentImpl(state, p),
    getRelation: (a, b) => getRelationImpl(state, a, b),
    listRelations: (id) => listRelationsImpl(state, id),
    getScore: (a, b) => getScoreImpl(state, a, b),
    decayTick: () => decayTickImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createDiplomacyEngine, DEFAULT_DIPLOMACY_CONFIG };
