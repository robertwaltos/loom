/**
 * achievement-engine.ts — Dynasty achievement tracking and reward system.
 *
 * Tracks dynasty accomplishments across multiple categories with
 * tiered progression (bronze/silver/gold/platinum). Achievements
 * are defined with criteria thresholds, and progress is tracked
 * incrementally. Unlocking an achievement grants KALON rewards
 * and emits notification events.
 *
 * Categories: exploration, crafting, governance, combat, social
 * Tiers: bronze (1x), silver (2x), gold (4x), platinum (10x)
 */

// ── Ports ────────────────────────────────────────────────────────

export interface AchievementClock {
  readonly nowMicroseconds: () => number;
}

export interface AchievementIdGenerator {
  readonly generate: () => string;
}

export interface AchievementNotificationPort {
  readonly notify: (dynastyId: string, event: AchievementEvent) => void;
}

export interface AchievementEngineDeps {
  readonly clock: AchievementClock;
  readonly idGenerator: AchievementIdGenerator;
  readonly notifications: AchievementNotificationPort;
}

// ── Types ────────────────────────────────────────────────────────

export type AchievementCategory = 'exploration' | 'crafting' | 'governance' | 'combat' | 'social';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type AchievementEventKind = 'ACHIEVEMENT_UNLOCKED' | 'PROGRESS_UPDATED' | 'REWARD_GRANTED';

export interface AchievementEvent {
  readonly kind: AchievementEventKind;
  readonly achievementId: string;
  readonly dynastyId: string;
  readonly timestamp: number;
}

export interface AchievementDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: AchievementCategory;
  readonly tier: AchievementTier;
  readonly criteriaThreshold: number;
  readonly rewardMicroKalon: bigint;
  readonly prerequisiteId: string | null;
}

export interface AchievementProgress {
  readonly achievementId: string;
  readonly dynastyId: string;
  readonly currentProgress: number;
  readonly threshold: number;
  readonly unlocked: boolean;
  readonly unlockedAt: number | null;
  readonly rewardClaimed: boolean;
}

export interface DynastyAchievementSummary {
  readonly dynastyId: string;
  readonly totalUnlocked: number;
  readonly totalProgress: number;
  readonly totalRewardsClaimed: bigint;
  readonly unlockedByCategory: Readonly<Record<AchievementCategory, number>>;
  readonly unlockedByTier: Readonly<Record<AchievementTier, number>>;
}

export interface AchievementEngineStats {
  readonly totalDefinitions: number;
  readonly totalTrackedDynasties: number;
  readonly totalUnlocks: number;
  readonly totalRewardsDistributed: bigint;
}

export interface AchievementEngine {
  readonly defineAchievement: (def: AchievementDefinition) => void;
  readonly getDefinition: (id: string) => AchievementDefinition | undefined;
  readonly listByCategory: (category: AchievementCategory) => readonly AchievementDefinition[];
  readonly listByTier: (tier: AchievementTier) => readonly AchievementDefinition[];
  readonly incrementProgress: (
    dynastyId: string,
    achievementId: string,
    amount: number,
  ) => AchievementProgress;
  readonly setProgress: (
    dynastyId: string,
    achievementId: string,
    value: number,
  ) => AchievementProgress;
  readonly getProgress: (
    dynastyId: string,
    achievementId: string,
  ) => AchievementProgress | undefined;
  readonly claimReward: (dynastyId: string, achievementId: string) => bigint;
  readonly getDynastySummary: (dynastyId: string) => DynastyAchievementSummary;
  readonly listUnlocked: (dynastyId: string) => readonly AchievementProgress[];
  readonly listInProgress: (dynastyId: string) => readonly AchievementProgress[];
  readonly getStats: () => AchievementEngineStats;
}

// ── Constants ────────────────────────────────────────────────────

export const TIER_REWARD_MULTIPLIERS: Readonly<Record<AchievementTier, number>> = {
  bronze: 1,
  silver: 2,
  gold: 4,
  platinum: 10,
};

const ALL_CATEGORIES: readonly AchievementCategory[] = [
  'exploration',
  'crafting',
  'governance',
  'combat',
  'social',
];

const ALL_TIERS: readonly AchievementTier[] = ['bronze', 'silver', 'gold', 'platinum'];

// ── State ────────────────────────────────────────────────────────

interface MutableProgress {
  readonly achievementId: string;
  readonly dynastyId: string;
  currentProgress: number;
  readonly threshold: number;
  unlocked: boolean;
  unlockedAt: number | null;
  rewardClaimed: boolean;
}

interface EngineState {
  readonly deps: AchievementEngineDeps;
  readonly definitions: Map<string, AchievementDefinition>;
  readonly progress: Map<string, Map<string, MutableProgress>>;
  totalUnlocks: number;
  totalRewardsDistributed: bigint;
}

// ── Helpers ──────────────────────────────────────────────────────

function progressToReadonly(p: MutableProgress): AchievementProgress {
  return {
    achievementId: p.achievementId,
    dynastyId: p.dynastyId,
    currentProgress: p.currentProgress,
    threshold: p.threshold,
    unlocked: p.unlocked,
    unlockedAt: p.unlockedAt,
    rewardClaimed: p.rewardClaimed,
  };
}

