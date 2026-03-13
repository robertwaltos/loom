import { beforeEach, describe, expect, it } from 'vitest';
import { createAchievementEngine, type AchievementDefinition, type AchievementEngineDeps } from '../achievement-engine.js';

describe('achievement-engine simulation', () => {
  let nowUs: number;
  let generated: number;
  let events: Array<{ kind: string; achievementId: string; dynastyId: string; timestamp: number }>;

  const deps = (): AchievementEngineDeps => ({
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: {
      generate: () => {
        generated += 1;
        return `sim-ach-${generated}`;
      },
    },
    notifications: {
      notify: (_dynastyId, event) => {
        events.push(event);
      },
    },
  });

  const def = (overrides: Partial<AchievementDefinition>): AchievementDefinition => ({
    id: 'ach-base',
    name: 'Base Achievement',
    description: 'Base description',
    category: 'exploration',
    tier: 'bronze',
    criteriaThreshold: 5,
    rewardMicroKalon: 100n,
    prerequisiteId: null,
    ...overrides,
  });

  beforeEach(() => {
    nowUs = 1_000_000;
    generated = 0;
    events = [];
  });

  it('runs multi-dynasty progression with independent unlock state', () => {
    const engine = createAchievementEngine(deps());

    engine.defineAchievement(def({ id: 'explore-1', criteriaThreshold: 3, rewardMicroKalon: 250n }));

    engine.incrementProgress('dawn', 'explore-1', 1);
    engine.incrementProgress('ember', 'explore-1', 3);
    engine.incrementProgress('dawn', 'explore-1', 2);

    const dawn = engine.getProgress('dawn', 'explore-1');
    const ember = engine.getProgress('ember', 'explore-1');

    expect(dawn?.unlocked).toBe(true);
    expect(ember?.unlocked).toBe(true);
    expect(engine.getStats().totalUnlocks).toBe(2);
  });

  it('enforces prerequisite chains before allowing dependent progress', () => {
    const engine = createAchievementEngine(deps());

    engine.defineAchievement(def({ id: 'scout-1', criteriaThreshold: 1 }));
    engine.defineAchievement(def({ id: 'scout-2', prerequisiteId: 'scout-1', criteriaThreshold: 2 }));

    expect(() => engine.incrementProgress('frost', 'scout-2', 1)).toThrow(
      'Prerequisite scout-1 not unlocked',
    );

    engine.incrementProgress('frost', 'scout-1', 1);
    const unlockedDependent = engine.incrementProgress('frost', 'scout-2', 2);
    expect(unlockedDependent.unlocked).toBe(true);
  });

  it('caps progress at threshold and remains stable after unlock', () => {
    const engine = createAchievementEngine(deps());

    engine.defineAchievement(def({ id: 'craft-1', criteriaThreshold: 4 }));

    const unlocked = engine.incrementProgress('jade', 'craft-1', 10);
    const unchanged = engine.incrementProgress('jade', 'craft-1', 1);

    expect(unlocked.currentProgress).toBe(4);
    expect(unchanged.currentProgress).toBe(4);
    expect(unchanged.unlocked).toBe(true);
  });

  it('tracks reward distribution totals across dynasties', () => {
    const engine = createAchievementEngine(deps());

    engine.defineAchievement(def({ id: 'gov-1', category: 'governance', rewardMicroKalon: 700n, criteriaThreshold: 1 }));
    engine.defineAchievement(def({ id: 'combat-1', category: 'combat', rewardMicroKalon: 900n, criteriaThreshold: 1 }));

    engine.incrementProgress('atlas', 'gov-1', 1);
    engine.incrementProgress('briar', 'combat-1', 1);

    expect(engine.claimReward('atlas', 'gov-1')).toBe(700n);
    expect(engine.claimReward('briar', 'combat-1')).toBe(900n);

    const stats = engine.getStats();
    expect(stats.totalRewardsDistributed).toBe(1600n);
    expect(stats.totalTrackedDynasties).toBe(2);
  });

  it('prevents duplicate reward claims and leaves aggregate total unchanged', () => {
    const engine = createAchievementEngine(deps());

    engine.defineAchievement(def({ id: 'social-1', category: 'social', rewardMicroKalon: 300n, criteriaThreshold: 1 }));
    engine.incrementProgress('lumen', 'social-1', 1);
    engine.claimReward('lumen', 'social-1');

    const before = engine.getStats().totalRewardsDistributed;
    expect(() => engine.claimReward('lumen', 'social-1')).toThrow('Reward already claimed for social-1');
    expect(engine.getStats().totalRewardsDistributed).toBe(before);
  });

  it('builds dynasty summary with unlocked counts by category and tier', () => {
    const engine = createAchievementEngine(deps());

    engine.defineAchievement(def({ id: 'exp-gold', category: 'exploration', tier: 'gold', criteriaThreshold: 1, rewardMicroKalon: 111n }));
    engine.defineAchievement(def({ id: 'combat-silver', category: 'combat', tier: 'silver', criteriaThreshold: 1, rewardMicroKalon: 222n }));
    engine.defineAchievement(def({ id: 'craft-bronze', category: 'crafting', tier: 'bronze', criteriaThreshold: 5, rewardMicroKalon: 333n }));

    engine.incrementProgress('nova', 'exp-gold', 1);
    engine.incrementProgress('nova', 'combat-silver', 1);
    engine.incrementProgress('nova', 'craft-bronze', 2);
    engine.claimReward('nova', 'exp-gold');

    const summary = engine.getDynastySummary('nova');
    expect(summary.totalUnlocked).toBe(2);
    expect(summary.totalProgress).toBe(3);
    expect(summary.totalRewardsClaimed).toBe(111n);
    expect(summary.unlockedByCategory.exploration).toBe(1);
    expect(summary.unlockedByCategory.combat).toBe(1);
    expect(summary.unlockedByTier.gold).toBe(1);
    expect(summary.unlockedByTier.silver).toBe(1);
  });

  it('separates unlocked and in-progress lists for active dynasty', () => {
    const engine = createAchievementEngine(deps());

    engine.defineAchievement(def({ id: 'one', criteriaThreshold: 1 }));
    engine.defineAchievement(def({ id: 'two', criteriaThreshold: 10 }));

    engine.incrementProgress('orchid', 'one', 1);
    engine.incrementProgress('orchid', 'two', 3);

    const unlocked = engine.listUnlocked('orchid').map((p) => p.achievementId);
    const inProgress = engine.listInProgress('orchid').map((p) => p.achievementId);

    expect(unlocked).toEqual(['one']);
    expect(inProgress).toEqual(['two']);
  });

  it('keeps unknown dynasty views empty and summary zeroed', () => {
    const engine = createAchievementEngine(deps());

    expect(engine.listUnlocked('unknown')).toHaveLength(0);
    expect(engine.listInProgress('unknown')).toHaveLength(0);

    const summary = engine.getDynastySummary('unknown');
    expect(summary.totalUnlocked).toBe(0);
    expect(summary.totalProgress).toBe(0);
    expect(summary.totalRewardsClaimed).toBe(0n);
  });

  it('emits progress, unlock, and reward events in causal order', () => {
    const engine = createAchievementEngine(deps());
    engine.defineAchievement(def({ id: 'timeline', criteriaThreshold: 2, rewardMicroKalon: 400n }));

    nowUs += 10;
    engine.incrementProgress('atlas', 'timeline', 1);
    nowUs += 10;
    engine.incrementProgress('atlas', 'timeline', 1);
    nowUs += 10;
    engine.claimReward('atlas', 'timeline');

    const kinds = events.map((e) => e.kind);
    expect(kinds).toEqual(['PROGRESS_UPDATED', 'ACHIEVEMENT_UNLOCKED', 'REWARD_GRANTED']);
    expect(events[0].timestamp).toBeLessThan(events[1].timestamp);
    expect(events[1].timestamp).toBeLessThan(events[2].timestamp);
  });

  it('throws on unknown achievement operations', () => {
    const engine = createAchievementEngine(deps());

    expect(() => engine.incrementProgress('dawn', 'missing', 1)).toThrow('Achievement missing not found');
    expect(() => engine.claimReward('dawn', 'missing')).toThrow('Achievement missing not found');
  });
});
