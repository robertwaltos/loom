/**
 * Achievement System — Player achievement engine.
 *
 * Tracks progress toward achievements per player, auto-unlocks at target,
 * gates gated achievements behind prerequisites, and emits an unlock queue
 * for downstream notification systems to drain.
 */

export type AchievementCategory =
  | 'exploration' // visited N worlds
  | 'economy' // KALON milestones
  | 'dynasty' // dynasty age / members
  | 'chronicle' // Chronicle submissions
  | 'social' // alliances, interactions
  | 'combat' // PvP victories
  | 'lore'; // lore unlock milestones

export interface AchievementDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: AchievementCategory;
  /** For progress-based achievements (e.g. "visit 10 worlds"), required total. */
  readonly targetProgress?: number;
  /** Points awarded on unlock. */
  readonly points: number;
  /** Achievement must be unlocked before this one becomes visible. */
  readonly prerequisiteId?: string;
}

export interface AchievementProgress {
  readonly achievementId: string;
  readonly playerId: string;
  readonly currentProgress: number;
  readonly targetProgress: number;
  readonly unlockedAt: string | null; // ISO 8601 or null
  readonly isUnlocked: boolean;
}

export interface AchievementEngine {
  /** Register achievement definitions (idempotent by id). */
  define(def: AchievementDefinition): void;
  /** Increment progress counter for a player. For binary achievements, increment by targetProgress. */
  incrementProgress(playerId: string, achievementId: string, delta?: number): AchievementProgress;
  /** Set absolute progress (idempotent once unlocked). */
  setProgress(playerId: string, achievementId: string, value: number): AchievementProgress;
  /** Get all achievements for a player with progress. */
  getPlayerAchievements(playerId: string): ReadonlyArray<AchievementProgress>;
  /** Get newly unlocked achievements since last call (clears the queue). */
  drainUnlockQueue(playerId: string): ReadonlyArray<string>; // achievement IDs
  /** Get total points for a player. */
  getTotalPoints(playerId: string): number;
  /** List all definitions. */
  listDefinitions(): ReadonlyArray<AchievementDefinition>;
}

// ── Internal mutable state ────────────────────────────────────────────────────

interface MutableProgress {
  achievementId: string;
  playerId: string;
  currentProgress: number;
  targetProgress: number;
  unlockedAt: string | null;
  isUnlocked: boolean;
}

