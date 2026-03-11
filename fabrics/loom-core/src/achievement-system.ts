/**
 * achievement-system.ts — Player achievements with unlock conditions and rewards.
 *
 * Achievements are defined globally with a rarity and point value. Players are
 * registered individually. Unlocking awards points and records the timestamp.
 * Progress tracking drives auto-unlock when currentProgress reaches requiredProgress.
 * Hidden achievements are filtered from public listings unless explicitly included.
 */

// ── Types ─────────────────────────────────────────────────────────

export type AchievementId = string;
export type PlayerId = string;

export type AchievementError =
  | 'achievement-not-found'
  | 'player-not-found'
  | 'already-unlocked'
  | 'already-registered'
  | 'already-defined';

export type AchievementRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface Achievement {
  readonly achievementId: AchievementId;
  readonly title: string;
  readonly description: string;
  readonly rarity: AchievementRarity;
  readonly pointValue: number;
  readonly hidden: boolean;
}

export interface PlayerAchievement {
  readonly achievementId: AchievementId;
  readonly playerId: PlayerId;
  readonly unlockedAt: bigint;
  readonly pointsEarned: number;
}

export interface ProgressTracker {
  readonly achievementId: AchievementId;
  readonly playerId: PlayerId;
  readonly currentProgress: number;
  readonly requiredProgress: number;
  readonly completed: boolean;
}

export interface PlayerStats {
  readonly playerId: PlayerId;
  readonly totalPoints: number;
  readonly byRarity: Record<AchievementRarity, number>;
  readonly completionPercent: number;
}

export interface AchievementSystem {
  defineAchievement(
    achievementId: AchievementId,
    title: string,
    description: string,
    rarity: AchievementRarity,
    pointValue: number,
    hidden: boolean,
  ): Achievement | AchievementError;
  registerPlayer(
    playerId: PlayerId,
  ): { success: true } | { success: false; error: AchievementError };
  unlockAchievement(
    playerId: PlayerId,
    achievementId: AchievementId,
  ):
    | { success: true; playerAchievement: PlayerAchievement }
    | { success: false; error: AchievementError };
  trackProgress(
    playerId: PlayerId,
    achievementId: AchievementId,
    increment: number,
  ): { success: true; completed: boolean } | { success: false; error: AchievementError };
  initProgress(
    playerId: PlayerId,
    achievementId: AchievementId,
    requiredProgress: number,
  ): { success: true } | { success: false; error: AchievementError };
  getPlayerStats(playerId: PlayerId): PlayerStats | undefined;
  listAchievements(includeHidden?: boolean): ReadonlyArray<Achievement>;
  listUnlocked(playerId: PlayerId): ReadonlyArray<PlayerAchievement>;
  getProgress(playerId: PlayerId, achievementId: AchievementId): ProgressTracker | undefined;
}

// ── Ports ─────────────────────────────────────────────────────────

interface AchievementClock {
  nowUs(): bigint;
}

interface AchievementIdGenerator {
  generate(): string;
}

interface AchievementLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface AchievementSystemDeps {
  readonly clock: AchievementClock;
  readonly idGen: AchievementIdGenerator;
  readonly logger: AchievementLogger;
}

// ── Internal State ────────────────────────────────────────────────

function progressKey(playerId: PlayerId, achievementId: AchievementId): string {
  return playerId + ':' + achievementId;
}

interface MutableProgressTracker {
  achievementId: AchievementId;
  playerId: PlayerId;
  currentProgress: number;
  requiredProgress: number;
  completed: boolean;
}

interface MutablePlayerStats {
  playerId: PlayerId;
  totalPoints: number;
  byRarity: Record<AchievementRarity, number>;
}

interface AchievementState {
  readonly achievements: Map<AchievementId, Achievement>;
  readonly players: Set<PlayerId>;
  readonly unlocked: Map<string, PlayerAchievement>;
  readonly progress: Map<string, MutableProgressTracker>;
  readonly playerStats: Map<PlayerId, MutablePlayerStats>;
  readonly clock: AchievementClock;
  readonly idGen: AchievementIdGenerator;
  readonly logger: AchievementLogger;
}

