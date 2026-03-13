import { describe, it, expect } from 'vitest';
import {
  createAchievementEngine,
  type AchievementDefinition,
  type AchievementDeps,
  type AchievementStorePort,
  type CollectionStorePort,
  type CollectionCategory,
  type PlayerAchievement,
  type DynastyAchievement,
  type PlayerCollection,
  type AchievementReward,
} from '../achievement-engine.js';

function makeId() {
  let i = 0;
  return { next: () => `aid-${++i}` };
}

function makeClock(start = 1000n) {
  let now = start;
  return {
    now: () => now,
    tick(delta: bigint) {
      now += delta;
    },
  };
}

function makeAchievementStore() {
  const playerMap = new Map<string, PlayerAchievement[]>();
  const dynastyMap = new Map<string, DynastyAchievement[]>();

  const store: AchievementStorePort = {
    async getPlayerAchievements(playerId) {
      return playerMap.get(playerId) ?? [];
    },
    async savePlayerAchievement(achievement) {
      const list = playerMap.get(achievement.playerId) ?? [];
      const idx = list.findIndex(a => a.achievementId === achievement.achievementId);
      const next = [...list];
      if (idx >= 0) next[idx] = achievement;
      else next.push(achievement);
      playerMap.set(achievement.playerId, next);
    },
    async getDynastyAchievements(dynastyId) {
      return dynastyMap.get(dynastyId) ?? [];
    },
    async saveDynastyAchievement(achievement) {
      const list = dynastyMap.get(achievement.dynastyId) ?? [];
      const idx = list.findIndex(a => a.achievementId === achievement.achievementId);
      const next = [...list];
      if (idx >= 0) next[idx] = achievement;
      else next.push(achievement);
      dynastyMap.set(achievement.dynastyId, next);
    },
  };

  return { store };
}

function makeCollectionStore() {
  const byPlayer = new Map<string, PlayerCollection>();
  const store: CollectionStorePort = {
    async getCollection(playerId) {
      return byPlayer.get(playerId) ?? {
        playerId,
        entries: [],
        totalDiscovered: 0,
        completedCategories: [],
      };
    },
    async saveCollection(collection) {
      byPlayer.set(collection.playerId, collection);
    },
  };
  return { store };
}

function makeDeps() {
  const clock = makeClock();
  const remembered: Array<{ playerId: string; achievementId: string; title: string }> = [];
  const { store: achievements } = makeAchievementStore();
  const { store: collections } = makeCollectionStore();

  const deps: AchievementDeps = {
    clock,
    id: makeId(),
    log: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    events: {
      emit: () => {},
    },
    achievements,
    collections,
    remembrance: {
      async recordAchievement(playerId, achievementId, title) {
        remembered.push({ playerId, achievementId, title });
      },
    },
  };

  return { deps, clock, remembered };
}

function makeDef(overrides?: Partial<Omit<AchievementDefinition, 'achievementId'>>): Omit<AchievementDefinition, 'achievementId'> {
  const rewards: readonly AchievementReward[] = [
    {
      rewardType: 'title',
      rewardId: 'r-title',
      description: 'Founder',
      kalonAmount: undefined,
    },
  ];
  return {
    title: 'Scout First World',
    description: 'Discover your first world',
    category: 'exploration',
    rarity: 'rare',
    targetProgress: 10,
    rewards,
    seasonal: false,
    seasonId: undefined,
    expiresAt: undefined,
    dynastyLevel: false,
    hidden: false,
    ...overrides,
  };
}

