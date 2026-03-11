import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAchievementEngine,
  TIER_REWARD_MULTIPLIERS,
  ALL_CATEGORIES,
  ALL_TIERS,
} from '../achievement-engine.js';
import type {
  AchievementEngineDeps,
  AchievementEvent,
  AchievementDefinition,
  AchievementCategory,
  AchievementTier,
  AchievementEngine,
} from '../achievement-engine.js';

function makeDeps(): AchievementEngineDeps & { readonly events: AchievementEvent[] } {
  let time = 1_000_000;
  let idCounter = 0;
  const events: AchievementEvent[] = [];
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: {
      generate: () => {
        idCounter++;
        return 'ach-' + String(idCounter);
      },
    },
    notifications: {
      notify: (_dynastyId, event) => {
        events.push(event);
      },
    },
    events,
  };
}

function makeDef(overrides?: Partial<AchievementDefinition>): AchievementDefinition {
  return {
    id: 'ach-explore-1',
    name: 'First Steps',
    description: 'Explore your first world',
    category: 'exploration',
    tier: 'bronze',
    criteriaThreshold: 10,
    rewardMicroKalon: 1000n,
    prerequisiteId: null,
    ...overrides,
  };
}

let engine: AchievementEngine;
let deps: AchievementEngineDeps & { readonly events: AchievementEvent[] };

beforeEach(() => {
  deps = makeDeps();
  engine = createAchievementEngine(deps);
});

describe('AchievementEngine -- definitions', () => {
  it('defines and retrieves an achievement', () => {
    const def = makeDef();
    engine.defineAchievement(def);
    const fetched = engine.getDefinition('ach-explore-1');
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('First Steps');
  });

  it('returns undefined for unknown achievement', () => {
    expect(engine.getDefinition('nonexistent')).toBeUndefined();
  });

  it('rejects zero criteria threshold', () => {
    expect(() => engine.defineAchievement(makeDef({ criteriaThreshold: 0 }))).toThrow(
      'threshold must be positive',
    );
  });

  it('rejects negative criteria threshold', () => {
    expect(() => engine.defineAchievement(makeDef({ criteriaThreshold: -5 }))).toThrow(
      'threshold must be positive',
    );
  });

  it('rejects negative reward', () => {
    expect(() => engine.defineAchievement(makeDef({ rewardMicroKalon: -1n }))).toThrow(
      'non-negative',
    );
  });

  it('lists achievements by category', () => {
    engine.defineAchievement(makeDef({ id: 'a1', category: 'exploration' }));
    engine.defineAchievement(makeDef({ id: 'a2', category: 'exploration' }));
    engine.defineAchievement(makeDef({ id: 'a3', category: 'combat' }));
    const explore = engine.listByCategory('exploration');
    expect(explore).toHaveLength(2);
    const combat = engine.listByCategory('combat');
    expect(combat).toHaveLength(1);
  });

  it('lists achievements by tier', () => {
    engine.defineAchievement(makeDef({ id: 'a1', tier: 'bronze' }));
    engine.defineAchievement(makeDef({ id: 'a2', tier: 'gold' }));
    engine.defineAchievement(makeDef({ id: 'a3', tier: 'gold' }));
    expect(engine.listByTier('gold')).toHaveLength(2);
    expect(engine.listByTier('bronze')).toHaveLength(1);
    expect(engine.listByTier('platinum')).toHaveLength(0);
  });
});