function ensureDynastyMap(state: EngineState, dynastyId: string): Map<string, MutableProgress> {
  let map = state.progress.get(dynastyId);
  if (map !== undefined) return map;
  map = new Map();
  state.progress.set(dynastyId, map);
  return map;
}

function ensureProgress(
  state: EngineState,
  dynastyId: string,
  def: AchievementDefinition,
): MutableProgress {
  const map = ensureDynastyMap(state, dynastyId);
  const existing = map.get(def.id);
  if (existing !== undefined) return existing;
  const p: MutableProgress = {
    achievementId: def.id,
    dynastyId,
    currentProgress: 0,
    threshold: def.criteriaThreshold,
    unlocked: false,
    unlockedAt: null,
    rewardClaimed: false,
  };
  map.set(def.id, p);
  return p;
}

function requireDefinition(state: EngineState, achievementId: string): AchievementDefinition {
  const def = state.definitions.get(achievementId);
  if (!def) throw new Error('Achievement ' + achievementId + ' not found');
  return def;
}

function checkPrerequisite(
  state: EngineState,
  dynastyId: string,
  def: AchievementDefinition,
): void {
  if (def.prerequisiteId === null) return;
  const map = state.progress.get(dynastyId);
  const prereq = map ? map.get(def.prerequisiteId) : undefined;
  if (!prereq || !prereq.unlocked) {
    throw new Error('Prerequisite ' + def.prerequisiteId + ' not unlocked');
  }
}

// ── Operations ───────────────────────────────────────────────────

function defineAchievementImpl(state: EngineState, def: AchievementDefinition): void {
  if (def.criteriaThreshold <= 0) {
    throw new Error('Criteria threshold must be positive');
  }
  if (def.rewardMicroKalon < 0n) {
    throw new Error('Reward must be non-negative');
  }
  state.definitions.set(def.id, def);
}

function getDefinitionImpl(state: EngineState, id: string): AchievementDefinition | undefined {
  return state.definitions.get(id);
}

function listByCategoryImpl(
  state: EngineState,
  category: AchievementCategory,
): readonly AchievementDefinition[] {
  const result: AchievementDefinition[] = [];
  for (const def of state.definitions.values()) {
    if (def.category === category) result.push(def);
  }
  return result;
}

function listByTierImpl(
  state: EngineState,
  tier: AchievementTier,
): readonly AchievementDefinition[] {
  const result: AchievementDefinition[] = [];
  for (const def of state.definitions.values()) {
    if (def.tier === tier) result.push(def);
  }
  return result;
}

function incrementProgressImpl(
  state: EngineState,
  dynastyId: string,
  achievementId: string,
  amount: number,
): AchievementProgress {
  if (amount <= 0) throw new Error('Increment amount must be positive');
  const def = requireDefinition(state, achievementId);
  checkPrerequisite(state, dynastyId, def);
  const progress = ensureProgress(state, dynastyId, def);
  if (progress.unlocked) return progressToReadonly(progress);
  progress.currentProgress = Math.min(progress.threshold, progress.currentProgress + amount);
  return checkAndUnlock(state, progress, def, dynastyId);
}

function setProgressImpl(
  state: EngineState,
  dynastyId: string,
  achievementId: string,
  value: number,
): AchievementProgress {
  if (value < 0) throw new Error('Progress value must be non-negative');
  const def = requireDefinition(state, achievementId);
  checkPrerequisite(state, dynastyId, def);
  const progress = ensureProgress(state, dynastyId, def);
  if (progress.unlocked) return progressToReadonly(progress);
  progress.currentProgress = Math.min(progress.threshold, value);
  return checkAndUnlock(state, progress, def, dynastyId);
}

function checkAndUnlock(
  state: EngineState,
  progress: MutableProgress,
  def: AchievementDefinition,
  dynastyId: string,
): AchievementProgress {
  if (progress.currentProgress >= progress.threshold && !progress.unlocked) {
    progress.unlocked = true;
    progress.unlockedAt = state.deps.clock.nowMicroseconds();
    state.totalUnlocks += 1;
    emitEvent(state, 'ACHIEVEMENT_UNLOCKED', def.id, dynastyId);
  } else {
    emitEvent(state, 'PROGRESS_UPDATED', def.id, dynastyId);
  }
  return progressToReadonly(progress);
}

function getProgressImpl(
  state: EngineState,
  dynastyId: string,
  achievementId: string,
): AchievementProgress | undefined {
  const map = state.progress.get(dynastyId);
  if (!map) return undefined;
  const p = map.get(achievementId);
  return p ? progressToReadonly(p) : undefined;
}

