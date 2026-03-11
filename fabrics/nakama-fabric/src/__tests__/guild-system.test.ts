import { describe, it, expect, beforeEach } from 'vitest';
import { createGuildSystem, type GuildSystem, type GuildSystemDeps } from '../guild-system.js';

function createMockClock() {
  let currentTime = 1_000_000n;
  return {
    nowMicroseconds: () => currentTime,
    advance: (delta: bigint) => {
      currentTime += delta;
    },
  };
}

function createMockIdGen() {
  let counter = 1;
  return {
    generateId: () => {
      const id = 'id-' + String(counter);
      counter += 1;
      return id;
    },
  };
}

function createMockLogger() {
  return {
    info: (_message: string, _meta?: Record<string, unknown>) => undefined,
  };
}

function makeDeps(): GuildSystemDeps {
  return {
    clock: createMockClock(),
    idGen: createMockIdGen(),
    logger: createMockLogger(),
  };
}

describe('GuildSystem — guild creation', () => {
  let system: GuildSystem;

  beforeEach(() => {
    system = createGuildSystem(makeDeps());
  });

  it('creates a guild and returns it', () => {
    const result = system.createGuild('Starfarers', 'leader-1', 'world-1');
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.name).toBe('Starfarers');
      expect(result.leaderId).toBe('leader-1');
      expect(result.worldId).toBe('world-1');
      expect(result.treasuryKalon).toBe(0n);
    }
  });

  it('accepts optional initial treasury', () => {
    const result = system.createGuild('Rich Guild', 'leader-1', 'world-1', 5000n);
    if (typeof result === 'object') {
      expect(result.treasuryKalon).toBe(5000n);
    }
  });

  it('rejects duplicate guild name', () => {
    system.createGuild('Starfarers', 'leader-1', 'world-1');
    const result = system.createGuild('Starfarers', 'leader-2', 'world-2');
    expect(result).toBe('guild-name-taken');
  });

  it('leader starts as LEADER rank member', () => {
    const result = system.createGuild('G', 'leader-1', 'world-1');
    if (typeof result === 'object') {
      expect(system.getMember(result.guildId, 'leader-1')?.rank).toBe('LEADER');
    }
  });

  it('retrieves guild by id', () => {
    const result = system.createGuild('G', 'leader-1', 'world-1');
    if (typeof result === 'object') {
      expect(system.getGuild(result.guildId)?.name).toBe('G');
    }
  });

  it('returns undefined for unknown guild', () => {
    expect(system.getGuild('phantom')).toBeUndefined();
  });
});