describe('AchievementEngine -- progress tracking', () => {
  it('increments progress towards achievement', () => {
    engine.defineAchievement(makeDef());
    const progress = engine.incrementProgress('d1', 'ach-explore-1', 3);
    expect(progress.currentProgress).toBe(3);
    expect(progress.unlocked).toBe(false);
  });

  it('unlocks achievement when threshold reached', () => {
    engine.defineAchievement(makeDef({ criteriaThreshold: 5 }));
    engine.incrementProgress('d1', 'ach-explore-1', 3);
    const progress = engine.incrementProgress('d1', 'ach-explore-1', 2);
    expect(progress.unlocked).toBe(true);
    expect(progress.unlockedAt).toBeGreaterThan(0);
  });

  it('caps progress at threshold', () => {
    engine.defineAchievement(makeDef({ criteriaThreshold: 5 }));
    const progress = engine.incrementProgress('d1', 'ach-explore-1', 100);
    expect(progress.currentProgress).toBe(5);
    expect(progress.unlocked).toBe(true);
  });

  it('does not change progress after unlock', () => {
    engine.defineAchievement(makeDef({ criteriaThreshold: 5 }));
    engine.incrementProgress('d1', 'ach-explore-1', 5);
    const progress = engine.incrementProgress('d1', 'ach-explore-1', 10);
    expect(progress.currentProgress).toBe(5);
  });

  it('sets progress directly', () => {
    engine.defineAchievement(makeDef({ criteriaThreshold: 10 }));
    const progress = engine.setProgress('d1', 'ach-explore-1', 7);
    expect(progress.currentProgress).toBe(7);
    expect(progress.unlocked).toBe(false);
  });

  it('sets progress and unlocks', () => {
    engine.defineAchievement(makeDef({ criteriaThreshold: 10 }));
    const progress = engine.setProgress('d1', 'ach-explore-1', 10);
    expect(progress.unlocked).toBe(true);
  });

  it('rejects negative increment', () => {
    engine.defineAchievement(makeDef());
    expect(() => engine.incrementProgress('d1', 'ach-explore-1', -1)).toThrow('must be positive');
  });

  it('rejects negative set value', () => {
    engine.defineAchievement(makeDef());
    expect(() => engine.setProgress('d1', 'ach-explore-1', -1)).toThrow('non-negative');
  });

  it('throws for unknown achievement on increment', () => {
    expect(() => engine.incrementProgress('d1', 'missing', 1)).toThrow('not found');
  });

  it('retrieves progress for a dynasty', () => {
    engine.defineAchievement(makeDef());
    engine.incrementProgress('d1', 'ach-explore-1', 3);
    const progress = engine.getProgress('d1', 'ach-explore-1');
    expect(progress).toBeDefined();
    expect(progress?.currentProgress).toBe(3);
  });

  it('returns undefined for untracked progress', () => {
    expect(engine.getProgress('d1', 'missing')).toBeUndefined();
  });
});

describe('AchievementEngine -- prerequisites', () => {
  it('allows progress when prerequisite is unlocked', () => {
    engine.defineAchievement(makeDef({ id: 'prereq', criteriaThreshold: 1 }));
    engine.defineAchievement(makeDef({ id: 'dependent', prerequisiteId: 'prereq' }));
    engine.incrementProgress('d1', 'prereq', 1);
    const progress = engine.incrementProgress('d1', 'dependent', 1);
    expect(progress.currentProgress).toBe(1);
  });

  it('throws when prerequisite not unlocked', () => {
    engine.defineAchievement(makeDef({ id: 'prereq', criteriaThreshold: 10 }));
    engine.defineAchievement(makeDef({ id: 'dependent', prerequisiteId: 'prereq' }));
    expect(() => engine.incrementProgress('d1', 'dependent', 1)).toThrow(
      'Prerequisite prereq not unlocked',
    );
  });
});

describe('AchievementEngine -- rewards', () => {
  it('claims reward for unlocked achievement', () => {
    engine.defineAchievement(makeDef({ rewardMicroKalon: 5000n, criteriaThreshold: 1 }));
    engine.incrementProgress('d1', 'ach-explore-1', 1);
    const reward = engine.claimReward('d1', 'ach-explore-1');
    expect(reward).toBe(5000n);
  });

  it('rejects double claim', () => {
    engine.defineAchievement(makeDef({ criteriaThreshold: 1 }));
    engine.incrementProgress('d1', 'ach-explore-1', 1);
    engine.claimReward('d1', 'ach-explore-1');
    expect(() => engine.claimReward('d1', 'ach-explore-1')).toThrow('already claimed');
  });

  it('rejects claim for locked achievement', () => {
    engine.defineAchievement(makeDef({ criteriaThreshold: 100 }));
    engine.incrementProgress('d1', 'ach-explore-1', 1);
    expect(() => engine.claimReward('d1', 'ach-explore-1')).toThrow('not unlocked');
  });
});

describe('AchievementEngine -- notifications', () => {
  it('emits ACHIEVEMENT_UNLOCKED on unlock', () => {
    engine.defineAchievement(makeDef({ criteriaThreshold: 1 }));
    engine.incrementProgress('d1', 'ach-explore-1', 1);
    const unlockEvents = deps.events.filter((e) => e.kind === 'ACHIEVEMENT_UNLOCKED');
    expect(unlockEvents).toHaveLength(1);
    expect(unlockEvents[0]?.dynastyId).toBe('d1');
  });

  it('emits PROGRESS_UPDATED on partial progress', () => {
    engine.defineAchievement(makeDef({ criteriaThreshold: 10 }));
    engine.incrementProgress('d1', 'ach-explore-1', 3);
    const progressEvents = deps.events.filter((e) => e.kind === 'PROGRESS_UPDATED');
    expect(progressEvents).toHaveLength(1);
  });

  it('emits REWARD_GRANTED on claim', () => {
    engine.defineAchievement(makeDef({ criteriaThreshold: 1 }));
    engine.incrementProgress('d1', 'ach-explore-1', 1);
    engine.claimReward('d1', 'ach-explore-1');
    const rewardEvents = deps.events.filter((e) => e.kind === 'REWARD_GRANTED');
    expect(rewardEvents).toHaveLength(1);
  });
});

