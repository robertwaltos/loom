import { describe, it, expect } from 'vitest';
import { createEntityGroupManager } from '../entity-group.js';
import type { EntityGroupDeps } from '../entity-group.js';

function makeDeps(): EntityGroupDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('EntityGroupManager — group lifecycle', () => {
  it('creates a group', () => {
    const mgr = createEntityGroupManager(makeDeps());
    expect(mgr.createGroup({ groupId: 'enemies' })).toBe(true);
    expect(mgr.getGroup('enemies')?.groupId).toBe('enemies');
  });

  it('rejects duplicate group', () => {
    const mgr = createEntityGroupManager(makeDeps());
    mgr.createGroup({ groupId: 'g1' });
    expect(mgr.createGroup({ groupId: 'g1' })).toBe(false);
  });

  it('removes a group', () => {
    const mgr = createEntityGroupManager(makeDeps());
    mgr.createGroup({ groupId: 'g1' });
    expect(mgr.removeGroup('g1')).toBe(true);
    expect(mgr.getGroup('g1')).toBeUndefined();
  });

  it('returns false for unknown removal', () => {
    const mgr = createEntityGroupManager(makeDeps());
    expect(mgr.removeGroup('missing')).toBe(false);
  });

  it('lists all groups', () => {
    const mgr = createEntityGroupManager(makeDeps());
    mgr.createGroup({ groupId: 'a' });
    mgr.createGroup({ groupId: 'b' });
    expect(mgr.listGroups()).toHaveLength(2);
  });
});

describe('EntityGroupManager — membership', () => {
  it('adds a member', () => {
    const mgr = createEntityGroupManager(makeDeps());
    mgr.createGroup({ groupId: 'g1' });
    expect(mgr.addMember('g1', 'e1')).toBe(true);
    expect(mgr.isMember('g1', 'e1')).toBe(true);
  });

  it('rejects duplicate member', () => {
    const mgr = createEntityGroupManager(makeDeps());
    mgr.createGroup({ groupId: 'g1' });
    mgr.addMember('g1', 'e1');
    expect(mgr.addMember('g1', 'e1')).toBe(false);
  });

  it('returns false for unknown group', () => {
    const mgr = createEntityGroupManager(makeDeps());
    expect(mgr.addMember('missing', 'e1')).toBe(false);
  });

  it('removes a member', () => {
    const mgr = createEntityGroupManager(makeDeps());
    mgr.createGroup({ groupId: 'g1' });
    mgr.addMember('g1', 'e1');
    expect(mgr.removeMember('g1', 'e1')).toBe(true);
    expect(mgr.isMember('g1', 'e1')).toBe(false);
  });

  it('returns false for non-member in unknown group', () => {
    const mgr = createEntityGroupManager(makeDeps());
    expect(mgr.isMember('missing', 'e1')).toBe(false);
  });
});

describe('EntityGroupManager — cross-group queries', () => {
  it('finds groups an entity belongs to', () => {
    const mgr = createEntityGroupManager(makeDeps());
    mgr.createGroup({ groupId: 'g1' });
    mgr.createGroup({ groupId: 'g2' });
    mgr.createGroup({ groupId: 'g3' });
    mgr.addMember('g1', 'e1');
    mgr.addMember('g2', 'e1');
    expect(mgr.getEntityGroups('e1')).toHaveLength(2);
  });

  it('returns empty for unknown entity', () => {
    const mgr = createEntityGroupManager(makeDeps());
    expect(mgr.getEntityGroups('missing')).toHaveLength(0);
  });
});

describe('EntityGroupManager — stats', () => {
  it('starts with zero stats', () => {
    const mgr = createEntityGroupManager(makeDeps());
    const stats = mgr.getStats();
    expect(stats.totalGroups).toBe(0);
    expect(stats.totalMemberships).toBe(0);
    expect(stats.largestGroupSize).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const mgr = createEntityGroupManager(makeDeps());
    mgr.createGroup({ groupId: 'g1' });
    mgr.createGroup({ groupId: 'g2' });
    mgr.addMember('g1', 'e1');
    mgr.addMember('g1', 'e2');
    mgr.addMember('g1', 'e3');
    mgr.addMember('g2', 'e1');
    const stats = mgr.getStats();
    expect(stats.totalGroups).toBe(2);
    expect(stats.totalMemberships).toBe(4);
    expect(stats.largestGroupSize).toBe(3);
  });
});