describe('GuildSystem — membership', () => {
  let system: GuildSystem;
  let guildId: string;

  beforeEach(() => {
    system = createGuildSystem(makeDeps());
    const g = system.createGuild('G', 'leader-1', 'world-1');
    if (typeof g === 'object') guildId = g.guildId;
  });

  it('adds a new member with INITIATE rank', () => {
    const result = system.addMember(guildId, 'member-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.member.rank).toBe('INITIATE');
    }
  });

  it('rejects adding an already-existing member', () => {
    system.addMember(guildId, 'member-1');
    const result = system.addMember(guildId, 'member-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-member');
  });

  it('rejects adding member to unknown guild', () => {
    const result = system.addMember('phantom', 'member-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('guild-not-found');
  });

  it('removes a non-leader member', () => {
    system.addMember(guildId, 'member-1');
    const result = system.removeMember(guildId, 'member-1');
    expect(result.success).toBe(true);
    expect(system.getMember(guildId, 'member-1')).toBeUndefined();
  });

  it('cannot remove the leader', () => {
    const result = system.removeMember(guildId, 'leader-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('cannot-remove-leader');
  });

  it('returns error when removing non-member', () => {
    const result = system.removeMember(guildId, 'ghost');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('not-member');
  });
});

describe('GuildSystem — rank changes', () => {
  let system: GuildSystem;
  let guildId: string;

  beforeEach(() => {
    system = createGuildSystem(makeDeps());
    const g = system.createGuild('G', 'leader-1', 'world-1');
    if (typeof g === 'object') guildId = g.guildId;
    system.addMember(guildId, 'member-1');
  });

  it('promotes a member to OFFICER', () => {
    const result = system.changeRank(guildId, 'member-1', 'OFFICER');
    expect(result.success).toBe(true);
    expect(system.getMember(guildId, 'member-1')?.rank).toBe('OFFICER');
  });

  it('returns error for rank change on unknown guild', () => {
    const result = system.changeRank('phantom', 'member-1', 'VETERAN');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('guild-not-found');
  });

  it('returns error for rank change on non-member', () => {
    const result = system.changeRank(guildId, 'ghost', 'VETERAN');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('not-member');
  });
});

describe('GuildSystem — treasury', () => {
  let system: GuildSystem;
  let guildId: string;

  beforeEach(() => {
    system = createGuildSystem(makeDeps());
    const g = system.createGuild('G', 'leader-1', 'world-1', 1000n);
    if (typeof g === 'object') guildId = g.guildId;
    system.addMember(guildId, 'member-1');
    system.addMember(guildId, 'officer-1');
    system.changeRank(guildId, 'officer-1', 'OFFICER');
  });

  it('any member can deposit to treasury', () => {
    const result = system.depositToTreasury(guildId, 'member-1', 200n);
    expect(result.success).toBe(true);
    expect(system.getGuild(guildId)?.treasuryKalon).toBe(1200n);
  });

  it('deposit increments member contributionKalon', () => {
    system.depositToTreasury(guildId, 'member-1', 300n);
    expect(system.getMember(guildId, 'member-1')?.contributionKalon).toBe(300n);
  });

  it('officer can withdraw from treasury', () => {
    const result = system.withdrawFromTreasury(guildId, 'officer-1', 500n);
    expect(result.success).toBe(true);
    expect(system.getGuild(guildId)?.treasuryKalon).toBe(500n);
  });

  it('initiate cannot withdraw from treasury', () => {
    const result = system.withdrawFromTreasury(guildId, 'member-1', 100n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('insufficient-rank');
  });

  it('rejects withdrawal exceeding treasury balance', () => {
    const result = system.withdrawFromTreasury(guildId, 'officer-1', 9999n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('insufficient-funds');
  });

  it('rejects deposit of zero', () => {
    const result = system.depositToTreasury(guildId, 'member-1', 0n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-amount');
  });

  it('rejects withdrawal of zero', () => {
    const result = system.withdrawFromTreasury(guildId, 'officer-1', 0n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-amount');
  });
});

describe('GuildSystem — activity log and stats', () => {
  let system: GuildSystem;
  let guildId: string;

  beforeEach(() => {
    system = createGuildSystem(makeDeps());
    const g = system.createGuild('G', 'leader-1', 'world-1');
    if (typeof g === 'object') guildId = g.guildId;
  });

  it('activity log contains JOIN on guild creation', () => {
    const log = system.getActivityLog(guildId, 10);
    expect(log.some((a) => a.type === 'JOIN')).toBe(true);
  });

  it('activity log records member join', () => {
    system.addMember(guildId, 'member-1');
    const log = system.getActivityLog(guildId, 10);
    expect(log.filter((a) => a.type === 'JOIN')).toHaveLength(2);
  });

  it('respects limit on activity log', () => {
    system.addMember(guildId, 'm1');
    system.addMember(guildId, 'm2');
    system.addMember(guildId, 'm3');
    const log = system.getActivityLog(guildId, 2);
    expect(log).toHaveLength(2);
  });

  it('guild stats returns correct member count', () => {
    system.addMember(guildId, 'member-1');
    system.addMember(guildId, 'member-2');
    const stats = system.getGuildStats(guildId);
    expect(stats?.memberCount).toBe(3);
  });

  it('guild stats averageRank includes all members', () => {
    // leader=5, two initiates=1 each → (5+1+1)/3 = 7/3 ≈ 2.33
    system.addMember(guildId, 'm1');
    system.addMember(guildId, 'm2');
    const stats = system.getGuildStats(guildId);
    expect(stats?.averageRank).toBeCloseTo(7 / 3, 5);
  });

  it('guild stats returns undefined for unknown guild', () => {
    expect(system.getGuildStats('phantom')).toBeUndefined();
  });

  it('totalContributions sums all member deposits', () => {
    system.addMember(guildId, 'm1');
    system.changeRank(guildId, 'leader-1', 'LEADER');
    system.depositToTreasury(guildId, 'm1', 300n);
    system.depositToTreasury(guildId, 'm1', 200n);
    const stats = system.getGuildStats(guildId);
    expect(stats?.totalContributions).toBe(500n);
  });
});