// ── Helpers ───────────────────────────────────────────────────────

function emptyRarityRecord(): Record<AchievementRarity, number> {
  return { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 };
}

function getOrCreateStats(state: AchievementState, playerId: PlayerId): MutablePlayerStats {
  const existing = state.playerStats.get(playerId);
  if (existing !== undefined) return existing;
  const stats: MutablePlayerStats = { playerId, totalPoints: 0, byRarity: emptyRarityRecord() };
  state.playerStats.set(playerId, stats);
  return stats;
}

function unlockKey(playerId: PlayerId, achievementId: AchievementId): string {
  return playerId + ':' + achievementId;
}

function isUnlocked(
  state: AchievementState,
  playerId: PlayerId,
  achievementId: AchievementId,
): boolean {
  return state.unlocked.has(unlockKey(playerId, achievementId));
}

function doUnlock(
  state: AchievementState,
  playerId: PlayerId,
  achievementId: AchievementId,
): PlayerAchievement {
  const achievement = state.achievements.get(achievementId);
  const pointsEarned = achievement?.pointValue ?? 0;
  const playerAchievement: PlayerAchievement = {
    achievementId,
    playerId,
    unlockedAt: state.clock.nowUs(),
    pointsEarned,
  };
  state.unlocked.set(unlockKey(playerId, achievementId), playerAchievement);

  const stats = getOrCreateStats(state, playerId);
  stats.totalPoints += pointsEarned;
  if (achievement !== undefined) {
    stats.byRarity[achievement.rarity] += 1;
  }
  state.logger.info(
    'achievement-unlocked playerId=' + playerId + ' achievementId=' + achievementId,
  );
  return playerAchievement;
}

function computeCompletionPercent(state: AchievementState, playerId: PlayerId): number {
  const total = state.achievements.size;
  if (total === 0) return 0;
  let unlocked = 0;
  for (const achievement of state.achievements.values()) {
    if (isUnlocked(state, playerId, achievement.achievementId)) unlocked += 1;
  }
  return (unlocked / total) * 100;
}

// ── Operations ────────────────────────────────────────────────────

function defineAchievementImpl(
  state: AchievementState,
  achievementId: AchievementId,
  title: string,
  description: string,
  rarity: AchievementRarity,
  pointValue: number,
  hidden: boolean,
): Achievement | AchievementError {
  if (state.achievements.has(achievementId)) return 'already-defined';
  const achievement: Achievement = {
    achievementId,
    title,
    description,
    rarity,
    pointValue,
    hidden,
  };
  state.achievements.set(achievementId, achievement);
  state.logger.info('achievement-defined achievementId=' + achievementId);
  return achievement;
}

function registerPlayerImpl(
  state: AchievementState,
  playerId: PlayerId,
): { success: true } | { success: false; error: AchievementError } {
  if (state.players.has(playerId)) return { success: false, error: 'already-registered' };
  state.players.add(playerId);
  getOrCreateStats(state, playerId);
  state.logger.info('achievement-player-registered playerId=' + playerId);
  return { success: true };
}

function unlockAchievementImpl(
  state: AchievementState,
  playerId: PlayerId,
  achievementId: AchievementId,
):
  | { success: true; playerAchievement: PlayerAchievement }
  | { success: false; error: AchievementError } {
  if (!state.players.has(playerId)) return { success: false, error: 'player-not-found' };
  if (!state.achievements.has(achievementId))
    return { success: false, error: 'achievement-not-found' };
  if (isUnlocked(state, playerId, achievementId))
    return { success: false, error: 'already-unlocked' };

  const playerAchievement = doUnlock(state, playerId, achievementId);
  return { success: true, playerAchievement };
}

function initProgressImpl(
  state: AchievementState,
  playerId: PlayerId,
  achievementId: AchievementId,
  requiredProgress: number,
): { success: true } | { success: false; error: AchievementError } {
  if (!state.players.has(playerId)) return { success: false, error: 'player-not-found' };
  if (!state.achievements.has(achievementId))
    return { success: false, error: 'achievement-not-found' };

  const key = progressKey(playerId, achievementId);
  if (state.progress.has(key)) return { success: false, error: 'already-unlocked' };

  const tracker: MutableProgressTracker = {
    achievementId,
    playerId,
    currentProgress: 0,
    requiredProgress,
    completed: false,
  };
  state.progress.set(key, tracker);
  return { success: true };
}