describe('achievement-engine simulation', () => {
  it('defines achievement and retrieves definition', () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps);
    const def = engine.defineAchievement(makeDef());

    expect(def.achievementId.startsWith('aid-')).toBe(true);
    expect(engine.getDefinition(def.achievementId)?.title).toBe('Scout First World');
    expect(engine.getStats().achievementsDefined).toBe(1);
  });

  it('lists definitions by category', () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps);
    engine.defineAchievement(makeDef({ category: 'exploration' }));
    engine.defineAchievement(makeDef({ title: 'Trade Master', category: 'economic' }));

    expect(engine.listByCategory('exploration')).toHaveLength(1);
    expect(engine.listByCategory('economic')).toHaveLength(1);
  });

  it('throws when advancing unknown achievement', async () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps);
    await expect(engine.advanceProgress('p1', 'missing', 1)).rejects.toThrow('not found');
  });

  it('advances progress without completion', async () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps);
    const def = engine.defineAchievement(makeDef({ targetProgress: 5 }));

    const progress = await engine.advanceProgress('p1', def.achievementId, 2);
    expect(progress.progress).toBe(2);
    expect(progress.completed).toBe(false);
    expect(engine.getStats().achievementsUnlocked).toBe(0);
  });

  it('completes progress and records remembrance once', async () => {
    const { deps, remembered } = makeDeps();
    const engine = createAchievementEngine(deps);
    const def = engine.defineAchievement(makeDef({ targetProgress: 3 }));

    await engine.advanceProgress('p1', def.achievementId, 2);
    const done = await engine.advanceProgress('p1', def.achievementId, 5);
    expect(done.progress).toBe(3);
    expect(done.completed).toBe(true);
    expect(remembered).toHaveLength(1);
    expect(engine.getStats().achievementsUnlocked).toBe(1);
  });

  it('force unlocks achievement to target progress', async () => {
    const { deps, remembered } = makeDeps();
    const engine = createAchievementEngine(deps);
    const def = engine.defineAchievement(makeDef({ targetProgress: 7 }));

    const unlocked = await engine.unlockAchievement('p1', def.achievementId);
    expect(unlocked.completed).toBe(true);
    expect(unlocked.progress).toBe(7);
    expect(remembered).toHaveLength(1);
  });

  it('throws when force unlocking unknown achievement', async () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps);
    await expect(engine.unlockAchievement('p1', 'nope')).rejects.toThrow('not found');
  });

  it('tracks dynasty progress with unique contributors', async () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps);
    const def = engine.defineAchievement(makeDef({ dynastyLevel: true, targetProgress: 10 }));

    await engine.advanceDynastyProgress('d1', def.achievementId, 'p1', 3);
    const second = await engine.advanceDynastyProgress('d1', def.achievementId, 'p1', 3);
    expect(second.contributorIds).toEqual(['p1']);
    const third = await engine.advanceDynastyProgress('d1', def.achievementId, 'p2', 4);
    expect(third.completed).toBe(true);
    expect(third.contributorIds).toEqual(['p1', 'p2']);
    expect(engine.getStats().dynastyAchievementsCompleted).toBe(1);
  });

  it('discovers collection entries and tracks completed categories', async () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps);

    const first = await engine.discoverEntry('p1', 'rare-items', 'Crown', 'Ancient relic', 'epic', 'w1');
    const second = await engine.discoverEntry('p1', 'recipes', 'Stew', 'Warm meal', 'common', undefined);

    expect(first.entryId).not.toBe(second.entryId);
    const collection = await engine.getCollection('p1');
    expect(collection.totalDiscovered).toBe(2);
    expect(collection.completedCategories).toContain('rare-items');
    expect(collection.completedCategories).toContain('recipes');
    expect(engine.getStats().collectionsDiscovered).toBe(2);
  });

  it('respects max collection entries cap', async () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps, { maxCollectionEntries: 2 });

    const categories: readonly CollectionCategory[] = ['rare-items', 'recipes', 'world-discoveries'];
    for (const category of categories) {
      await engine.discoverEntry('p1', category, category, 'desc', 'common', undefined);
    }

    const collection = await engine.getCollection('p1');
    expect(collection.totalDiscovered).toBe(2);
  });

  it('builds showcase totals and completion percentage', async () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps);
    const a = engine.defineAchievement(makeDef({ rarity: 'common', targetProgress: 1 }));
    const b = engine.defineAchievement(makeDef({ title: 'Lore Keeper', rarity: 'legendary', targetProgress: 1, category: 'lore' }));

    await engine.unlockAchievement('p1', a.achievementId);
    await engine.unlockAchievement('p1', b.achievementId);

    const showcase = await engine.getShowcase('p1');
    expect(showcase.totalPoints).toBe(105);
    expect(showcase.completionPercentage).toBe(100);
  });

  it('updates showcase with slot clamp and showcased flags', async () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps, { maxShowcaseSlots: 2 });
    const defs = [
      engine.defineAchievement(makeDef({ targetProgress: 1, title: 'A' })),
      engine.defineAchievement(makeDef({ targetProgress: 1, title: 'B' })),
      engine.defineAchievement(makeDef({ targetProgress: 1, title: 'C' })),
    ];

    for (const def of defs) {
      await engine.unlockAchievement('p1', def.achievementId);
    }

    const updated = await engine.updateShowcase('p1', defs.map(d => d.achievementId));
    expect(updated.displayedAchievements).toHaveLength(2);
    expect(engine.getStats().showcasesCreated).toBe(1);
  });

  it('creates seasonal challenge and counts it in stats', () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps);
    const challenge = engine.createSeasonalChallenge(
      'season-1',
      'Spring Rush',
      ['a1', 'a2'],
      [
        {
          rewardType: 'emblem',
          rewardId: 'spring-emblem',
          description: 'Seasonal emblem',
          kalonAmount: undefined,
        },
      ],
      1000n,
      2000n,
    );
    expect(challenge.challengeId.startsWith('aid-')).toBe(true);
    expect(engine.getStats().seasonalChallengesActive).toBe(1);
  });

  it('returns player achievements from store', async () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps);
    const def = engine.defineAchievement(makeDef({ targetProgress: 1 }));
    await engine.unlockAchievement('p1', def.achievementId);
    const list = await engine.getPlayerAchievements('p1');
    expect(list).toHaveLength(1);
    expect(list[0]?.achievementId).toBe(def.achievementId);
  });

  it('stats reflect remembrance recording count', async () => {
    const { deps } = makeDeps();
    const engine = createAchievementEngine(deps);
    const def = engine.defineAchievement(makeDef({ targetProgress: 1 }));
    await engine.unlockAchievement('p1', def.achievementId);
    expect(engine.getStats().remembrancesRecorded).toBe(1);
  });
});
