/**
 * npc-knowledge.ts — NPC information sharing and rumor propagation.
 *
 * Models NPC knowledge networks: facts, rumors, trust levels, information
 * decay, and social spread. Knowledge items degrade over time, rumors
 * spread through social networks with diminishing fidelity, and trust
 * levels affect how NPCs evaluate information trustworthiness.
 */

// -- Ports ────────────────────────────────────────────────────────

interface KnowledgeClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface KnowledgeIdGeneratorPort {
  readonly next: () => string;
}

interface KnowledgeLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
}

interface NpcKnowledgeDeps {
  readonly clock: KnowledgeClockPort;
  readonly idGenerator: KnowledgeIdGeneratorPort;
  readonly logger: KnowledgeLoggerPort;
}

// -- Types ────────────────────────────────────────────────────────

type KnowledgeCategory = 'EVENT' | 'LOCATION' | 'NPC' | 'QUEST' | 'MARKET' | 'DANGER';

type TrustLevel = 'VERIFIED' | 'TRUSTED' | 'UNCERTAIN' | 'DUBIOUS' | 'DISTRUSTED';

type KnowledgeSource = 'FIRSTHAND' | 'RELIABLE_NPC' | 'RUMOR' | 'GOSSIP' | 'UNKNOWN';

interface KnowledgeItem {
  readonly knowledgeId: string;
  readonly npcId: string;
  readonly category: KnowledgeCategory;
  readonly subject: string;
  readonly content: string;
  readonly source: KnowledgeSource;
  readonly trustLevel: TrustLevel;
  readonly acquiredAt: bigint;
  readonly lastRefreshedAt: bigint;
  readonly decayRate: number;
}

interface Rumor {
  readonly rumorId: string;
  readonly originNpcId: string;
  readonly category: KnowledgeCategory;
  readonly subject: string;
  readonly content: string;
  readonly fidelity: number;
  readonly spreadCount: number;
  readonly createdAt: bigint;
}

interface KnowledgeSpread {
  readonly spreadId: string;
  readonly fromNpcId: string;
  readonly toNpcId: string;
  readonly knowledgeId: string;
  readonly fidelityLoss: number;
  readonly spreadAt: bigint;
}

interface TrustworthinessScore {
  readonly npcId: string;
  readonly evaluatorNpcId: string;
  readonly score: number;
  readonly factors: readonly string[];
}

interface KnowledgeStats {
  readonly totalKnowledge: number;
  readonly totalRumors: number;
  readonly totalSpreads: number;
  readonly averageTrust: number;
  readonly staleKnowledgeCount: number;
}

type AddKnowledgeError = 'duplicate_knowledge';
type SpreadRumorError = 'rumor_not_found' | 'same_npc';
type EvaluateTrustError = 'npc_not_found';

// -- Constants ────────────────────────────────────────────────────

const DECAY_RATE_FAST = 0.15;
const DECAY_RATE_MEDIUM = 0.08;
const DECAY_RATE_SLOW = 0.03;
const STALE_THRESHOLD = 0.25;
const FIDELITY_LOSS_PER_HOP = 0.1;
const MIN_FIDELITY = 0.2;
const KNOWLEDGE_LIFETIME_US = 7_200_000_000n;

// -- State ────────────────────────────────────────────────────────

interface MutableKnowledgeItem {
  readonly knowledgeId: string;
  readonly npcId: string;
  readonly category: KnowledgeCategory;
  readonly subject: string;
  readonly content: string;
  readonly source: KnowledgeSource;
  trustLevel: TrustLevel;
  readonly acquiredAt: bigint;
  lastRefreshedAt: bigint;
  decayRate: number;
}

interface MutableRumor {
  readonly rumorId: string;
  readonly originNpcId: string;
  readonly category: KnowledgeCategory;
  readonly subject: string;
  readonly content: string;
  fidelity: number;
  spreadCount: number;
  readonly createdAt: bigint;
}

