import { describe, it, expect } from 'vitest';
import { createNpcSocialNetwork, EVENT_STRENGTH_DELTAS } from '../npc-social.js';
import type { SocialDeps } from '../npc-social.js';

function makeDeps(): SocialDeps {
  let time = 1_000_000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'social-' + String(++id) },
  };
}

describe('SocialNetwork — relationships', () => {
  it('forms a relationship between two NPCs', () => {
    const net = createNpcSocialNetwork(makeDeps());
    const rel = net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'friend',
    });
    expect(rel.fromNpcId).toBe('npc-1');
    expect(rel.toNpcId).toBe('npc-2');
    expect(rel.relationshipType).toBe('friend');
    expect(rel.strength).toBe(0);
  });

  it('sets initial strength', () => {
    const net = createNpcSocialNetwork(makeDeps());
    const rel = net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'family',
      initialStrength: 0.9,
    });
    expect(rel.strength).toBe(0.9);
  });

  it('clamps strength to [-1, 1]', () => {
    const net = createNpcSocialNetwork(makeDeps());
    const rel = net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'enemy',
      initialStrength: -5,
    });
    expect(rel.strength).toBe(-1);
  });

  it('returns existing relationship if already formed', () => {
    const net = createNpcSocialNetwork(makeDeps());
    const r1 = net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'friend',
    });
    const r2 = net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'rival',
    });
    expect(r1.relationshipId).toBe(r2.relationshipId);
  });

  it('retrieves a relationship', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({ fromNpcId: 'npc-1', toNpcId: 'npc-2', relationshipType: 'friend' });
    const rel = net.getRelationship('npc-1', 'npc-2');
    expect(rel).toBeDefined();
    expect(rel?.relationshipType).toBe('friend');
  });

  it('returns undefined for unknown relationship', () => {
    const net = createNpcSocialNetwork(makeDeps());
    expect(net.getRelationship('a', 'b')).toBeUndefined();
  });

  it('removes a relationship', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({ fromNpcId: 'npc-1', toNpcId: 'npc-2', relationshipType: 'friend' });
    expect(net.removeRelationship('npc-1', 'npc-2')).toBe(true);
    expect(net.getRelationship('npc-1', 'npc-2')).toBeUndefined();
  });

  it('removes all relationships for an NPC', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({ fromNpcId: 'npc-1', toNpcId: 'npc-2', relationshipType: 'friend' });
    net.formRelationship({ fromNpcId: 'npc-1', toNpcId: 'npc-3', relationshipType: 'rival' });
    net.formRelationship({ fromNpcId: 'npc-4', toNpcId: 'npc-1', relationshipType: 'mentor' });
    expect(net.removeAllFor('npc-1')).toBe(3);
  });
});

describe('SocialNetwork — strength adjustment', () => {
  it('adjusts relationship strength', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'friend',
      initialStrength: 0.5,
    });
    const newStrength = net.adjustStrength('npc-1', 'npc-2', 0.3);
    expect(newStrength).toBeCloseTo(0.8, 1);
  });

  it('clamps adjusted strength', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'friend',
      initialStrength: 0.9,
    });
    const newStrength = net.adjustStrength('npc-1', 'npc-2', 0.5);
    expect(newStrength).toBe(1);
  });

  it('returns 0 for unknown relationship', () => {
    const net = createNpcSocialNetwork(makeDeps());
    expect(net.adjustStrength('a', 'b', 0.1)).toBe(0);
  });

  it('changes relationship type', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({ fromNpcId: 'npc-1', toNpcId: 'npc-2', relationshipType: 'colleague' });
    expect(net.changeType('npc-1', 'npc-2', 'friend')).toBe(true);
    const rel = net.getRelationship('npc-1', 'npc-2');
    expect(rel?.relationshipType).toBe('friend');
  });
});

describe('SocialNetwork — events', () => {
  it('records a social event and adjusts strength', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'friend',
      initialStrength: 0.5,
    });
    const event = net.recordEvent({ fromNpcId: 'npc-1', toNpcId: 'npc-2', kind: 'gift' });
    expect(event.kind).toBe('gift');
    expect(event.strengthDelta).toBe(EVENT_STRENGTH_DELTAS.gift);
    const rel = net.getRelationship('npc-1', 'npc-2');
    expect(rel?.strength).toBeGreaterThan(0.5);
  });

  it('betrayal significantly reduces strength', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'friend',
      initialStrength: 0.5,
    });
    net.recordEvent({ fromNpcId: 'npc-1', toNpcId: 'npc-2', kind: 'betrayal' });
    const rel = net.getRelationship('npc-1', 'npc-2');
    expect(rel?.strength).toBeLessThan(0.2);
  });

  it('conflict reduces strength', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'colleague',
      initialStrength: 0,
    });
    net.recordEvent({ fromNpcId: 'npc-1', toNpcId: 'npc-2', kind: 'conflict' });
    const rel = net.getRelationship('npc-1', 'npc-2');
    expect(rel?.strength).toBeLessThan(0);
  });
});

