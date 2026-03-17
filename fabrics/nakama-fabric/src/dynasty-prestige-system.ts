/**
 * Dynasty Prestige System ΓÇö Multi-dimensional prestige tracking across 7 domains.
 *
 * Prestige measures a dynasty's standing in specific areas of Concord society.
 * Scores range 0ΓÇô10000, partitioned into 6 rank tiers. Total prestige is a
 * weighted sum across all domains, enabling fine-grained leaderboards and
 * access gating without collapsing nuance into a single number.
 *
 * Domain weights reflect the Concord's founding values: Chronicle and
 * Exploration are the pillars of civilization; Governance ensures collective
 * accountability; Economy, Culture, Military, and Diplomacy broaden a
 * dynasty's influence.
 *
 * "What a dynasty has done shapes what it may yet become."
 */

// ΓöÇΓöÇΓöÇ Port Interfaces ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface PrestigeClockPort {
  readonly nowIso: () => string;
}

export interface PrestigeIdGeneratorPort {
  readonly generate: () => string;
}

export interface PrestigeDeps {
  readonly clock: PrestigeClockPort;
  readonly idGenerator: PrestigeIdGeneratorPort;
}

// ΓöÇΓöÇΓöÇ Domain & Event Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type PrestigeDomain =
  | 'CHRONICLE'
  | 'EXPLORATION'
  | 'GOVERNANCE'
  | 'ECONOMY'
  | 'CULTURE'
  | 'MILITARY'
  | 'DIPLOMACY';

export type PrestigeEventType =
  | 'WORLD_CLAIMED'
  | 'CHRONICLE_MILESTONE'
  | 'ASSEMBLY_MOTION_PASSED'
  | 'NPC_TRUST_GAINED'
  | 'HONOR_AWARDED'
  | 'COVENANT_FULFILLED'
  | 'SURVEY_MISSION_COMPLETED'
  | 'COVENANT_BREACHED'
  | 'HONOR_REVOKED'
  | 'ASSEMBLY_SANCTION';

export type PrestigeRank = 'OBSCURE' | 'KNOWN' | 'NOTABLE' | 'RESPECTED' | 'RENOWNED' | 'LEGENDARY';

// ΓöÇΓöÇΓöÇ Score & Event Shapes ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface PrestigeScore {
  readonly dynastyId: string;
  readonly domain: PrestigeDomain;
  readonly score: number;
  readonly rank: PrestigeRank;
  readonly lastUpdatedYear: number;
}

export interface PrestigeEvent {
  readonly eventId: string;
  readonly dynastyId: string;
  readonly domain: PrestigeDomain;
  readonly eventType: PrestigeEventType;
  readonly delta: number;
  readonly reason: string;
  readonly year: number;
}

export interface DomainSummary {
  readonly domain: PrestigeDomain;
  readonly dynastyCount: number;
  readonly averageScore: number;
  readonly topScore: number;
  readonly rankDistribution: Readonly<Record<PrestigeRank, number>>;
}

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const MAX_PRESTIGE_SCORE = 10_000;
export const MIN_PRESTIGE_SCORE = 0;

export const PRESTIGE_DOMAINS: ReadonlyArray<PrestigeDomain> = [
  'CHRONICLE',
  'EXPLORATION',
  'GOVERNANCE',
  'ECONOMY',
  'CULTURE',
  'MILITARY',
  'DIPLOMACY',
];

export const PRESTIGE_RANK_THRESHOLDS: Record<PrestigeRank, number> = {
  OBSCURE: 0,
  KNOWN: 1_000,
  NOTABLE: 3_000,
  RESPECTED: 5_500,
  RENOWNED: 7_500,
  LEGENDARY: 9_000,
};

// Domain weights reflect Concord founding values (sum = 1.0)
const DOMAIN_WEIGHTS: Record<PrestigeDomain, number> = {
  CHRONICLE: 0.2,
  EXPLORATION: 0.2,
  GOVERNANCE: 0.15,
  ECONOMY: 0.15,
  CULTURE: 0.15,
  MILITARY: 0.08,
  DIPLOMACY: 0.07,
};

// ΓöÇΓöÇΓöÇ Pure Utilities ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function computePrestigeRank(score: number): PrestigeRank {
  if (score >= PRESTIGE_RANK_THRESHOLDS.LEGENDARY) return 'LEGENDARY';
  if (score >= PRESTIGE_RANK_THRESHOLDS.RENOWNED) return 'RENOWNED';
  if (score >= PRESTIGE_RANK_THRESHOLDS.RESPECTED) return 'RESPECTED';
  if (score >= PRESTIGE_RANK_THRESHOLDS.NOTABLE) return 'NOTABLE';
  if (score >= PRESTIGE_RANK_THRESHOLDS.KNOWN) return 'KNOWN';
  return 'OBSCURE';
}

export function getDomainWeight(domain: PrestigeDomain): number {
  return DOMAIN_WEIGHTS[domain];
}

function clampScore(score: number): number {
  return Math.max(MIN_PRESTIGE_SCORE, Math.min(MAX_PRESTIGE_SCORE, score));
}

// ΓöÇΓöÇΓöÇ State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface PrestigeState {
  scores: Map<string, Map<PrestigeDomain, PrestigeScore>>;
  events: PrestigeEvent[];
}

export function createPrestigeState(): PrestigeState {
  return { scores: new Map(), events: [] };
}

// ΓöÇΓöÇΓöÇ Internal Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function ensureDomainScores(
  state: PrestigeState,
  dynastyId: string,
): Map<PrestigeDomain, PrestigeScore> {
  const existing = state.scores.get(dynastyId);
  if (existing !== undefined) return existing;

  const fresh: Map<PrestigeDomain, PrestigeScore> = new Map();
  state.scores.set(dynastyId, fresh);
  return fresh;
}