function claimRewardImpl(state: EngineState, dynastyId: string, achievementId: string): bigint {
  const def = requireDefinition(state, achievementId);
  const map = state.progress.get(dynastyId);
  const progress = map ? map.get(achievementId) : undefined;
  if (!progress || !progress.unlocked) {
    throw new Error('Achievement ' + achievementId + ' not unlocked');
  }
  if (progress.rewardClaimed) {
    throw new Error('Reward already claimed for ' + achievementId);
  }
  progress.rewardClaimed = true;
  state.totalRewardsDistributed += def.rewardMicroKalon;
  emitEvent(state, 'REWARD_GRANTED', achievementId, dynastyId);
  return def.rewardMicroKalon;
}

// ── Queries ──────────────────────────────────────────────────────

function listUnlockedImpl(state: EngineState, dynastyId: string): readonly AchievementProgress[] {
  const map = state.progress.get(dynastyId);
  if (!map) return [];
  const result: AchievementProgress[] = [];
  for (const p of map.values()) {
    if (p.unlocked) result.push(progressToReadonly(p));
  }
  return result;
}

function listInProgressImpl(state: EngineState, dynastyId: string): readonly AchievementProgress[] {
  const map = state.progress.get(dynastyId);
  if (!map) return [];
  const result: AchievementProgress[] = [];
  for (const p of map.values()) {
    if (!p.unlocked && p.currentProgress > 0) result.push(progressToReadonly(p));
  }
  return result;
}

function getDynastySummaryImpl(state: EngineState, dynastyId: string): DynastyAchievementSummary {
  const map = state.progress.get(dynastyId);
  const byCategory = buildCategoryCounts();
  const byTier = buildTierCounts();
  let totalUnlocked = 0;
  let totalProgress = 0;
  let totalRewards = 0n;
  if (!map)
    return buildSummary(dynastyId, totalUnlocked, totalProgress, totalRewards, byCategory, byTier);
  for (const p of map.values()) {
    totalProgress += 1;
    if (!p.unlocked) continue;
    totalUnlocked += 1;
    accumulateCounts(state, p, byCategory, byTier);
    if (p.rewardClaimed) {
      const def = state.definitions.get(p.achievementId);
      if (def) totalRewards += def.rewardMicroKalon;
    }
  }
  return buildSummary(dynastyId, totalUnlocked, totalProgress, totalRewards, byCategory, byTier);
}

function buildCategoryCounts(): Record<AchievementCategory, number> {
  return { exploration: 0, crafting: 0, governance: 0, combat: 0, social: 0 };
}

function buildTierCounts(): Record<AchievementTier, number> {
  return { bronze: 0, silver: 0, gold: 0, platinum: 0 };
}

function accumulateCounts(
  state: EngineState,
  p: MutableProgress,
  byCategory: Record<AchievementCategory, number>,
  byTier: Record<AchievementTier, number>,
): void {
  const def = state.definitions.get(p.achievementId);
  if (!def) return;
  byCategory[def.category] += 1;
  byTier[def.tier] += 1;
}

function buildSummary(
  dynastyId: string,
  totalUnlocked: number,
  totalProgress: number,
  totalRewards: bigint,
  byCategory: Record<AchievementCategory, number>,
  byTier: Record<AchievementTier, number>,
): DynastyAchievementSummary {
  return {
    dynastyId,
    totalUnlocked,
    totalProgress,
    totalRewardsClaimed: totalRewards,
    unlockedByCategory: byCategory,
    unlockedByTier: byTier,
  };
}

function getStatsImpl(state: EngineState): AchievementEngineStats {
  return {
    totalDefinitions: state.definitions.size,
    totalTrackedDynasties: state.progress.size,
    totalUnlocks: state.totalUnlocks,
    totalRewardsDistributed: state.totalRewardsDistributed,
  };
}

// ── Event Emission ───────────────────────────────────────────────

function emitEvent(
  state: EngineState,
  kind: AchievementEventKind,
  achievementId: string,
  dynastyId: string,
): void {
  state.deps.notifications.notify(dynastyId, {
    kind,
    achievementId,
    dynastyId,
    timestamp: state.deps.clock.nowMicroseconds(),
  });
}

// ── Factory ──────────────────────────────────────────────────────

function createAchievementEngine(deps: AchievementEngineDeps): AchievementEngine {
  const state: EngineState = {
    deps,
    definitions: new Map(),
    progress: new Map(),
    totalUnlocks: 0,
    totalRewardsDistributed: 0n,
  };

  return {
    defineAchievement: (def) => {
      defineAchievementImpl(state, def);
    },
    getDefinition: (id) => getDefinitionImpl(state, id),
    listByCategory: (cat) => listByCategoryImpl(state, cat),
    listByTier: (tier) => listByTierImpl(state, tier),
    incrementProgress: (did, aid, amt) => incrementProgressImpl(state, did, aid, amt),
    setProgress: (did, aid, val) => setProgressImpl(state, did, aid, val),
    getProgress: (did, aid) => getProgressImpl(state, did, aid),
    claimReward: (did, aid) => claimRewardImpl(state, did, aid),
    getDynastySummary: (did) => getDynastySummaryImpl(state, did),
    listUnlocked: (did) => listUnlockedImpl(state, did),
    listInProgress: (did) => listInProgressImpl(state, did),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createAchievementEngine, ALL_CATEGORIES, ALL_TIERS };
