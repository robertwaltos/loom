import { describe, expect, it } from 'vitest';
import { createGuildSystem } from '../guild-system.js';

describe('guild-system simulation', () => {
  const make = () => {
    let now = 1_000_000n;
    let id = 0;
    return createGuildSystem({
      clock: { nowMicroseconds: () => (now += 1_000_000n) },
      idGen: { generateId: () => `gs-${++id}` },
      logger: { info: () => undefined },
    });
  };

  it('simulates guild treasury governance with rank-gated withdrawals', () => {
    const guilds = make();

    const created = guilds.createGuild('Iron Pact', 'leader-1', 'world-1', 1_000n);
    expect(typeof created).toBe('object');
    if (typeof created === 'string') return;

    const guildId = created.guildId;
    guilds.addMember(guildId, 'member-1');
    guilds.addMember(guildId, 'officer-1');
    guilds.changeRank(guildId, 'officer-1', 'OFFICER');

    const dep = guilds.depositToTreasury(guildId, 'member-1', 300n);
    expect(dep.success).toBe(true);

    const denied = guilds.withdrawFromTreasury(guildId, 'member-1', 100n);
    expect(denied.success).toBe(false);

    const approved = guilds.withdrawFromTreasury(guildId, 'officer-1', 200n);
    expect(approved.success).toBe(true);

    const stats = guilds.getGuildStats(guildId);
    expect(stats?.treasury).toBe(1_100n);
    expect(stats?.totalContributions).toBe(300n);
  });

  it('simulates leadership invariants, activity feed, and member composition changes', () => {
    const guilds = make();

    const created = guilds.createGuild('Aurora Circle', 'leader-a', 'world-2');
    expect(typeof created).toBe('object');
    if (typeof created === 'string') return;

    const guildId = created.guildId;
    guilds.addMember(guildId, 'member-a');
    guilds.addMember(guildId, 'member-b');

    const removeLeader = guilds.removeMember(guildId, 'leader-a');
    expect(removeLeader.success).toBe(false);

    guilds.changeRank(guildId, 'member-a', 'LEADER');
    expect(guilds.getGuild(guildId)?.leaderId).toBe('member-a');

    const removeMember = guilds.removeMember(guildId, 'member-b');
    expect(removeMember.success).toBe(true);

    const log = guilds.getActivityLog(guildId, 20);
    expect(log.length).toBeGreaterThanOrEqual(5);

    const snapshot = guilds.getGuildStats(guildId);
    expect(snapshot?.memberCount).toBe(2);
  });
});