function readScore(state: PrestigeState, dynastyId: string, domain: PrestigeDomain): PrestigeScore {
  const domainMap = state.scores.get(dynastyId);
  const existing = domainMap?.get(domain);
  if (existing !== undefined) return existing;

  return {
    dynastyId,
    domain,
    score: 0,
    rank: 'OBSCURE',
    lastUpdatedYear: 0,
  };
}

function buildRankDistribution(scores: ReadonlyArray<PrestigeScore>): Record<PrestigeRank, number> {
  const dist: Record<PrestigeRank, number> = {
    OBSCURE: 0,
    KNOWN: 0,
    NOTABLE: 0,
    RESPECTED: 0,
    RENOWNED: 0,
    LEGENDARY: 0,
  };
  for (const s of scores) dist[s.rank]++;
  return dist;
}

// ΓöÇΓöÇΓöÇ Service Operations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function updateScore(
  state: PrestigeState,
  dynastyId: string,
  domain: PrestigeDomain,
  delta: number,
  year: number,
): void {
  const current = readScore(state, dynastyId, domain);
  const newScore = clampScore(current.score + delta);
  const updated: PrestigeScore = {
    dynastyId,
    domain,
    score: newScore,
    rank: computePrestigeRank(newScore),
    lastUpdatedYear: year,
  };
  ensureDomainScores(state, dynastyId).set(domain, updated);
}

function buildEvent(
  deps: PrestigeDeps,
  dynastyId: string,
  domain: PrestigeDomain,
  eventType: PrestigeEventType,
  delta: number,
  reason: string,
  year: number,
): PrestigeEvent {
  return {
    eventId: deps.idGenerator.generate(),
    dynastyId,
    domain,
    eventType,
    delta,
    reason,
    year,
  };
}

function applyEvent(
  state: PrestigeState,
  deps: PrestigeDeps,
  dynastyId: string,
  domain: PrestigeDomain,
  eventType: PrestigeEventType,
  delta: number,
  reason: string,
  year: number,
): PrestigeEvent {
  updateScore(state, dynastyId, domain, delta, year);
  const event = buildEvent(deps, dynastyId, domain, eventType, delta, reason, year);
  state.events.push(event);
  return event;
}

function getTotalPrestige(state: PrestigeState, dynastyId: string): number {
  let total = 0;
  for (const domain of PRESTIGE_DOMAINS) {
    const score = readScore(state, dynastyId, domain);
    total += score.score * DOMAIN_WEIGHTS[domain];
  }
  return Math.round(total);
}

function getRank(state: PrestigeState, dynastyId: string): PrestigeRank {
  return computePrestigeRank(getTotalPrestige(state, dynastyId));
}

function getTopDynasties(
  state: PrestigeState,
  domain: PrestigeDomain,
  limit: number,
): ReadonlyArray<PrestigeScore> {
  const scores: PrestigeScore[] = [];
  for (const [dynastyId, domainMap] of state.scores) {
    const entry = domainMap.get(domain);
    if (entry !== undefined) {
      scores.push(entry);
    } else {
      scores.push({ dynastyId, domain, score: 0, rank: 'OBSCURE', lastUpdatedYear: 0 });
    }
  }
  return scores.sort((a, b) => b.score - a.score).slice(0, limit);
}

function getDomainSummary(state: PrestigeState, domain: PrestigeDomain): DomainSummary {
  const allScores: PrestigeScore[] = [];
  for (const domainMap of state.scores.values()) {
    const entry = domainMap.get(domain);
    allScores.push(
      entry ?? { dynastyId: '', domain, score: 0, rank: 'OBSCURE', lastUpdatedYear: 0 },
    );
  }

  const dynastyCount = state.scores.size;
  const totalScore = allScores.reduce((sum, s) => sum + s.score, 0);
  const averageScore = dynastyCount > 0 ? Math.round(totalScore / dynastyCount) : 0;
  const topScore = allScores.reduce((max, s) => Math.max(max, s.score), 0);

  return {
    domain,
    dynastyCount,
    averageScore,
    topScore,
    rankDistribution: buildRankDistribution(allScores),
  };
}

// ΓöÇΓöÇΓöÇ Service Interface ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface PrestigeService {
  getScore(dynastyId: string, domain: PrestigeDomain): PrestigeScore;
  getTotalPrestige(dynastyId: string): number;
  getRank(dynastyId: string): PrestigeRank;
  applyEvent(
    dynastyId: string,
    domain: PrestigeDomain,
    type: PrestigeEventType,
    delta: number,
    reason: string,
    year: number,
  ): PrestigeEvent;
  getHistory(dynastyId: string): ReadonlyArray<PrestigeEvent>;
  getTopDynasties(domain: PrestigeDomain, limit: number): ReadonlyArray<PrestigeScore>;
  getDomainSummary(domain: PrestigeDomain): DomainSummary;
}

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createPrestigeService(deps: PrestigeDeps): PrestigeService {
  const state = createPrestigeState();

  return {
    getScore: (dynastyId, domain) => readScore(state, dynastyId, domain),
    getTotalPrestige: (dynastyId) => getTotalPrestige(state, dynastyId),
    getRank: (dynastyId) => getRank(state, dynastyId),
    applyEvent: (dynastyId, domain, type, delta, reason, year) =>
      applyEvent(state, deps, dynastyId, domain, type, delta, reason, year),
    getHistory: (dynastyId) => state.events.filter((e) => e.dynastyId === dynastyId),
    getTopDynasties: (domain, limit) => getTopDynasties(state, domain, limit),
    getDomainSummary: (domain) => getDomainSummary(state, domain),
  };
}
