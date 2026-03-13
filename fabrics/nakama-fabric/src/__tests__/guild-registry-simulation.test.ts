import { describe, expect, it } from 'vitest';
import { createGuildRegistry } from '../guild-registry.js';

describe('guild-registry simulation', () => {
  const make = () => {
    let now = 1_000_000;
    let id = 0;
    return createGuildRegistry(
      {
        clock: { nowMicroseconds: () => (now += 1_000_000) },
        idGenerator: { next: () => `guild-${++id}` },
      },
      { maxMembers: 3 },
    );
  };

  it('simulates world-scoped guild growth with capacity and uniqueness constraints', () => {
    const registry = make();

    const alpha = registry.create({ name: 'Alpha', worldId: 'w1', leaderId: 'd1' });
    const beta = registry.create({ name: 'Beta', worldId: 'w2', leaderId: 'd2' });

    expect(registry.join(alpha.guildId, 'd3')).toBe(true);
    expect(registry.join(alpha.guildId, 'd4')).toBe(true);
    expect(registry.join(alpha.guildId, 'd5')).toBe(false);

    expect(registry.join(beta.guildId, 'd3')).toBe(false);

    expect(registry.listByWorld('w1')).toHaveLength(1);
    expect(registry.listByWorld('w2')).toHaveLength(1);
    expect(registry.getDynastyGuild('d4')).toBe(alpha.guildId);
  });

  it('simulates membership churn and disband cleanup reflected in global stats', () => {
    const registry = make();

    const guild = registry.create({ name: 'Nova', worldId: 'w1', leaderId: 'lead' });
    registry.join(guild.guildId, 'm1');
    registry.join(guild.guildId, 'm2');
    registry.leave(guild.guildId, 'm2');

    const pre = registry.getStats();
    expect(pre.totalGuilds).toBe(1);
    expect(pre.totalMembers).toBe(2);
    expect(pre.largestGuild).toBe(2);

    registry.disband(guild.guildId);

    const post = registry.getStats();
    expect(post.totalGuilds).toBe(0);
    expect(post.totalMembers).toBe(0);
    expect(registry.getDynastyGuild('lead')).toBeUndefined();
    expect(registry.getDynastyGuild('m1')).toBeUndefined();
  });
});
