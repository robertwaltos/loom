import { describe, it, expect } from 'vitest';
import { createGuildRegistry, DEFAULT_GUILD_CONFIG } from '../guild-registry.js';
import type { GuildRegistryDeps } from '../guild-registry.js';

function makeDeps(): GuildRegistryDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'guild-' + String(++idCounter) },
  };
}

describe('GuildRegistry — create and disband', () => {
  it('creates a guild', () => {
    const registry = createGuildRegistry(makeDeps());
    const guild = registry.create({
      name: 'Starfarers',
      worldId: 'w1',
      leaderId: 'd1',
    });
    expect(guild.name).toBe('Starfarers');
    expect(guild.memberCount).toBe(1);
  });

  it('retrieves a guild by id', () => {
    const registry = createGuildRegistry(makeDeps());
    const guild = registry.create({
      name: 'Starfarers',
      worldId: 'w1',
      leaderId: 'd1',
    });
    expect(registry.getGuild(guild.guildId)?.name).toBe('Starfarers');
  });

  it('disbands a guild', () => {
    const registry = createGuildRegistry(makeDeps());
    const guild = registry.create({
      name: 'Starfarers',
      worldId: 'w1',
      leaderId: 'd1',
    });
    expect(registry.disband(guild.guildId)).toBe(true);
    expect(registry.getGuild(guild.guildId)).toBeUndefined();
  });

  it('returns false for unknown disband', () => {
    const registry = createGuildRegistry(makeDeps());
    expect(registry.disband('missing')).toBe(false);
  });

  it('clears dynasty membership on disband', () => {
    const registry = createGuildRegistry(makeDeps());
    const guild = registry.create({
      name: 'Starfarers',
      worldId: 'w1',
      leaderId: 'd1',
    });
    registry.disband(guild.guildId);
    expect(registry.getDynastyGuild('d1')).toBeUndefined();
  });
});

describe('GuildRegistry — membership', () => {
  it('adds a member', () => {
    const registry = createGuildRegistry(makeDeps());
    const guild = registry.create({
      name: 'G',
      worldId: 'w1',
      leaderId: 'd1',
    });
    expect(registry.join(guild.guildId, 'd2')).toBe(true);
    expect(registry.isMember(guild.guildId, 'd2')).toBe(true);
  });

  it('rejects duplicate member', () => {
    const registry = createGuildRegistry(makeDeps());
    const guild = registry.create({
      name: 'G',
      worldId: 'w1',
      leaderId: 'd1',
    });
    expect(registry.join(guild.guildId, 'd1')).toBe(false);
  });

  it('rejects dynasty already in another guild', () => {
    const registry = createGuildRegistry(makeDeps());
    registry.create({ name: 'G1', worldId: 'w1', leaderId: 'd1' });
    const g2 = registry.create({
      name: 'G2',
      worldId: 'w1',
      leaderId: 'd2',
    });
    expect(registry.join(g2.guildId, 'd1')).toBe(false);
  });

  it('enforces max members', () => {
    const registry = createGuildRegistry(makeDeps(), { maxMembers: 2 });
    const guild = registry.create({
      name: 'G',
      worldId: 'w1',
      leaderId: 'd1',
    });
    registry.join(guild.guildId, 'd2');
    expect(registry.join(guild.guildId, 'd3')).toBe(false);
  });

  it('removes a member', () => {
    const registry = createGuildRegistry(makeDeps());
    const guild = registry.create({
      name: 'G',
      worldId: 'w1',
      leaderId: 'd1',
    });
    registry.join(guild.guildId, 'd2');
    expect(registry.leave(guild.guildId, 'd2')).toBe(true);
    expect(registry.isMember(guild.guildId, 'd2')).toBe(false);
  });

  it('uses default max members', () => {
    expect(DEFAULT_GUILD_CONFIG.maxMembers).toBe(50);
  });
});

describe('GuildRegistry — queries', () => {
  it('lists guilds by world', () => {
    const registry = createGuildRegistry(makeDeps());
    registry.create({ name: 'G1', worldId: 'w1', leaderId: 'd1' });
    registry.create({ name: 'G2', worldId: 'w1', leaderId: 'd2' });
    registry.create({ name: 'G3', worldId: 'w2', leaderId: 'd3' });
    expect(registry.listByWorld('w1')).toHaveLength(2);
  });

  it('finds dynasty guild', () => {
    const registry = createGuildRegistry(makeDeps());
    const guild = registry.create({
      name: 'G',
      worldId: 'w1',
      leaderId: 'd1',
    });
    expect(registry.getDynastyGuild('d1')).toBe(guild.guildId);
  });

  it('returns undefined for unaffiliated dynasty', () => {
    const registry = createGuildRegistry(makeDeps());
    expect(registry.getDynastyGuild('d1')).toBeUndefined();
  });
});

describe('GuildRegistry — stats', () => {
  it('starts with zero stats', () => {
    const registry = createGuildRegistry(makeDeps());
    const stats = registry.getStats();
    expect(stats.totalGuilds).toBe(0);
    expect(stats.totalMembers).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const registry = createGuildRegistry(makeDeps());
    const g1 = registry.create({
      name: 'G1',
      worldId: 'w1',
      leaderId: 'd1',
    });
    registry.join(g1.guildId, 'd2');
    registry.join(g1.guildId, 'd3');
    registry.create({ name: 'G2', worldId: 'w1', leaderId: 'd4' });
    const stats = registry.getStats();
    expect(stats.totalGuilds).toBe(2);
    expect(stats.totalMembers).toBe(4);
    expect(stats.largestGuild).toBe(3);
  });
});
