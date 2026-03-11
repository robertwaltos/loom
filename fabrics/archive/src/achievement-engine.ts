/**
 * Achievement & Collection Engine — Progress tracking, rewards, collections.
 *
 *   - Achievement framework: progress, unlock notifications, reward distribution
 *   - Categories: exploration, economic, social, combat, governance, lore
 *   - Cosmetic rewards: visual effects, titles, estate decorations
 *   - Collection system: rare items, NPC relationships, world discoveries
 *   - Seasonal achievements: time-limited challenges, exclusive rewards
 *   - Dynasty achievements: collaborative milestones
 *   - Achievement showcase: player profile display
 *   - Remembrance integration: permanent historical records
 *
 * "Every deed is woven into the Remembrance."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface AchievementClockPort {
  readonly now: () => bigint;
}

export interface AchievementIdPort {
  readonly next: () => string;
}

export interface AchievementLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface AchievementEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface AchievementStorePort {
  readonly getPlayerAchievements: (playerId: string) => Promise<readonly PlayerAchievement[]>;
  readonly savePlayerAchievement: (achievement: PlayerAchievement) => Promise<void>;
  readonly getDynastyAchievements: (dynastyId: string) => Promise<readonly DynastyAchievement[]>;
  readonly saveDynastyAchievement: (achievement: DynastyAchievement) => Promise<void>;
}

export interface CollectionStorePort {
  readonly getCollection: (playerId: string) => Promise<PlayerCollection>;
  readonly saveCollection: (collection: PlayerCollection) => Promise<void>;
}

export interface RemembrancePort {
  readonly recordAchievement: (playerId: string, achievementId: string, title: string) => Promise<void>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type AchievementCategory = 'exploration' | 'economic' | 'social' | 'combat' | 'governance' | 'lore';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type RewardType = 'title' | 'cosmetic-effect' | 'estate-decoration' | 'emblem' | 'nameplate' | 'kalon';

export type CollectionCategory = 'rare-items' | 'npc-relationships' | 'world-discoveries' | 'recipes' | 'lore-fragments' | 'mounts';

export interface AchievementDefinition {
  readonly achievementId: string;
  readonly title: string;
  readonly description: string;
  readonly category: AchievementCategory;
  readonly rarity: AchievementRarity;
  readonly targetProgress: number;
  readonly rewards: readonly AchievementReward[];
  readonly seasonal: boolean;
  readonly seasonId: string | undefined;
  readonly expiresAt: bigint | undefined;
  readonly dynastyLevel: boolean;
  readonly hidden: boolean;
}

export interface AchievementReward {
  readonly rewardType: RewardType;
  readonly rewardId: string;
  readonly description: string;
  readonly kalonAmount: number | undefined;
}

export interface PlayerAchievement {
  readonly playerId: string;
  readonly achievementId: string;
  readonly progress: number;
  readonly targetProgress: number;
  readonly completed: boolean;
  readonly unlockedAt: bigint | undefined;
  readonly notified: boolean;
  readonly showcased: boolean;
}

export interface DynastyAchievement {
  readonly dynastyId: string;
  readonly achievementId: string;
  readonly contributorIds: readonly string[];
  readonly progress: number;
  readonly targetProgress: number;
  readonly completed: boolean;
  readonly unlockedAt: bigint | undefined;
}

export interface PlayerCollection {
  readonly playerId: string;
  readonly entries: readonly CollectionEntry[];
  readonly totalDiscovered: number;
  readonly completedCategories: readonly CollectionCategory[];
}

export interface CollectionEntry {
  readonly entryId: string;
  readonly category: CollectionCategory;
  readonly name: string;
  readonly description: string;
  readonly rarity: AchievementRarity;
  readonly discoveredAt: bigint;
  readonly worldId: string | undefined;
}

export interface AchievementShowcase {
  readonly playerId: string;
  readonly displayedAchievements: readonly string[];
  readonly title: string | undefined;
  readonly totalPoints: number;
  readonly completionPercentage: number;
}

export interface SeasonalChallenge {
  readonly challengeId: string;
  readonly seasonId: string;
  readonly title: string;
  readonly achievements: readonly string[];
  readonly exclusiveRewards: readonly AchievementReward[];
  readonly startsAt: bigint;
  readonly endsAt: bigint;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface AchievementConfig {
  readonly maxShowcaseSlots: number;
  readonly pointsPerRarity: Readonly<Record<AchievementRarity, number>>;
  readonly maxCollectionEntries: number;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface AchievementStats {
  readonly achievementsDefined: number;
  readonly achievementsUnlocked: number;
  readonly collectionsDiscovered: number;
  readonly dynastyAchievementsCompleted: number;
  readonly seasonalChallengesActive: number;
  readonly showcasesCreated: number;
  readonly remembrancesRecorded: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface AchievementEngine {
  // Definitions
  readonly defineAchievement: (def: Omit<AchievementDefinition, 'achievementId'>) => AchievementDefinition;
  readonly getDefinition: (achievementId: string) => AchievementDefinition | undefined;
  readonly listByCategory: (category: AchievementCategory) => readonly AchievementDefinition[];

  // Player progress
  readonly advanceProgress: (playerId: string, achievementId: string, delta: number) => Promise<PlayerAchievement>;
  readonly getPlayerAchievements: (playerId: string) => Promise<readonly PlayerAchievement[]>;
  readonly unlockAchievement: (playerId: string, achievementId: string) => Promise<PlayerAchievement>;

  // Dynasty
  readonly advanceDynastyProgress: (dynastyId: string, achievementId: string, contributorId: string, delta: number) => Promise<DynastyAchievement>;

  // Collections
  readonly discoverEntry: (playerId: string, category: CollectionCategory, name: string, description: string, rarity: AchievementRarity, worldId: string | undefined) => Promise<CollectionEntry>;
  readonly getCollection: (playerId: string) => Promise<PlayerCollection>;

  // Showcase
  readonly getShowcase: (playerId: string) => Promise<AchievementShowcase>;
  readonly updateShowcase: (playerId: string, achievementIds: readonly string[]) => Promise<AchievementShowcase>;

  // Seasonal
  readonly createSeasonalChallenge: (seasonId: string, title: string, achievementIds: readonly string[], rewards: readonly AchievementReward[], startsAt: bigint, endsAt: bigint) => SeasonalChallenge;

  readonly getStats: () => AchievementStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface AchievementDeps {
  readonly clock: AchievementClockPort;
  readonly id: AchievementIdPort;
  readonly log: AchievementLogPort;
  readonly events: AchievementEventPort;
  readonly achievements: AchievementStorePort;
  readonly collections: CollectionStorePort;
  readonly remembrance: RemembrancePort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: AchievementConfig = {
  maxShowcaseSlots: 6,
  pointsPerRarity: { common: 5, uncommon: 10, rare: 25, epic: 50, legendary: 100 },
  maxCollectionEntries: 5000,
};

// ─── Factory ────────────────────────────────────────────────────────

export function createAchievementEngine(
  deps: AchievementDeps,
  config: Partial<AchievementConfig> = {},
): AchievementEngine {
  const cfg: AchievementConfig = { ...DEFAULT_CONFIG, ...config };

  const definitions = new Map<string, AchievementDefinition>();
  const seasonalChallenges = new Map<string, SeasonalChallenge>();

  let achievementsUnlocked = 0;
  let collectionsDiscovered = 0;
  let dynastyAchievementsCompleted = 0;
  let showcasesCreated = 0;
  let remembrancesRecorded = 0;

  function defineAchievement(def: Omit<AchievementDefinition, 'achievementId'>): AchievementDefinition {
    const full: AchievementDefinition = { ...def, achievementId: deps.id.next() };
    definitions.set(full.achievementId, full);
    deps.log.info('achievement-defined', { achievementId: full.achievementId, title: full.title, category: full.category });
    return full;
  }

  function getDefinition(achievementId: string): AchievementDefinition | undefined {
    return definitions.get(achievementId);
  }

  function listByCategory(category: AchievementCategory): readonly AchievementDefinition[] {
    return [...definitions.values()].filter(d => d.category === category);
  }

  async function advanceProgress(
    playerId: string,
    achievementId: string,
    delta: number,
  ): Promise<PlayerAchievement> {
    const def = definitions.get(achievementId);
    if (def === undefined) throw new Error(`Achievement ${achievementId} not found`);

    const existing = (await deps.achievements.getPlayerAchievements(playerId))
      .find(a => a.achievementId === achievementId);

    const currentProgress = existing?.progress ?? 0;
    const newProgress = Math.min(def.targetProgress, currentProgress + delta);
    const completed = newProgress >= def.targetProgress;

    const achievement: PlayerAchievement = {
      playerId,
      achievementId,
      progress: newProgress,
      targetProgress: def.targetProgress,
      completed,
      unlockedAt: completed && existing?.unlockedAt === undefined ? deps.clock.now() : (existing?.unlockedAt ?? undefined),
      notified: false,
      showcased: existing?.showcased ?? false,
    };

    await deps.achievements.savePlayerAchievement(achievement);

    if (completed && (existing === undefined || !existing.completed)) {
      achievementsUnlocked++;
      await deps.remembrance.recordAchievement(playerId, achievementId, def.title);
      remembrancesRecorded++;
      deps.log.info('achievement-unlocked', { playerId, achievementId, title: def.title });
    }

    return achievement;
  }

  async function getPlayerAchievements(playerId: string): Promise<readonly PlayerAchievement[]> {
    return deps.achievements.getPlayerAchievements(playerId);
  }

  async function unlockAchievement(playerId: string, achievementId: string): Promise<PlayerAchievement> {
    const def = definitions.get(achievementId);
    if (def === undefined) throw new Error(`Achievement ${achievementId} not found`);

    const achievement: PlayerAchievement = {
      playerId,
      achievementId,
      progress: def.targetProgress,
      targetProgress: def.targetProgress,
      completed: true,
      unlockedAt: deps.clock.now(),
      notified: false,
      showcased: false,
    };

    await deps.achievements.savePlayerAchievement(achievement);
    await deps.remembrance.recordAchievement(playerId, achievementId, def.title);
    achievementsUnlocked++;
    remembrancesRecorded++;
    deps.log.info('achievement-force-unlocked', { playerId, achievementId });
    return achievement;
  }

  async function advanceDynastyProgress(
    dynastyId: string,
    achievementId: string,
    contributorId: string,
    delta: number,
  ): Promise<DynastyAchievement> {
    const def = definitions.get(achievementId);
    if (def === undefined) throw new Error(`Achievement ${achievementId} not found`);

    const existing = (await deps.achievements.getDynastyAchievements(dynastyId))
      .find(a => a.achievementId === achievementId);

    const currentProgress = existing?.progress ?? 0;
    const contributors = existing?.contributorIds ?? [];
    const newProgress = Math.min(def.targetProgress, currentProgress + delta);
    const completed = newProgress >= def.targetProgress;

    const achievement: DynastyAchievement = {
      dynastyId,
      achievementId,
      contributorIds: contributors.includes(contributorId) ? contributors : [...contributors, contributorId],
      progress: newProgress,
      targetProgress: def.targetProgress,
      completed,
      unlockedAt: completed && existing?.unlockedAt === undefined ? deps.clock.now() : (existing?.unlockedAt ?? undefined),
    };

    await deps.achievements.saveDynastyAchievement(achievement);
    if (completed && (existing === undefined || !existing.completed)) {
      dynastyAchievementsCompleted++;
      deps.log.info('dynasty-achievement-unlocked', { dynastyId, achievementId });
    }
    return achievement;
  }

  async function discoverEntry(
    playerId: string,
    category: CollectionCategory,
    name: string,
    description: string,
    rarity: AchievementRarity,
    worldId: string | undefined,
  ): Promise<CollectionEntry> {
    const collection = await deps.collections.getCollection(playerId);

    const entry: CollectionEntry = {
      entryId: deps.id.next(),
      category,
      name,
      description,
      rarity,
      discoveredAt: deps.clock.now(),
      worldId,
    };

    const entries = [...collection.entries, entry].slice(0, cfg.maxCollectionEntries);
    const categories = new Set(entries.map(e => e.category));

    const updated: PlayerCollection = {
      playerId,
      entries,
      totalDiscovered: entries.length,
      completedCategories: [...categories] as readonly CollectionCategory[],
    };

    await deps.collections.saveCollection(updated);
    collectionsDiscovered++;
    deps.log.info('collection-discovered', { playerId, category, name, rarity });
    return entry;
  }

  async function getCollection(playerId: string): Promise<PlayerCollection> {
    return deps.collections.getCollection(playerId);
  }

  async function getShowcase(playerId: string): Promise<AchievementShowcase> {
    const playerAchievements = await deps.achievements.getPlayerAchievements(playerId);
    const completed = playerAchievements.filter(a => a.completed);
    const showcased = completed.filter(a => a.showcased);

    let totalPoints = 0;
    for (const a of completed) {
      const def = definitions.get(a.achievementId);
      if (def !== undefined) {
        totalPoints += cfg.pointsPerRarity[def.rarity];
      }
    }

    const allDefined = definitions.size;
    const percentage = allDefined > 0 ? (completed.length / allDefined) * 100 : 0;

    return {
      playerId,
      displayedAchievements: showcased.map(a => a.achievementId),
      title: undefined,
      totalPoints,
      completionPercentage: Math.round(percentage * 10) / 10,
    };
  }

  async function updateShowcase(
    playerId: string,
    achievementIds: readonly string[],
  ): Promise<AchievementShowcase> {
    const clamped = achievementIds.slice(0, cfg.maxShowcaseSlots);
    const playerAchievements = await deps.achievements.getPlayerAchievements(playerId);

    for (const a of playerAchievements) {
      const shouldShowcase = clamped.includes(a.achievementId);
      if (a.showcased !== shouldShowcase) {
        await deps.achievements.savePlayerAchievement({ ...a, showcased: shouldShowcase });
      }
    }

    showcasesCreated++;
    deps.log.info('showcase-updated', { playerId, displayed: clamped.length });
    return getShowcase(playerId);
  }

  function createSeasonalChallenge(
    seasonId: string,
    title: string,
    achievementIds: readonly string[],
    rewards: readonly AchievementReward[],
    startsAt: bigint,
    endsAt: bigint,
  ): SeasonalChallenge {
    const challenge: SeasonalChallenge = {
      challengeId: deps.id.next(),
      seasonId,
      title,
      achievements: achievementIds,
      exclusiveRewards: rewards,
      startsAt,
      endsAt,
    };

    seasonalChallenges.set(challenge.challengeId, challenge);
    deps.log.info('seasonal-challenge-created', { challengeId: challenge.challengeId, seasonId, title });
    return challenge;
  }

  function getStats(): AchievementStats {
    return {
      achievementsDefined: definitions.size,
      achievementsUnlocked,
      collectionsDiscovered,
      dynastyAchievementsCompleted,
      seasonalChallengesActive: seasonalChallenges.size,
      showcasesCreated,
      remembrancesRecorded,
    };
  }

  deps.log.info('achievement-engine-created', {
    maxShowcase: cfg.maxShowcaseSlots,
    maxCollection: cfg.maxCollectionEntries,
  });

  return {
    defineAchievement,
    getDefinition,
    listByCategory,
    advanceProgress,
    getPlayerAchievements,
    unlockAchievement,
    advanceDynastyProgress,
    discoverEntry,
    getCollection,
    getShowcase,
    updateShowcase,
    createSeasonalChallenge,
    getStats,
  };
}
