/**
 * Faction Politics — Inter-faction political dynamics engine.
 *
 * Models relationships between factions as a graph where each pair
 * has a relationship score [-100, 100]. Factions can take diplomatic
 * actions that shift these scores. Power rankings computed from
 * membership, treasury holdings, and influence.
 */

export type FactionActionType =
  | 'FORM_ALLIANCE'
  | 'DECLARE_WAR'
  | 'IMPOSE_EMBARGO'
  | 'NEGOTIATE_TREATY'
  | 'DENOUNCE'
  | 'EXTEND_AID'
  | 'REQUEST_PEACE'
  | 'BREAK_TREATY';

export type RelationshipTier = 'ALLIED' | 'FRIENDLY' | 'NEUTRAL' | 'TENSE' | 'HOSTILE' | 'WAR';

export interface FactionRelation {
  readonly factionA: string;
  readonly factionB: string;
  readonly score: number;
  readonly tier: RelationshipTier;
  readonly embargoActive: boolean;
  readonly lastActionAt: bigint;
}

export interface FactionAction {
  readonly actionId: string;
  readonly actingFaction: string;
  readonly targetFaction: string;
  readonly actionType: FactionActionType;
  readonly timestamp: bigint;
  readonly scoreDelta: number;
}

export interface FactionPowerRank {
  readonly factionId: string;
  readonly memberCount: number;
  readonly treasury: bigint;
  readonly influenceScore: number;
  readonly powerScore: number;
  readonly rank: number;
}

export interface PoliticalEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly involvedFactions: ReadonlyArray<string>;
  readonly timestamp: bigint;
  readonly description: string;
}

export interface EmbargoPair {
  readonly factionA: string;
  readonly factionB: string;
  readonly imposedBy: string;
  readonly startedAt: bigint;
}

export interface FactionMetrics {
  readonly factionId: string;
  memberCount: number;
  treasury: bigint;
  influenceScore: number;
}

export interface FactionPolitics {
  setRelationship(
    factionA: string,
    factionB: string,
    score: number,
  ): 'success' | 'invalid-score' | 'same-faction';
  getRelationship(factionA: string, factionB: string): FactionRelation | 'not-found';
  recordAction(action: Omit<FactionAction, 'actionId' | 'timestamp'>): string;
  getActionHistory(factionId: string): ReadonlyArray<FactionAction>;
  setFactionMetrics(factionId: string, metrics: Omit<FactionMetrics, 'factionId'>): void;
  getPowerRanking(): ReadonlyArray<FactionPowerRank>;
  applyEmbargo(imposer: string, targetA: string, targetB: string): 'success' | 'not-found';
  removeEmbargo(factionA: string, factionB: string): 'success' | 'not-found';
  getActiveEmbargoes(): ReadonlyArray<EmbargoPair>;
  recordPoliticalEvent(
    eventType: string,
    factions: ReadonlyArray<string>,
    description: string,
  ): string;
  getPoliticalEvents(factionId?: string): ReadonlyArray<PoliticalEvent>;
  getAllRelationships(): ReadonlyArray<FactionRelation>;
}

interface PoliticsState {
  readonly relationships: Map<string, MutableRelation>;
  readonly actions: Map<string, FactionAction>;
  readonly metrics: Map<string, FactionMetrics>;
  readonly events: Map<string, PoliticalEvent>;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { next(): string };
  actionCounter: number;
  eventCounter: number;
}

interface MutableRelation {
  readonly factionA: string;
  readonly factionB: string;
  score: number;
  embargoActive: boolean;
  lastActionAt: bigint;
}