interface NpcKnowledgeState {
  readonly deps: NpcKnowledgeDeps;
  readonly knowledge: Map<string, MutableKnowledgeItem>;
  readonly rumors: Map<string, MutableRumor>;
  readonly spreads: KnowledgeSpread[];
  readonly npcKnowledge: Map<string, string[]>;
  readonly trustMatrix: Map<string, Map<string, number>>;
}

// -- Helpers ──────────────────────────────────────────────────────

function toKnowledgeItem(k: MutableKnowledgeItem): KnowledgeItem {
  return {
    knowledgeId: k.knowledgeId,
    npcId: k.npcId,
    category: k.category,
    subject: k.subject,
    content: k.content,
    source: k.source,
    trustLevel: k.trustLevel,
    acquiredAt: k.acquiredAt,
    lastRefreshedAt: k.lastRefreshedAt,
    decayRate: k.decayRate,
  };
}

function toRumor(r: MutableRumor): Rumor {
  return {
    rumorId: r.rumorId,
    originNpcId: r.originNpcId,
    category: r.category,
    subject: r.subject,
    content: r.content,
    fidelity: r.fidelity,
    spreadCount: r.spreadCount,
    createdAt: r.createdAt,
  };
}

function getNpcKnowledgeList(state: NpcKnowledgeState, npcId: string): string[] {
  let list = state.npcKnowledge.get(npcId);
  if (!list) {
    list = [];
    state.npcKnowledge.set(npcId, list);
  }
  return list;
}

function getTrustMap(state: NpcKnowledgeState, evaluatorNpcId: string): Map<string, number> {
  let map = state.trustMatrix.get(evaluatorNpcId);
  if (!map) {
    map = new Map();
    state.trustMatrix.set(evaluatorNpcId, map);
  }
  return map;
}

function computeDecayRate(source: KnowledgeSource): number {
  if (source === 'FIRSTHAND') return DECAY_RATE_SLOW;
  if (source === 'RELIABLE_NPC') return DECAY_RATE_MEDIUM;
  return DECAY_RATE_FAST;
}

function computeTrustLevel(source: KnowledgeSource, fidelity: number): TrustLevel {
  if (source === 'FIRSTHAND') return 'VERIFIED';
  if (source === 'RELIABLE_NPC' && fidelity > 0.8) return 'TRUSTED';
  if (source === 'RUMOR') return 'DUBIOUS';
  if (fidelity > 0.6) return 'UNCERTAIN';
  if (fidelity > 0.4) return 'DUBIOUS';
  return 'DISTRUSTED';
}

function computeFidelityAfterSpread(currentFidelity: number, trustBetweenNpcs: number): number {
  const loss = FIDELITY_LOSS_PER_HOP * (1 - trustBetweenNpcs);
  return Math.max(MIN_FIDELITY, currentFidelity - loss);
}

function isStale(k: MutableKnowledgeItem, now: bigint): boolean {
  const age = now - k.lastRefreshedAt;
  const maxAge = KNOWLEDGE_LIFETIME_US;
  if (age > maxAge) return true;
  const decay = (Number(age) / Number(maxAge)) * k.decayRate;
  return decay > STALE_THRESHOLD;
}

function countStaleKnowledge(state: NpcKnowledgeState, now: bigint): number {
  let count = 0;
  for (const k of state.knowledge.values()) {
    if (isStale(k, now)) count++;
  }
  return count;
}

function computeAverageTrust(state: NpcKnowledgeState): number {
  if (state.knowledge.size === 0) return 0;
  const trustValues: Record<TrustLevel, number> = {
    VERIFIED: 1.0,
    TRUSTED: 0.8,
    UNCERTAIN: 0.5,
    DUBIOUS: 0.3,
    DISTRUSTED: 0.1,
  };
  let sum = 0;
  for (const k of state.knowledge.values()) {
    sum += trustValues[k.trustLevel];
  }
  return sum / state.knowledge.size;
}

// -- Operations ───────────────────────────────────────────────────