describe('SocialNetwork — graph queries', () => {
  it('gets all connections for an NPC', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({ fromNpcId: 'npc-1', toNpcId: 'npc-2', relationshipType: 'friend' });
    net.formRelationship({ fromNpcId: 'npc-3', toNpcId: 'npc-1', relationshipType: 'rival' });
    const connections = net.getConnections('npc-1');
    expect(connections).toHaveLength(2);
  });

  it('finds friends of friends', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'friend',
      initialStrength: 0.5,
    });
    net.formRelationship({
      fromNpcId: 'npc-2',
      toNpcId: 'npc-3',
      relationshipType: 'friend',
      initialStrength: 0.5,
    });
    const fof = net.getFriendsOfFriends('npc-1');
    expect(fof).toContain('npc-3');
    expect(fof).not.toContain('npc-2');
    expect(fof).not.toContain('npc-1');
  });

  it('returns empty for NPC with no friends', () => {
    const net = createNpcSocialNetwork(makeDeps());
    const fof = net.getFriendsOfFriends('loner');
    expect(fof).toHaveLength(0);
  });

  it('finds cliques above min strength', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({
      fromNpcId: 'a',
      toNpcId: 'b',
      relationshipType: 'friend',
      initialStrength: 0.8,
    });
    net.formRelationship({
      fromNpcId: 'b',
      toNpcId: 'c',
      relationshipType: 'friend',
      initialStrength: 0.7,
    });
    net.formRelationship({
      fromNpcId: 'x',
      toNpcId: 'y',
      relationshipType: 'rival',
      initialStrength: -0.5,
    });
    const cliques = net.findCliques(0.5);
    expect(cliques.length).toBeGreaterThanOrEqual(1);
    const abcClique = cliques.find((c) => c.members.includes('a') && c.members.includes('c'));
    expect(abcClique).toBeDefined();
  });

  it('identifies isolated NPCs', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({ fromNpcId: 'npc-1', toNpcId: 'npc-2', relationshipType: 'friend' });
    const isolated = net.getIsolated(['npc-1', 'npc-2', 'npc-3', 'npc-4']);
    expect(isolated).toContain('npc-3');
    expect(isolated).toContain('npc-4');
    expect(isolated).not.toContain('npc-1');
  });
});

describe('SocialNetwork — influence propagation', () => {
  it('propagates opinion through positive relationships', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'friend',
      initialStrength: 0.8,
    });
    net.formRelationship({
      fromNpcId: 'npc-2',
      toNpcId: 'npc-3',
      relationshipType: 'friend',
      initialStrength: 0.6,
    });
    const result = net.propagateInfluence({
      sourceNpcId: 'npc-1',
      opinion: 'tax_increase_bad',
      strength: 1.0,
      maxDepth: 3,
    });
    expect(result.reachedNpcs).toContain('npc-2');
    expect(result.reachedNpcs).toContain('npc-3');
    expect(result.totalInfluenced).toBe(2);
  });

  it('does not propagate through negative relationships', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'enemy',
      initialStrength: -0.5,
    });
    const result = net.propagateInfluence({
      sourceNpcId: 'npc-1',
      opinion: 'war_good',
      strength: 1.0,
      maxDepth: 2,
    });
    expect(result.reachedNpcs).not.toContain('npc-2');
  });

  it('respects max depth', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({
      fromNpcId: 'a',
      toNpcId: 'b',
      relationshipType: 'friend',
      initialStrength: 0.9,
    });
    net.formRelationship({
      fromNpcId: 'b',
      toNpcId: 'c',
      relationshipType: 'friend',
      initialStrength: 0.9,
    });
    net.formRelationship({
      fromNpcId: 'c',
      toNpcId: 'd',
      relationshipType: 'friend',
      initialStrength: 0.9,
    });
    const result = net.propagateInfluence({
      sourceNpcId: 'a',
      opinion: 'test',
      strength: 1.0,
      maxDepth: 1,
    });
    expect(result.reachedNpcs).toContain('b');
    expect(result.reachedNpcs).not.toContain('c');
  });

  it('stores influences on affected NPCs', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'friend',
      initialStrength: 0.8,
    });
    net.propagateInfluence({
      sourceNpcId: 'npc-1',
      opinion: 'market_crash',
      strength: 0.9,
      maxDepth: 1,
    });
    const influences = net.getInfluences('npc-2');
    expect(influences.length).toBeGreaterThan(0);
    expect(influences[0]?.opinion).toBe('market_crash');
  });
});

describe('SocialNetwork — stats', () => {
  it('returns empty stats initially', () => {
    const net = createNpcSocialNetwork(makeDeps());
    const stats = net.getStats();
    expect(stats.totalRelationships).toBe(0);
    expect(stats.totalEvents).toBe(0);
  });

  it('counts relationships and events', () => {
    const net = createNpcSocialNetwork(makeDeps());
    net.formRelationship({
      fromNpcId: 'a',
      toNpcId: 'b',
      relationshipType: 'friend',
      initialStrength: 0.5,
    });
    net.formRelationship({
      fromNpcId: 'b',
      toNpcId: 'c',
      relationshipType: 'colleague',
      initialStrength: 0.3,
    });
    net.recordEvent({ fromNpcId: 'a', toNpcId: 'b', kind: 'meeting' });
    const stats = net.getStats();
    expect(stats.totalRelationships).toBe(2);
    expect(stats.totalEvents).toBe(1);
    expect(stats.averageStrength).toBeCloseTo(0.425, 1);
  });
});