export function createFactionPolitics(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { next(): string };
}): FactionPolitics {
  const state: PoliticsState = {
    relationships: new Map(),
    actions: new Map(),
    metrics: new Map(),
    events: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    actionCounter: 0,
    eventCounter: 0,
  };

  return {
    setRelationship: (a, b, score) => setRelationshipImpl(state, a, b, score),
    getRelationship: (a, b) => getRelationshipImpl(state, a, b),
    recordAction: (action) => recordActionImpl(state, action),
    getActionHistory: (id) => getActionHistoryImpl(state, id),
    setFactionMetrics: (id, metrics) => setFactionMetricsImpl(state, id, metrics),
    getPowerRanking: () => getPowerRankingImpl(state),
    applyEmbargo: (imposer, a, b) => applyEmbargoImpl(state, imposer, a, b),
    removeEmbargo: (a, b) => removeEmbargoImpl(state, a, b),
    getActiveEmbargoes: () => getActiveEmbargoesImpl(state),
    recordPoliticalEvent: (type, factions, desc) => recordEventImpl(state, type, factions, desc),
    getPoliticalEvents: (id) => getPoliticalEventsImpl(state, id),
    getAllRelationships: () => getAllRelationshipsImpl(state),
  };
}

function makeRelationKey(a: string, b: string): string {
  return a < b ? a + ':' + b : b + ':' + a;
}

function setRelationshipImpl(
  state: PoliticsState,
  factionA: string,
  factionB: string,
  score: number,
): 'success' | 'invalid-score' | 'same-faction' {
  if (factionA === factionB) return 'same-faction';
  if (score < -100 || score > 100) return 'invalid-score';
  const key = makeRelationKey(factionA, factionB);
  const existing = state.relationships.get(key);
  if (existing !== undefined) {
    existing.score = score;
    existing.lastActionAt = state.clock.nowMicroseconds();
  } else {
    state.relationships.set(key, {
      factionA,
      factionB,
      score,
      embargoActive: false,
      lastActionAt: state.clock.nowMicroseconds(),
    });
  }
  return 'success';
}

function getRelationshipImpl(
  state: PoliticsState,
  factionA: string,
  factionB: string,
): FactionRelation | 'not-found' {
  const key = makeRelationKey(factionA, factionB);
  const rel = state.relationships.get(key);
  if (rel === undefined) return 'not-found';
  return {
    factionA: rel.factionA,
    factionB: rel.factionB,
    score: rel.score,
    tier: scoreToTier(rel.score),
    embargoActive: rel.embargoActive,
    lastActionAt: rel.lastActionAt,
  };
}

function scoreToTier(score: number): RelationshipTier {
  if (score >= 75) return 'ALLIED';
  if (score >= 25) return 'FRIENDLY';
  if (score >= -25) return 'NEUTRAL';
  if (score >= -50) return 'TENSE';
  if (score >= -75) return 'HOSTILE';
  return 'WAR';
}

function recordActionImpl(
  state: PoliticsState,
  actionData: Omit<FactionAction, 'actionId' | 'timestamp'>,
): string {
  state.actionCounter = state.actionCounter + 1;
  const actionId = 'action-' + String(state.actionCounter);
  const action: FactionAction = {
    actionId,
    actingFaction: actionData.actingFaction,
    targetFaction: actionData.targetFaction,
    actionType: actionData.actionType,
    timestamp: state.clock.nowMicroseconds(),
    scoreDelta: actionData.scoreDelta,
  };
  state.actions.set(actionId, action);
  const key = makeRelationKey(action.actingFaction, action.targetFaction);
  const rel = state.relationships.get(key);
  if (rel !== undefined) {
    const newScore = rel.score + action.scoreDelta;
    rel.score = Math.max(-100, Math.min(100, newScore));
    rel.lastActionAt = action.timestamp;
  } else {
    const score = Math.max(-100, Math.min(100, action.scoreDelta));
    state.relationships.set(key, {
      factionA: action.actingFaction,
      factionB: action.targetFaction,
      score,
      embargoActive: false,
      lastActionAt: action.timestamp,
    });
  }
  return actionId;
}

function getActionHistoryImpl(
  state: PoliticsState,
  factionId: string,
): ReadonlyArray<FactionAction> {
  const result: Array<FactionAction> = [];
  for (const action of state.actions.values()) {
    if (action.actingFaction === factionId || action.targetFaction === factionId) {
      result.push(action);
    }
  }
  return result;
}

