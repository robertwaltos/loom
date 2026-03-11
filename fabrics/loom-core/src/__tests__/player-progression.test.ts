/**
 * Player Progression System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPlayerProgressionSystem,
  type PlayerProgressionSystem,
  type ProgressionError,
} from '../player-progression.js';

class TestClock {
  private currentUs = 1_000_000_000n;
  nowUs(): bigint {
    return this.currentUs;
  }
  advance(deltaUs: bigint): void {
    this.currentUs += deltaUs;
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

describe('PlayerProgression — registerPlayer', () => {
  let system: PlayerProgressionSystem;

  beforeEach(() => {
    system = createPlayerProgressionSystem(makeDeps());
  });

  it('registers at level 1 with 0 XP', () => {
    const result = system.registerPlayer('player-1');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.currentLevel).toBe(1);
      expect(result.currentXp).toBe(0n);
      expect(result.xpToNextLevel).toBe(100n);
    }
  });

  it('accepts optional starting XP', () => {
    const result = system.registerPlayer('player-1', 50n);
    if (typeof result !== 'string') expect(result.currentXp).toBe(50n);
  });

  it('rejects duplicate registration', () => {
    system.registerPlayer('player-1');
    expect(system.registerPlayer('player-1')).toBe<ProgressionError>('already-registered');
  });

  it('stores starting XP without auto-leveling', () => {
    const result = system.registerPlayer('player-1', 200n);
    if (typeof result !== 'string') {
      expect(result.currentLevel).toBe(1);
      expect(result.currentXp).toBe(200n);
    }
  });
});

describe('PlayerProgression — defineSkill', () => {
  let system: PlayerProgressionSystem;

  beforeEach(() => {
    system = createPlayerProgressionSystem(makeDeps());
  });

  it('defines a skill', () => {
    const result = system.defineSkill('fire-1', 'Fireball', 'Cast fire', 5, 200n, null);
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.skillId).toBe('fire-1');
      expect(result.maxRank).toBe(5);
      expect(result.prerequisiteSkillId).toBeNull();
    }
  });

  it('rejects duplicate skillId', () => {
    system.defineSkill('fire-1', 'Fireball', 'Cast', 5, 200n, null);
    expect(system.defineSkill('fire-1', 'Other', 'Desc', 3, 100n, null)).toBe<ProgressionError>(
      'already-defined',
    );
  });

  it('supports prerequisite skills', () => {
    system.defineSkill('fire-1', 'Fire I', 'Basic', 3, 100n, null);
    const result = system.defineSkill('fire-2', 'Fire II', 'Advanced', 5, 300n, 'fire-1');
    if (typeof result !== 'string') expect(result.prerequisiteSkillId).toBe('fire-1');
  });
});

describe('PlayerProgression — grantXp', () => {
  let system: PlayerProgressionSystem;

  beforeEach(() => {
    system = createPlayerProgressionSystem(makeDeps());
    system.registerPlayer('player-1');
  });

  it('grants XP without leveling up', () => {
    const result = system.grantXp('player-1', 50n);
    expect(result.success).toBe(true);
    if (result.success) expect(result.levelsGained).toBe(0);
  });

  it('levels up when XP threshold reached', () => {
    const result = system.grantXp('player-1', 100n);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.levelsGained).toBe(1);
      expect(result.newLevel).toBe(2);
    }
  });

  it('levels up multiple times from a single grant', () => {
    const result = system.grantXp('player-1', 500n);
    expect(result.success).toBe(true);
    if (result.success) expect(result.levelsGained).toBeGreaterThanOrEqual(2);
  });

  it('still accumulates totalXpEarned at max level', () => {
    system.grantXp('player-1', 1_000_000n);
    const before = system.getLevel('player-1');
    system.grantXp('player-1', 999n);
    const after = system.getLevel('player-1');
    expect(after?.totalXpEarned).toBeGreaterThan(before?.totalXpEarned ?? 0n);
  });

  it('rejects grant for unknown player', () => {
    const result = system.grantXp('nobody', 100n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<ProgressionError>('player-not-found');
  });
});

describe('PlayerProgression — learnSkill', () => {
  let system: PlayerProgressionSystem;

  beforeEach(() => {
    system = createPlayerProgressionSystem(makeDeps());
    system.registerPlayer('player-1', 1000n);
    system.defineSkill('fire-1', 'Fire I', 'Basic', 3, 100n, null);
    system.defineSkill('fire-2', 'Fire II', 'Advanced', 3, 300n, 'fire-1');
  });

  it('learns a skill when player has sufficient XP', () => {
    expect(system.learnSkill('player-1', 'fire-1').success).toBe(true);
  });

  it('deducts XP on skill learn', () => {
    const before = system.getLevel('player-1')?.currentXp ?? 0n;
    system.learnSkill('player-1', 'fire-1');
    const after = system.getLevel('player-1')?.currentXp ?? 0n;
    expect(after).toBeLessThan(before);
  });

  it('rejects learning when insufficient XP', () => {
    system.registerPlayer('player-2', 50n);
    const result = system.learnSkill('player-2', 'fire-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<ProgressionError>('insufficient-xp');
  });

  it('rejects learning unknown skill', () => {
    const result = system.learnSkill('player-1', 'no-skill');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<ProgressionError>('skill-not-found');
  });

  it('enforces prerequisite skill', () => {
    const result = system.learnSkill('player-1', 'fire-2');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<ProgressionError>('prerequisite-not-met');
  });

  it('allows learning after prerequisite is met', () => {
    system.learnSkill('player-1', 'fire-1');
    expect(system.learnSkill('player-1', 'fire-2').success).toBe(true);
  });
});

describe('PlayerProgression — upgradeSkill', () => {
  let system: PlayerProgressionSystem;

  beforeEach(() => {
    system = createPlayerProgressionSystem(makeDeps());
    system.registerPlayer('player-1', 1000n);
    system.defineSkill('sk-1', 'Skill', 'Desc', 5, 100n, null);
    system.defineSkill('sk-max', 'MaxSkill', 'Desc', 1, 100n, null);
  });

  it('upgrades a learned skill', () => {
    system.learnSkill('player-1', 'sk-1');
    const result = system.upgradeSkill('player-1', 'sk-1');
    expect(result.success).toBe(true);
    if (result.success) expect(result.newRank).toBe(2);
  });

  it('rejects upgrade when at max rank', () => {
    system.learnSkill('player-1', 'sk-max');
    const result = system.upgradeSkill('player-1', 'sk-max');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<ProgressionError>('max-level');
  });

  it('rejects upgrade of unlearned skill', () => {
    const result = system.upgradeSkill('player-1', 'sk-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<ProgressionError>('skill-not-found');
  });
});

describe('PlayerProgression — getLevel, getSkill, listSkills, getStats', () => {
  let system: PlayerProgressionSystem;

  beforeEach(() => {
    system = createPlayerProgressionSystem(makeDeps());
    system.registerPlayer('player-1', 1000n);
    system.defineSkill('sk-1', 'S1', 'D', 5, 100n, null);
    system.defineSkill('sk-2', 'S2', 'D', 5, 100n, null);
  });

  it('returns level for registered player', () => {
    expect(system.getLevel('player-1')?.currentLevel).toBe(1);
  });

  it('returns undefined for unknown player', () => {
    expect(system.getLevel('nobody')).toBeUndefined();
  });

  it('returns player skill after learning', () => {
    system.learnSkill('player-1', 'sk-1');
    expect(system.getSkill('player-1', 'sk-1')?.currentRank).toBe(1);
  });

  it('returns undefined for unlearned skill', () => {
    expect(system.getSkill('player-1', 'sk-1')).toBeUndefined();
  });

  it('lists all learned skills', () => {
    system.learnSkill('player-1', 'sk-1');
    system.learnSkill('player-1', 'sk-2');
    expect(system.listSkills('player-1').length).toBe(2);
  });

  it('returns stats with correct skillsLearned and totalSkillRanks', () => {
    system.learnSkill('player-1', 'sk-1');
    system.upgradeSkill('player-1', 'sk-1');
    const stats = system.getStats('player-1');
    expect(stats?.skillsLearned).toBe(1);
    expect(stats?.totalSkillRanks).toBe(2);
  });

  it('returns undefined stats for unknown player', () => {
    expect(system.getStats('nobody')).toBeUndefined();
  });
});
