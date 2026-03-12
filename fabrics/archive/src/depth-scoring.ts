/**
 * Chronicle Depth Scoring — Quality-weighted evaluation of Chronicle entries.
 *
 * Bible v1.4: "A dynasty with a thousand trivial entries has less depth
 * than one with fifty significant ones."
 *
 * Six scoring factors:
 *   1. Category weights — different event types matter differently
 *   2. Recency decay — exponential half-life, floor at 10%
 *   3. Diminishing returns — 1/sqrt(n) for nth entry in same category
 *   4. Diversity bonus — Shannon entropy of category distribution
 *   5. World spread bonus — unique worlds visited
 *   6. Phase multiplier — founding-era entries weighted higher (Bible v1.3)
 */

import type { ChronicleEntry, ChronicleCategory } from './chronicle.js';

// ─── Phase Multipliers (Bible v1.3) ─────────────────────────────────

export type ChroniclePhase = 'founding' | 'early' | 'expansion' | 'contemporary';

export const PHASE_MULTIPLIERS: Readonly<Record<ChroniclePhase, number>> = {
  founding: 5.0,
  early: 3.0,
  expansion: 2.0,
  contemporary: 1.0,
} as const;

export const PHASE_YEAR_RANGES: ReadonlyArray<{
  readonly phase: ChroniclePhase;
  readonly startYear: number;
  readonly endYear: number;
}> = [
  { phase: 'founding', startYear: 1, endYear: 5 },
  { phase: 'early', startYear: 6, endYear: 25 },
  { phase: 'expansion', startYear: 26, endYear: 60 },
  { phase: 'contemporary', startYear: 61, endYear: Infinity },
] as const;

export function getChroniclePhase(inGameYear: number): ChroniclePhase {
  for (const range of PHASE_YEAR_RANGES) {
    if (inGameYear >= range.startYear && inGameYear <= range.endYear) {
      return range.phase;
    }
  }
  return 'contemporary';
}

export function getPhaseMultiplier(inGameYear: number): number {
  return PHASE_MULTIPLIERS[getChroniclePhase(inGameYear)];
}

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Port to resolve the in-game year for a given timestamp.
 * Injected by the consumer — keeps depth scoring decoupled from TimeService.
 */
export type InGameYearResolver = (timestampUs: number) => number;

export interface DepthScoringConfig {
  readonly categoryWeights: Readonly<Record<ChronicleCategory, number>>;
  readonly diversityScale: number;
  readonly worldSpreadScale: number;
  readonly recencyHalfLifeUs: number;
  readonly recencyFloor: number;
  readonly inGameYearResolver?: InGameYearResolver;
}

export interface DepthScore {
  readonly totalScore: number;
  readonly categoryBreakdown: Readonly<Record<ChronicleCategory, number>>;
  readonly diversityBonus: number;
  readonly worldSpreadBonus: number;
  readonly entryCount: number;
}

// ─── Constants ───────────────────────────────────────────────────────

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;

const DEFAULT_CATEGORY_WEIGHTS: Readonly<Record<ChronicleCategory, number>> = {
  'entity.lifecycle': 150,
  'governance.vote': 120,
  'world.transition': 100,
  'player.achievement': 80,
  'economy.transaction': 40,
  'npc.action': 20,
  'system.event': 10,
};

export const DEFAULT_DEPTH_CONFIG: DepthScoringConfig = {
  categoryWeights: DEFAULT_CATEGORY_WEIGHTS,
  diversityScale: 0.3,
  worldSpreadScale: 0.25,
  recencyHalfLifeUs: 365 * US_PER_DAY,
  recencyFloor: 0.1,
} as const;

const ALL_CATEGORIES: ReadonlyArray<ChronicleCategory> = [
  'entity.lifecycle',
  'economy.transaction',
  'governance.vote',
  'world.transition',
  'player.achievement',
  'npc.action',
  'system.event',
];

// ─── Main Function ───────────────────────────────────────────────────