function snapshot(p: MutableProgress): AchievementProgress {
  return {
    achievementId: p.achievementId,
    playerId: p.playerId,
    currentProgress: p.currentProgress,
    targetProgress: p.targetProgress,
    unlockedAt: p.unlockedAt,
    isUnlocked: p.isUnlocked,
  };
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createAchievementEngine(): AchievementEngine {
  const definitions = new Map<string, AchievementDefinition>();
  const progressStore = new Map<string, Map<string, MutableProgress>>();
  const unlockQueues = new Map<string, string[]>();

  const starters: ReadonlyArray<AchievementDefinition> = [
    {
      id: 'first_step',
      name: 'First Step',
      description: 'First login or first world visit',
      category: 'lore',
      points: 10,
    },
    {
      id: 'world_traveler_3',
      name: 'World Traveler',
      description: 'Visit 3 worlds',
      category: 'exploration',
      targetProgress: 3,
      points: 25,
    },
    {
      id: 'world_traveler_10',
      name: 'Seasoned Explorer',
      description: 'Visit 10 worlds',
      category: 'exploration',
      targetProgress: 10,
      points: 100,
      prerequisiteId: 'world_traveler_3',
    },
    {
      id: 'kalon_1000',
      name: 'First Thousand',
      description: 'Hold 1000 KALON',
      category: 'economy',
      points: 15,
    },
    {
      id: 'kalon_1m',
      name: 'Millionaire',
      description: 'Hold 1,000,000 KALON',
      category: 'economy',
      points: 200,
      prerequisiteId: 'kalon_1000',
    },
    {
      id: 'dynasty_30_days',
      name: 'Lineage Keeper',
      description: 'Dynasty age \u226530 days',
      category: 'dynasty',
      points: 50,
    },
    {
      id: 'chronicle_1',
      name: 'First Chronicle',
      description: 'First Chronicle submission',
      category: 'chronicle',
      points: 20,
    },
    {
      id: 'chronicle_10',
      name: 'Chronicler',
      description: '10 Chronicle submissions',
      category: 'chronicle',
      targetProgress: 10,
      points: 75,
      prerequisiteId: 'chronicle_1',
    },
    {
      id: 'alliance_1',
      name: 'Diplomatic',
      description: 'First alliance formed',
      category: 'social',
      points: 30,
    },
    {
      id: 'pvp_10_wins',
      name: 'Proven',
      description: '10 PvP wins',
      category: 'combat',
      targetProgress: 10,
      points: 60,
    },
  ];

  for (const def of starters) {
    definitions.set(def.id, def);
  }

  function getOrInitPlayerMap(playerId: string): Map<string, MutableProgress> {
    let playerMap = progressStore.get(playerId);
    if (playerMap === undefined) {
      playerMap = new Map<string, MutableProgress>();
      progressStore.set(playerId, playerMap);
    }
    return playerMap;
  }

  function getOrInitProgress(playerId: string, achievementId: string): MutableProgress {
    const def = definitions.get(achievementId);
    if (def === undefined) throw new Error(`Unknown achievement: ${achievementId}`);
    const playerMap = getOrInitPlayerMap(playerId);
    let p = playerMap.get(achievementId);
    if (p === undefined) {
      p = {
        achievementId,
        playerId,
        currentProgress: 0,
        targetProgress: def.targetProgress ?? 1,
        unlockedAt: null,
        isUnlocked: false,
      };
      playerMap.set(achievementId, p);
    }
    return p;
  }

  function isPrerequisiteMet(playerId: string, def: AchievementDefinition): boolean {
    const prereqId = def.prerequisiteId;
    if (prereqId === undefined) return true;
    return progressStore.get(playerId)?.get(prereqId)?.isUnlocked === true;
  }

  function tryUnlock(playerId: string, p: MutableProgress): void {
    if (!p.isUnlocked && p.currentProgress >= p.targetProgress) {
      p.isUnlocked = true;
      p.unlockedAt = new Date().toISOString();
      let queue = unlockQueues.get(playerId);
      if (queue === undefined) {
        queue = [];
        unlockQueues.set(playerId, queue);
      }
      queue.push(p.achievementId);
    }
  }

  return {
    define(def: AchievementDefinition): void {
      definitions.set(def.id, def);
    },

    incrementProgress(playerId: string, achievementId: string, delta = 1): AchievementProgress {
      const def = definitions.get(achievementId);
      if (def === undefined) throw new Error(`Unknown achievement: ${achievementId}`);
      const p = getOrInitProgress(playerId, achievementId);
      if (p.isUnlocked) return snapshot(p);
      if (!isPrerequisiteMet(playerId, def)) return snapshot(p);
      p.currentProgress = Math.min(p.currentProgress + delta, p.targetProgress);
      tryUnlock(playerId, p);
      return snapshot(p);
    },

    setProgress(playerId: string, achievementId: string, value: number): AchievementProgress {
      const def = definitions.get(achievementId);
      if (def === undefined) throw new Error(`Unknown achievement: ${achievementId}`);
      const p = getOrInitProgress(playerId, achievementId);
      if (p.isUnlocked) return snapshot(p);
      p.currentProgress = Math.min(value, p.targetProgress);
      tryUnlock(playerId, p);
      return snapshot(p);
    },

    getPlayerAchievements(playerId: string): ReadonlyArray<AchievementProgress> {
      const playerMap = progressStore.get(playerId);
      return [...definitions.values()].map((def): AchievementProgress => {
        const existing = playerMap?.get(def.id);
        if (existing !== undefined) return snapshot(existing);
        return {
          achievementId: def.id,
          playerId,
          currentProgress: 0,
          targetProgress: def.targetProgress ?? 1,
          unlockedAt: null,
          isUnlocked: false,
        };
      });
    },

    drainUnlockQueue(playerId: string): ReadonlyArray<string> {
      const queue = unlockQueues.get(playerId) ?? [];
      unlockQueues.delete(playerId);
      return queue;
    },

    getTotalPoints(playerId: string): number {
      const playerMap = progressStore.get(playerId);
      if (playerMap === undefined) return 0;
      let total = 0;
      for (const [id, p] of playerMap) {
        if (p.isUnlocked) {
          const def = definitions.get(id);
          if (def !== undefined) total += def.points;
        }
      }
      return total;
    },

    listDefinitions(): ReadonlyArray<AchievementDefinition> {
      return [...definitions.values()];
    },
  };
}