function trackProgressImpl(
  state: AchievementState,
  playerId: PlayerId,
  achievementId: AchievementId,
  increment: number,
): { success: true; completed: boolean } | { success: false; error: AchievementError } {
  if (!state.players.has(playerId)) return { success: false, error: 'player-not-found' };
  if (!state.achievements.has(achievementId))
    return { success: false, error: 'achievement-not-found' };

  const key = progressKey(playerId, achievementId);
  const tracker = state.progress.get(key);
  if (tracker === undefined) return { success: false, error: 'achievement-not-found' };
  if (tracker.completed) return { success: false, error: 'already-unlocked' };

  tracker.currentProgress += increment;

  if (tracker.currentProgress >= tracker.requiredProgress) {
    tracker.completed = true;
    if (!isUnlocked(state, playerId, achievementId)) {
      doUnlock(state, playerId, achievementId);
    }
    return { success: true, completed: true };
  }

  return { success: true, completed: false };
}

function getPlayerStatsImpl(state: AchievementState, playerId: PlayerId): PlayerStats | undefined {
  if (!state.players.has(playerId)) return undefined;
  const stats = getOrCreateStats(state, playerId);
  const completionPercent = computeCompletionPercent(state, playerId);
  return {
    playerId: stats.playerId,
    totalPoints: stats.totalPoints,
    byRarity: { ...stats.byRarity },
    completionPercent,
  };
}

function listAchievementsImpl(
  state: AchievementState,
  includeHidden: boolean,
): ReadonlyArray<Achievement> {
  const result: Achievement[] = [];
  for (const achievement of state.achievements.values()) {
    if (!includeHidden && achievement.hidden) continue;
    result.push(achievement);
  }
  return result;
}

function listUnlockedImpl(
  state: AchievementState,
  playerId: PlayerId,
): ReadonlyArray<PlayerAchievement> {
  const result: PlayerAchievement[] = [];
  for (const pa of state.unlocked.values()) {
    if (pa.playerId === playerId) result.push(pa);
  }
  return result;
}

function getProgressImpl(
  state: AchievementState,
  playerId: PlayerId,
  achievementId: AchievementId,
): ProgressTracker | undefined {
  const tracker = state.progress.get(progressKey(playerId, achievementId));
  if (tracker === undefined) return undefined;
  return {
    achievementId: tracker.achievementId,
    playerId: tracker.playerId,
    currentProgress: tracker.currentProgress,
    requiredProgress: tracker.requiredProgress,
    completed: tracker.completed,
  };
}

// ── Factory ───────────────────────────────────────────────────────

export function createAchievementSystem(deps: AchievementSystemDeps): AchievementSystem {
  const state: AchievementState = {
    achievements: new Map(),
    players: new Set(),
    unlocked: new Map(),
    progress: new Map(),
    playerStats: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    defineAchievement: (id, title, desc, rarity, pointValue, hidden) =>
      defineAchievementImpl(state, id, title, desc, rarity, pointValue, hidden),
    registerPlayer: (playerId) => registerPlayerImpl(state, playerId),
    unlockAchievement: (playerId, achievementId) =>
      unlockAchievementImpl(state, playerId, achievementId),
    trackProgress: (playerId, achievementId, increment) =>
      trackProgressImpl(state, playerId, achievementId, increment),
    initProgress: (playerId, achievementId, requiredProgress) =>
      initProgressImpl(state, playerId, achievementId, requiredProgress),
    getPlayerStats: (playerId) => getPlayerStatsImpl(state, playerId),
    listAchievements: (includeHidden = false) => listAchievementsImpl(state, includeHidden),
    listUnlocked: (playerId) => listUnlockedImpl(state, playerId),
    getProgress: (playerId, achievementId) => getProgressImpl(state, playerId, achievementId),
  };
}