export function calculateChronicleDepth(
  entries: ReadonlyArray<ChronicleEntry>,
  now: number,
  config?: Partial<DepthScoringConfig>,
): DepthScore {
  const cfg = mergeConfig(config);
  if (entries.length === 0) return emptyScore();

  const categoryBreakdown = scoreByCategory(entries, now, cfg);
  const baseScore = sumCategoryScores(categoryBreakdown);
  const diversityBonus = computeDiversityBonus(entries);
  const worldSpreadBonus = computeWorldSpreadBonus(entries);
  const totalScore = applyBonuses(
    baseScore,
    diversityBonus,
    cfg.diversityScale,
    worldSpreadBonus,
    cfg.worldSpreadScale,
  );

  return {
    totalScore,
    categoryBreakdown,
    diversityBonus,
    worldSpreadBonus,
    entryCount: entries.length,
  };
}

// ─── Scoring Helpers ────────────────────────────────────────────────

function scoreByCategory(
  entries: ReadonlyArray<ChronicleEntry>,
  now: number,
  cfg: DepthScoringConfig,
): Record<ChronicleCategory, number> {
  const scores = initCategoryRecord();
  const seen = new Map<ChronicleCategory, number>();

  for (const entry of entries) {
    const nth = (seen.get(entry.category) ?? 0) + 1;
    seen.set(entry.category, nth);
    const weight = cfg.categoryWeights[entry.category];
    const recency = recencyFactor(entry.timestamp, now, cfg);
    const diminishing = 1 / Math.sqrt(nth);
    const phase = cfg.inGameYearResolver !== undefined
      ? getPhaseMultiplier(cfg.inGameYearResolver(entry.timestamp))
      : 1.0;
    scores[entry.category] += weight * recency * diminishing * phase;
  }

  return scores;
}

function recencyFactor(timestamp: number, now: number, cfg: DepthScoringConfig): number {
  const age = Math.max(0, now - timestamp);
  const decay = Math.pow(2, -age / cfg.recencyHalfLifeUs);
  return Math.max(decay, cfg.recencyFloor);
}

function computeDiversityBonus(entries: ReadonlyArray<ChronicleEntry>): number {
  const counts = countByCategory(entries);
  const total = entries.length;
  if (total === 0) return 0;
  const maxEntropy = Math.log2(ALL_CATEGORIES.length);
  if (maxEntropy === 0) return 0;

  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy / maxEntropy;
}

function computeWorldSpreadBonus(entries: ReadonlyArray<ChronicleEntry>): number {
  const uniqueWorlds = new Set(entries.map((e) => e.worldId));
  return Math.min(uniqueWorlds.size / 10, 1.0);
}

function applyBonuses(
  base: number,
  diversity: number,
  diversityScale: number,
  worldSpread: number,
  worldSpreadScale: number,
): number {
  return Math.floor(base * (1 + diversity * diversityScale) * (1 + worldSpread * worldSpreadScale));
}

// ─── Utilities ───────────────────────────────────────────────────────

function mergeConfig(partial?: Partial<DepthScoringConfig>): DepthScoringConfig {
  return { ...DEFAULT_DEPTH_CONFIG, ...partial };
}

function emptyScore(): DepthScore {
  return {
    totalScore: 0,
    categoryBreakdown: initCategoryRecord(),
    diversityBonus: 0,
    worldSpreadBonus: 0,
    entryCount: 0,
  };
}

function initCategoryRecord(): Record<ChronicleCategory, number> {
  return {
    'entity.lifecycle': 0,
    'economy.transaction': 0,
    'governance.vote': 0,
    'world.transition': 0,
    'player.achievement': 0,
    'npc.action': 0,
    'system.event': 0,
  };
}

function countByCategory(entries: ReadonlyArray<ChronicleEntry>): Map<ChronicleCategory, number> {
  const counts = new Map<ChronicleCategory, number>();
  for (const entry of entries) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }
  return counts;
}

function sumCategoryScores(scores: Record<ChronicleCategory, number>): number {
  let total = 0;
  for (const val of Object.values(scores)) total += val;
  return total;
}
