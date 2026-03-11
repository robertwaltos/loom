/**
 * Achievement System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAchievementSystem,
  type AchievementSystem,
  type AchievementError,
} from '../achievement-system.js';

class TestClock {
  private readonly currentUs = 1_000_000_000n;
  nowUs(): bigint {
    return this.currentUs;
  }
}

class TestIdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return 'id-' + String(this.counter);
  }
}

class TestLogger {
  debug(_msg: string): void {}
  info(_msg: string): void {}
  warn(_msg: string): void {}
  error(_msg: string): void {}
}

function makeDeps() {
  return { clock: new TestClock(), idGen: new TestIdGenerator(), logger: new TestLogger() };
}

describe('Achievement — defineAchievement', () => {
  let system: AchievementSystem;

  beforeEach(() => {
    system = createAchievementSystem(makeDeps());
  });

  it('defines a new achievement', () => {
    const result = system.defineAchievement(
      'ach-1',
      'First Blood',
      'Kill enemy',
      'COMMON',
      10,
      false,
    );
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.achievementId).toBe('ach-1');
      expect(result.rarity).toBe('COMMON');
      expect(result.pointValue).toBe(10);
    }
  });

  it('rejects duplicate achievementId', () => {
    system.defineAchievement('ach-1', 'Title', 'Desc', 'RARE', 50, false);
    expect(
      system.defineAchievement('ach-1', 'Other', 'Desc', 'COMMON', 10, false),
    ).toBe<AchievementError>('already-defined');
  });

  it('supports hidden achievements', () => {
    const result = system.defineAchievement('secret', 'Secret', 'Hidden', 'LEGENDARY', 100, true);
    if (typeof result !== 'string') expect(result.hidden).toBe(true);
  });
});

describe('Achievement — registerPlayer', () => {
  let system: AchievementSystem;

  beforeEach(() => {
    system = createAchievementSystem(makeDeps());
  });

  it('registers a new player', () => {
    expect(system.registerPlayer('player-1').success).toBe(true);
  });

  it('rejects duplicate player registration', () => {
    system.registerPlayer('player-1');
    const result = system.registerPlayer('player-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<AchievementError>('already-registered');
  });
});

describe('Achievement — unlockAchievement', () => {
  let system: AchievementSystem;

  beforeEach(() => {
    system = createAchievementSystem(makeDeps());
    system.defineAchievement('ach-1', 'Title', 'Desc', 'COMMON', 25, false);
    system.registerPlayer('player-1');
  });

  it('unlocks an achievement for a player', () => {
    const result = system.unlockAchievement('player-1', 'ach-1');
    expect(result.success).toBe(true);
    if (result.success) expect(result.playerAchievement.pointsEarned).toBe(25);
  });

  it('rejects unlock for unknown player', () => {
    const result = system.unlockAchievement('nobody', 'ach-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<AchievementError>('player-not-found');
  });

  it('rejects unlock for unknown achievement', () => {
    const result = system.unlockAchievement('player-1', 'no-such');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<AchievementError>('achievement-not-found');
  });

  it('rejects double unlock', () => {
    system.unlockAchievement('player-1', 'ach-1');
    const result = system.unlockAchievement('player-1', 'ach-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<AchievementError>('already-unlocked');
  });
});

describe('Achievement — initProgress and trackProgress', () => {
  let system: AchievementSystem;

  beforeEach(() => {
    system = createAchievementSystem(makeDeps());
    system.defineAchievement('ach-1', 'Title', 'Desc', 'RARE', 50, false);
    system.registerPlayer('player-1');
  });

  it('inits a progress tracker', () => {
    system.initProgress('player-1', 'ach-1', 10);
    const tracker = system.getProgress('player-1', 'ach-1');
    expect(tracker?.currentProgress).toBe(0);
    expect(tracker?.requiredProgress).toBe(10);
    expect(tracker?.completed).toBe(false);
  });

  it('tracks incremental progress without completing', () => {
    system.initProgress('player-1', 'ach-1', 5);
    const result = system.trackProgress('player-1', 'ach-1', 3);
    expect(result.success).toBe(true);
    if (result.success) expect(result.completed).toBe(false);
  });

  it('auto-unlocks when progress reaches required', () => {
    system.initProgress('player-1', 'ach-1', 5);
    const result = system.trackProgress('player-1', 'ach-1', 5);
    expect(result.success).toBe(true);
    if (result.success) expect(result.completed).toBe(true);
    expect(system.listUnlocked('player-1').length).toBe(1);
  });

  it('rejects trackProgress when already completed', () => {
    system.initProgress('player-1', 'ach-1', 1);
    system.trackProgress('player-1', 'ach-1', 1);
    const result = system.trackProgress('player-1', 'ach-1', 1);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<AchievementError>('already-unlocked');
  });

  it('rejects duplicate initProgress for same player+achievement', () => {
    system.initProgress('player-1', 'ach-1', 10);
    const result = system.initProgress('player-1', 'ach-1', 10);
    expect(result.success).toBe(false);
  });
});

describe('Achievement — getPlayerStats', () => {
  let system: AchievementSystem;

  beforeEach(() => {
    system = createAchievementSystem(makeDeps());
    system.registerPlayer('player-1');
  });

  it('returns zero stats for new player', () => {
    const stats = system.getPlayerStats('player-1');
    expect(stats?.totalPoints).toBe(0);
    expect(stats?.completionPercent).toBe(0);
  });

  it('accumulates points on unlock', () => {
    system.defineAchievement('a1', 'A1', 'D', 'COMMON', 10, false);
    system.defineAchievement('a2', 'A2', 'D', 'RARE', 50, false);
    system.unlockAchievement('player-1', 'a1');
    system.unlockAchievement('player-1', 'a2');
    expect(system.getPlayerStats('player-1')?.totalPoints).toBe(60);
  });

  it('tracks completionPercent correctly', () => {
    system.defineAchievement('a1', 'A1', 'D', 'COMMON', 10, false);
    system.defineAchievement('a2', 'A2', 'D', 'COMMON', 10, false);
    system.unlockAchievement('player-1', 'a1');
    expect(system.getPlayerStats('player-1')?.completionPercent).toBe(50);
  });

  it('counts by rarity', () => {
    system.defineAchievement('a1', 'A1', 'D', 'LEGENDARY', 200, false);
    system.unlockAchievement('player-1', 'a1');
    const stats = system.getPlayerStats('player-1');
    expect(stats?.byRarity['LEGENDARY']).toBe(1);
    expect(stats?.byRarity['COMMON']).toBe(0);
  });

  it('returns undefined for unknown player', () => {
    expect(system.getPlayerStats('nobody')).toBeUndefined();
  });
});

describe('Achievement — listAchievements', () => {
  let system: AchievementSystem;

  beforeEach(() => {
    system = createAchievementSystem(makeDeps());
  });

  it('lists only visible achievements by default', () => {
    system.defineAchievement('vis', 'V', 'D', 'COMMON', 10, false);
    system.defineAchievement('hid', 'H', 'D', 'LEGENDARY', 100, true);
    expect(system.listAchievements().length).toBe(1);
  });

  it('includes hidden when flag is true', () => {
    system.defineAchievement('vis', 'V', 'D', 'COMMON', 10, false);
    system.defineAchievement('hid', 'H', 'D', 'LEGENDARY', 100, true);
    expect(system.listAchievements(true).length).toBe(2);
  });

  it('returns 100% completion when all unlocked', () => {
    system.defineAchievement('a1', 'A1', 'D', 'COMMON', 10, false);
    system.registerPlayer('player-1');
    system.unlockAchievement('player-1', 'a1');
    expect(system.getPlayerStats('player-1')?.completionPercent).toBe(100);
  });
});