describe('AchievementEngine -- queries', () => {
  it('lists unlocked achievements for a dynasty', () => {
    engine.defineAchievement(makeDef({ id: 'a1', criteriaThreshold: 1 }));
    engine.defineAchievement(makeDef({ id: 'a2', criteriaThreshold: 100 }));
    engine.incrementProgress('d1', 'a1', 1);
    engine.incrementProgress('d1', 'a2', 5);
    const unlocked = engine.listUnlocked('d1');
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0]?.achievementId).toBe('a1');
  });

  it('lists in-progress achievements for a dynasty', () => {
    engine.defineAchievement(makeDef({ id: 'a1', criteriaThreshold: 1 }));
    engine.defineAchievement(makeDef({ id: 'a2', criteriaThreshold: 100 }));
    engine.incrementProgress('d1', 'a1', 1);
    engine.incrementProgress('d1', 'a2', 5);
    const inProgress = engine.listInProgress('d1');
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0]?.achievementId).toBe('a2');
  });

  it('returns empty arrays for unknown dynasty', () => {
    expect(engine.listUnlocked('unknown')).toHaveLength(0);
    expect(engine.listInProgress('unknown')).toHaveLength(0);
  });

  it('computes dynasty summary', () => {
    engine.defineAchievement(
      makeDef({
        id: 'a1',
        category: 'exploration',
        tier: 'bronze',
        criteriaThreshold: 1,
        rewardMicroKalon: 100n,
      }),
    );
    engine.defineAchievement(
      makeDef({
        id: 'a2',
        category: 'combat',
        tier: 'gold',
        criteriaThreshold: 1,
        rewardMicroKalon: 200n,
      }),
    );
    engine.incrementProgress('d1', 'a1', 1);
    engine.incrementProgress('d1', 'a2', 1);
    engine.claimReward('d1', 'a1');
    const summary = engine.getDynastySummary('d1');
    expect(summary.totalUnlocked).toBe(2);
    expect(summary.totalProgress).toBe(2);
    expect(summary.totalRewardsClaimed).toBe(100n);
    expect(summary.unlockedByCategory.exploration).toBe(1);
    expect(summary.unlockedByCategory.combat).toBe(1);
    expect(summary.unlockedByTier.bronze).toBe(1);
    expect(summary.unlockedByTier.gold).toBe(1);
  });

  it('returns zeroed summary for unknown dynasty', () => {
    const summary = engine.getDynastySummary('unknown');
    expect(summary.totalUnlocked).toBe(0);
    expect(summary.totalRewardsClaimed).toBe(0n);
  });
});

describe('AchievementEngine -- stats', () => {
  it('starts with zero stats', () => {
    const stats = engine.getStats();
    expect(stats.totalDefinitions).toBe(0);
    expect(stats.totalTrackedDynasties).toBe(0);
    expect(stats.totalUnlocks).toBe(0);
    expect(stats.totalRewardsDistributed).toBe(0n);
  });

  it('tracks aggregate statistics', () => {
    engine.defineAchievement(makeDef({ id: 'a1', criteriaThreshold: 1, rewardMicroKalon: 500n }));
    engine.defineAchievement(makeDef({ id: 'a2', criteriaThreshold: 1, rewardMicroKalon: 300n }));
    engine.incrementProgress('d1', 'a1', 1);
    engine.incrementProgress('d2', 'a2', 1);
    engine.claimReward('d1', 'a1');
    engine.claimReward('d2', 'a2');
    const stats = engine.getStats();
    expect(stats.totalDefinitions).toBe(2);
    expect(stats.totalTrackedDynasties).toBe(2);
    expect(stats.totalUnlocks).toBe(2);
    expect(stats.totalRewardsDistributed).toBe(800n);
  });
});

describe('AchievementEngine -- constants', () => {
  it('exports tier reward multipliers', () => {
    expect(TIER_REWARD_MULTIPLIERS.bronze).toBe(1);
    expect(TIER_REWARD_MULTIPLIERS.silver).toBe(2);
    expect(TIER_REWARD_MULTIPLIERS.gold).toBe(4);
    expect(TIER_REWARD_MULTIPLIERS.platinum).toBe(10);
  });

  it('exports all categories', () => {
    expect(ALL_CATEGORIES).toHaveLength(5);
    expect(ALL_CATEGORIES).toContain('exploration');
    expect(ALL_CATEGORIES).toContain('social');
  });

  it('exports all tiers', () => {
    expect(ALL_TIERS).toHaveLength(4);
    expect(ALL_TIERS).toContain('platinum');
  });
});