function addKnowledgeImpl(
  state: NpcKnowledgeState,
  npcId: string,
  category: KnowledgeCategory,
  subject: string,
  content: string,
  source: KnowledgeSource,
): KnowledgeItem | AddKnowledgeError {
  const list = getNpcKnowledgeList(state, npcId);
  const existing = list.find((kid) => {
    const k = state.knowledge.get(kid);
    return k?.subject === subject && k?.category === category;
  });
  if (existing) return 'duplicate_knowledge';
  const now = state.deps.clock.nowMicroseconds();
  const decayRate = computeDecayRate(source);
  const trustLevel = computeTrustLevel(source, 1.0);
  const knowledge: MutableKnowledgeItem = {
    knowledgeId: state.deps.idGenerator.next(),
    npcId,
    category,
    subject,
    content,
    source,
    trustLevel,
    acquiredAt: now,
    lastRefreshedAt: now,
    decayRate,
  };
  state.knowledge.set(knowledge.knowledgeId, knowledge);
  list.push(knowledge.knowledgeId);
  return toKnowledgeItem(knowledge);
}

function createRumorImpl(
  state: NpcKnowledgeState,
  originNpcId: string,
  category: KnowledgeCategory,
  subject: string,
  content: string,
): Rumor {
  const rumor: MutableRumor = {
    rumorId: state.deps.idGenerator.next(),
    originNpcId,
    category,
    subject,
    content,
    fidelity: 1.0,
    spreadCount: 0,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.rumors.set(rumor.rumorId, rumor);
  state.deps.logger.info('rumor created', {
    rumorId: rumor.rumorId,
    origin: originNpcId,
    subject,
  });
  return toRumor(rumor);
}

function spreadRumorImpl(
  state: NpcKnowledgeState,
  rumorId: string,
  fromNpcId: string,
  toNpcId: string,
): KnowledgeSpread | SpreadRumorError {
  const rumor = state.rumors.get(rumorId);
  if (!rumor) return 'rumor_not_found';
  if (fromNpcId === toNpcId) return 'same_npc';
  const trustMap = getTrustMap(state, toNpcId);
  const trust = trustMap.get(fromNpcId) ?? 0.5;
  const newFidelity = computeFidelityAfterSpread(rumor.fidelity, trust);
  rumor.fidelity = newFidelity;
  rumor.spreadCount++;
  const spread: KnowledgeSpread = {
    spreadId: state.deps.idGenerator.next(),
    fromNpcId,
    toNpcId,
    knowledgeId: rumorId,
    fidelityLoss: rumor.fidelity - newFidelity,
    spreadAt: state.deps.clock.nowMicroseconds(),
  };
  state.spreads.push(spread);
  const source: KnowledgeSource = trust > 0.7 ? 'RELIABLE_NPC' : 'RUMOR';
  addKnowledgeFromRumor(state, toNpcId, rumor, source, newFidelity);
  return spread;
}

function addKnowledgeFromRumor(
  state: NpcKnowledgeState,
  npcId: string,
  rumor: MutableRumor,
  source: KnowledgeSource,
  fidelity: number,
): void {
  const now = state.deps.clock.nowMicroseconds();
  const decayRate = computeDecayRate(source);
  const trustLevel = computeTrustLevel(source, fidelity);
  const knowledge: MutableKnowledgeItem = {
    knowledgeId: state.deps.idGenerator.next(),
    npcId,
    category: rumor.category,
    subject: rumor.subject,
    content: rumor.content,
    source,
    trustLevel,
    acquiredAt: now,
    lastRefreshedAt: now,
    decayRate,
  };
  state.knowledge.set(knowledge.knowledgeId, knowledge);
  const list = getNpcKnowledgeList(state, npcId);
  list.push(knowledge.knowledgeId);
}

function refreshKnowledgeImpl(
  state: NpcKnowledgeState,
  knowledgeId: string,
): KnowledgeItem | string {
  const k = state.knowledge.get(knowledgeId);
  if (!k) return 'knowledge_not_found';
  k.lastRefreshedAt = state.deps.clock.nowMicroseconds();
  return toKnowledgeItem(k);
}

function getKnownFactsImpl(
  state: NpcKnowledgeState,
  npcId: string,
  category: KnowledgeCategory | undefined,
): readonly KnowledgeItem[] {
  const list = getNpcKnowledgeList(state, npcId);
  const results: KnowledgeItem[] = [];
  for (const kid of list) {
    const k = state.knowledge.get(kid);
    if (!k) continue;
    if (category !== undefined && k.category !== category) continue;
    results.push(toKnowledgeItem(k));
  }
  return results;
}

function evaluateTrustworthinessImpl(
  state: NpcKnowledgeState,
  evaluatorNpcId: string,
  targetNpcId: string,
  relationshipScore: number,
  reputationScore: number,
  historyScore: number,
): TrustworthinessScore {
  const relWeight = 0.4;
  const repWeight = 0.35;
  const histWeight = 0.25;
  const score =
    relationshipScore * relWeight + reputationScore * repWeight + historyScore * histWeight;
  const trustMap = getTrustMap(state, evaluatorNpcId);
  trustMap.set(targetNpcId, score);
  const factors: string[] = [];
  if (relationshipScore > 0.7) factors.push('strong_relationship');
  if (reputationScore > 0.7) factors.push('good_reputation');
  if (historyScore > 0.7) factors.push('reliable_history');
  if (score < 0.3) factors.push('low_trust');
  return {
    npcId: targetNpcId,
    evaluatorNpcId,
    score,
    factors,
  };
}

function pruneStaleKnowledgeImpl(state: NpcKnowledgeState, npcId: string): number {
  const now = state.deps.clock.nowMicroseconds();
  const list = getNpcKnowledgeList(state, npcId);
  const toRemove: string[] = [];
  for (const kid of list) {
    const k = state.knowledge.get(kid);
    if (k && isStale(k, now)) {
      toRemove.push(kid);
      state.knowledge.delete(kid);
    }
  }
  for (const kid of toRemove) {
    const idx = list.indexOf(kid);
    if (idx >= 0) list.splice(idx, 1);
  }
  return toRemove.length;
}

function getKnowledgeItemImpl(
  state: NpcKnowledgeState,
  knowledgeId: string,
): KnowledgeItem | undefined {
  const k = state.knowledge.get(knowledgeId);
  return k ? toKnowledgeItem(k) : undefined;
}

function getRumorImpl(state: NpcKnowledgeState, rumorId: string): Rumor | undefined {
  const r = state.rumors.get(rumorId);
  return r ? toRumor(r) : undefined;
}

function getRumorsByOriginImpl(state: NpcKnowledgeState, originNpcId: string): readonly Rumor[] {
  const results: Rumor[] = [];
  for (const r of state.rumors.values()) {
    if (r.originNpcId === originNpcId) {
      results.push(toRumor(r));
    }
  }
  return results;
}

function getSpreadHistoryImpl(
  state: NpcKnowledgeState,
  rumorId: string,
): readonly KnowledgeSpread[] {
  return state.spreads.filter((s) => s.knowledgeId === rumorId);
}

function getTrustScoreImpl(
  state: NpcKnowledgeState,
  evaluatorNpcId: string,
  targetNpcId: string,
): number | undefined {
  const trustMap = getTrustMap(state, evaluatorNpcId);
  return trustMap.get(targetNpcId);
}

function getKnowledgeStatsImpl(state: NpcKnowledgeState): KnowledgeStats {
  const now = state.deps.clock.nowMicroseconds();
  return {
    totalKnowledge: state.knowledge.size,
    totalRumors: state.rumors.size,
    totalSpreads: state.spreads.length,
    averageTrust: computeAverageTrust(state),
    staleKnowledgeCount: countStaleKnowledge(state, now),
  };
}

// -- Public API ───────────────────────────────────────────────────

interface NpcKnowledgeSystem {
  readonly addKnowledge: (
    npcId: string,
    category: KnowledgeCategory,
    subject: string,
    content: string,
    source: KnowledgeSource,
  ) => KnowledgeItem | AddKnowledgeError;
  readonly createRumor: (
    originNpcId: string,
    category: KnowledgeCategory,
    subject: string,
    content: string,
  ) => Rumor;
  readonly spreadRumor: (
    rumorId: string,
    fromNpcId: string,
    toNpcId: string,
  ) => KnowledgeSpread | SpreadRumorError;
  readonly refreshKnowledge: (knowledgeId: string) => KnowledgeItem | string;
  readonly getKnownFacts: (
    npcId: string,
    category: KnowledgeCategory | undefined,
  ) => readonly KnowledgeItem[];
  readonly evaluateTrustworthiness: (
    evaluatorNpcId: string,
    targetNpcId: string,
    relationshipScore: number,
    reputationScore: number,
    historyScore: number,
  ) => TrustworthinessScore;
  readonly pruneStaleKnowledge: (npcId: string) => number;
  readonly getKnowledgeItem: (knowledgeId: string) => KnowledgeItem | undefined;
  readonly getRumor: (rumorId: string) => Rumor | undefined;
  readonly getRumorsByOrigin: (originNpcId: string) => readonly Rumor[];
  readonly getSpreadHistory: (rumorId: string) => readonly KnowledgeSpread[];
  readonly getTrustScore: (evaluatorNpcId: string, targetNpcId: string) => number | undefined;
  readonly getStats: () => KnowledgeStats;
}

// -- Factory ──────────────────────────────────────────────────────

function createNpcKnowledgeSystem(deps: NpcKnowledgeDeps): NpcKnowledgeSystem {
  const state: NpcKnowledgeState = {
    deps,
    knowledge: new Map(),
    rumors: new Map(),
    spreads: [],
    npcKnowledge: new Map(),
    trustMatrix: new Map(),
  };
  return {
    addKnowledge: (npc, cat, subj, cont, src) => addKnowledgeImpl(state, npc, cat, subj, cont, src),
    createRumor: (origin, cat, subj, cont) => createRumorImpl(state, origin, cat, subj, cont),
    spreadRumor: (rid, from, to) => spreadRumorImpl(state, rid, from, to),
    refreshKnowledge: (kid) => refreshKnowledgeImpl(state, kid),
    getKnownFacts: (npc, cat) => getKnownFactsImpl(state, npc, cat),
    evaluateTrustworthiness: (evaluatorId, tgt, rel, rep, hist) =>
      evaluateTrustworthinessImpl(state, evaluatorId, tgt, rel, rep, hist),
    pruneStaleKnowledge: (npc) => pruneStaleKnowledgeImpl(state, npc),
    getKnowledgeItem: (kid) => getKnowledgeItemImpl(state, kid),
    getRumor: (rid) => getRumorImpl(state, rid),
    getRumorsByOrigin: (origin) => getRumorsByOriginImpl(state, origin),
    getSpreadHistory: (rid) => getSpreadHistoryImpl(state, rid),
    getTrustScore: (evaluatorId, tgt) => getTrustScoreImpl(state, evaluatorId, tgt),
    getStats: () => getKnowledgeStatsImpl(state),
  };
}

// -- Exports ──────────────────────────────────────────────────────

export { createNpcKnowledgeSystem };
export {
  DECAY_RATE_FAST,
  DECAY_RATE_MEDIUM,
  DECAY_RATE_SLOW,
  STALE_THRESHOLD,
  FIDELITY_LOSS_PER_HOP,
  MIN_FIDELITY,
  KNOWLEDGE_LIFETIME_US,
};
export type {
  NpcKnowledgeSystem,
  NpcKnowledgeDeps,
  KnowledgeCategory,
  TrustLevel,
  KnowledgeSource,
  KnowledgeItem,
  Rumor,
  KnowledgeSpread,
  TrustworthinessScore,
  KnowledgeStats,
  AddKnowledgeError,
  SpreadRumorError,
  EvaluateTrustError,
};