function setFactionMetricsImpl(
  state: PoliticsState,
  factionId: string,
  metrics: Omit<FactionMetrics, 'factionId'>,
): void {
  const existing = state.metrics.get(factionId);
  if (existing !== undefined) {
    existing.memberCount = metrics.memberCount;
    existing.treasury = metrics.treasury;
    existing.influenceScore = metrics.influenceScore;
  } else {
    state.metrics.set(factionId, {
      factionId,
      memberCount: metrics.memberCount,
      treasury: metrics.treasury,
      influenceScore: metrics.influenceScore,
    });
  }
}

function getPowerRankingImpl(state: PoliticsState): ReadonlyArray<FactionPowerRank> {
  const ranks: Array<FactionPowerRank> = [];
  for (const m of state.metrics.values()) {
    const treasuryScore = Number(m.treasury / 1_000_000n);
    const powerScore = m.memberCount * 100 + treasuryScore + m.influenceScore * 50;
    ranks.push({
      factionId: m.factionId,
      memberCount: m.memberCount,
      treasury: m.treasury,
      influenceScore: m.influenceScore,
      powerScore,
      rank: 0,
    });
  }
  ranks.sort((a, b) => b.powerScore - a.powerScore);
  for (let i = 0; i < ranks.length; i = i + 1) {
    const r = ranks[i];
    if (r === undefined) continue;
    ranks[i] = { ...r, rank: i + 1 };
  }
  return ranks;
}

function applyEmbargoImpl(
  state: PoliticsState,
  imposer: string,
  targetA: string,
  targetB: string,
): 'success' | 'not-found' {
  const key = makeRelationKey(targetA, targetB);
  const rel = state.relationships.get(key);
  if (rel === undefined) return 'not-found';
  rel.embargoActive = true;
  rel.lastActionAt = state.clock.nowMicroseconds();
  return 'success';
}

function removeEmbargoImpl(
  state: PoliticsState,
  factionA: string,
  factionB: string,
): 'success' | 'not-found' {
  const key = makeRelationKey(factionA, factionB);
  const rel = state.relationships.get(key);
  if (rel === undefined) return 'not-found';
  rel.embargoActive = false;
  rel.lastActionAt = state.clock.nowMicroseconds();
  return 'success';
}

function getActiveEmbargoesImpl(state: PoliticsState): ReadonlyArray<EmbargoPair> {
  const result: Array<EmbargoPair> = [];
  for (const rel of state.relationships.values()) {
    if (rel.embargoActive) {
      result.push({
        factionA: rel.factionA,
        factionB: rel.factionB,
        imposedBy: 'system',
        startedAt: rel.lastActionAt,
      });
    }
  }
  return result;
}

function recordEventImpl(
  state: PoliticsState,
  eventType: string,
  factions: ReadonlyArray<string>,
  description: string,
): string {
  state.eventCounter = state.eventCounter + 1;
  const eventId = 'event-' + String(state.eventCounter);
  const event: PoliticalEvent = {
    eventId,
    eventType,
    involvedFactions: factions,
    timestamp: state.clock.nowMicroseconds(),
    description,
  };
  state.events.set(eventId, event);
  return eventId;
}

function getPoliticalEventsImpl(
  state: PoliticsState,
  factionId?: string,
): ReadonlyArray<PoliticalEvent> {
  const result: Array<PoliticalEvent> = [];
  for (const event of state.events.values()) {
    if (factionId === undefined) {
      result.push(event);
    } else if (event.involvedFactions.includes(factionId)) {
      result.push(event);
    }
  }
  return result;
}

function getAllRelationshipsImpl(state: PoliticsState): ReadonlyArray<FactionRelation> {
  const result: Array<FactionRelation> = [];
  for (const rel of state.relationships.values()) {
    result.push({
      factionA: rel.factionA,
      factionB: rel.factionB,
      score: rel.score,
      tier: scoreToTier(rel.score),
      embargoActive: rel.embargoActive,
      lastActionAt: rel.lastActionAt,
    });
  }
  return result;
}
