import { describe, it, expect } from 'vitest';
import { createGenealogyTreeEngine } from '../genealogy-tree.js';
import type {
  GenealogyDeps,
  GenealogyTreeEngine,
  FamilyNode,
  AncestorQuery,
  DescendantQuery,
  CommonAncestorResult,
} from '../genealogy-tree.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function makeDeps(): GenealogyDeps & { advance: (us: number) => void } {
  let now = 1_000_000;
  let counter = 0;
  return {
    advance: (us: number) => {
      now += us;
    },
    clock: { nowMicroseconds: () => now },
    idGenerator: {
      next: () => {
        counter += 1;
        return 'tree-id-' + String(counter);
      },
    },
  };
}

function makeEngine(): { engine: GenealogyTreeEngine; deps: ReturnType<typeof makeDeps> } {
  const deps = makeDeps();
  return { engine: createGenealogyTreeEngine(deps), deps };
}

function isNode(r: FamilyNode | string): r is FamilyNode {
  return typeof r !== 'string';
}

function isAncestorQuery(r: AncestorQuery | string): r is AncestorQuery {
  return typeof r !== 'string';
}

function isDescendantQuery(r: DescendantQuery | string): r is DescendantQuery {
  return typeof r !== 'string';
}

// ─── addMember ────────────────────────────────────────────────────────

describe('addMember', () => {
  it('adds a member successfully', () => {
    const { engine } = makeEngine();
    const result = engine.addMember({
      memberId: 'm1',
      dynastyId: 'd1',
      displayName: 'Elder Voss',
      role: 'founder',
    });
    expect(isNode(result)).toBe(true);
    if (!isNode(result)) return;
    expect(result.memberId).toBe('m1');
    expect(result.dynastyId).toBe('d1');
    expect(result.displayName).toBe('Elder Voss');
    expect(result.role).toBe('founder');
    expect(result.parentIds).toHaveLength(0);
    expect(result.childIds).toHaveLength(0);
  });

  it('rejects adding the same member twice in same dynasty', () => {
    const { engine } = makeEngine();
    engine.addMember({
      memberId: 'm1',
      dynastyId: 'd1',
      displayName: 'Elder Voss',
      role: 'founder',
    });
    const result = engine.addMember({
      memberId: 'm1',
      dynastyId: 'd1',
      displayName: 'Duplicate',
      role: 'heir',
    });
    expect(typeof result).toBe('string');
    expect(result as string).toContain('already exists');
  });

  it('allows same memberId in different dynasties', () => {
    const { engine } = makeEngine();
    const r1 = engine.addMember({
      memberId: 'm1',
      dynastyId: 'd1',
      displayName: 'Name A',
      role: 'founder',
    });
    const r2 = engine.addMember({
      memberId: 'm1',
      dynastyId: 'd2',
      displayName: 'Name B',
      role: 'founder',
    });
    expect(isNode(r1)).toBe(true);
    expect(isNode(r2)).toBe(true);
  });

  it('updates the dynasty tree on add', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'm1', dynastyId: 'd1', displayName: 'Elder', role: 'founder' });
    const tree = engine.getTree('d1');
    expect(tree).toBeDefined();
    expect(tree?.memberCount).toBe(1);
  });

  it('timestamps members with clock', () => {
    const { engine, deps } = makeEngine();
    deps.advance(1000);
    const result = engine.addMember({
      memberId: 'm1',
      dynastyId: 'd1',
      displayName: 'Elder',
      role: 'founder',
    });
    expect(isNode(result)).toBe(true);
    if (!isNode(result)) return;
    expect(result.addedAt).toBe(1_001_000);
  });

  it('returns member via getMember', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'm1', dynastyId: 'd1', displayName: 'Elder', role: 'founder' });
    const node = engine.getMember('m1', 'd1');
    expect(node).toBeDefined();
    expect(node?.memberId).toBe('m1');
  });

  it('returns undefined for unknown member', () => {
    const { engine } = makeEngine();
    expect(engine.getMember('ghost', 'd1')).toBeUndefined();
  });
});

// ─── setParent ────────────────────────────────────────────────────────

describe('setParent', () => {
  it('links parent and child bidirectionally', () => {
    const { engine } = makeEngine();
    engine.addMember({
      memberId: 'parent',
      dynastyId: 'd1',
      displayName: 'Parent',
      role: 'founder',
    });
    engine.addMember({ memberId: 'child', dynastyId: 'd1', displayName: 'Child', role: 'heir' });
    const result = engine.setParent('child', 'parent', 'd1');
    expect(isNode(result)).toBe(true);
    if (!isNode(result)) return;
    expect(result.parentIds).toContain('parent');

    const parentNode = engine.getMember('parent', 'd1');
    expect(parentNode?.childIds).toContain('child');
  });

  it('rejects self-parenting', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'm1', dynastyId: 'd1', displayName: 'Elder', role: 'founder' });
    const result = engine.setParent('m1', 'm1', 'd1');
    expect(typeof result).toBe('string');
    expect(result as string).toContain('cannot be the same');
  });

  it('rejects unknown child', () => {
    const { engine } = makeEngine();
    engine.addMember({
      memberId: 'parent',
      dynastyId: 'd1',
      displayName: 'Parent',
      role: 'founder',
    });
    const result = engine.setParent('ghost', 'parent', 'd1');
    expect(typeof result).toBe('string');
    expect(result as string).toContain('ghost');
  });

  it('rejects unknown parent', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'child', dynastyId: 'd1', displayName: 'Child', role: 'heir' });
    const result = engine.setParent('child', 'ghost', 'd1');
    expect(typeof result).toBe('string');
    expect(result as string).toContain('ghost');
  });

  it('rejects cycle creation (child cannot become ancestor of parent)', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'a', dynastyId: 'd1', displayName: 'A', role: 'founder' });
    engine.addMember({ memberId: 'b', dynastyId: 'd1', displayName: 'B', role: 'heir' });
    engine.setParent('b', 'a', 'd1'); // a → b
    const result = engine.setParent('a', 'b', 'd1'); // would create b → a → b
    expect(typeof result).toBe('string');
    expect(result as string).toContain('cycle');
  });

  it('does not duplicate parents on double call', () => {
    const { engine } = makeEngine();
    engine.addMember({
      memberId: 'parent',
      dynastyId: 'd1',
      displayName: 'Parent',
      role: 'founder',
    });
    engine.addMember({ memberId: 'child', dynastyId: 'd1', displayName: 'Child', role: 'heir' });
    engine.setParent('child', 'parent', 'd1');
    engine.setParent('child', 'parent', 'd1');
    const child = engine.getMember('child', 'd1');
    expect(child?.parentIds.filter((id) => id === 'parent')).toHaveLength(1);
  });
});

// ─── getAncestors ─────────────────────────────────────────────────────

describe('getAncestors', () => {
  it('returns error for unknown member', () => {
    const { engine } = makeEngine();
    const result = engine.getAncestors({ memberId: 'ghost', dynastyId: 'd1' });
    expect(typeof result).toBe('string');
  });

  it('returns empty ancestors for root member', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'm1', dynastyId: 'd1', displayName: 'Root', role: 'founder' });
    const result = engine.getAncestors({ memberId: 'm1', dynastyId: 'd1' });
    expect(isAncestorQuery(result)).toBe(true);
    if (!isAncestorQuery(result)) return;
    expect(result.ancestors).toHaveLength(0);
    expect(result.maxDepth).toBe(0);
  });

  it('returns parent at generation 1', () => {
    const { engine } = makeEngine();
    engine.addMember({
      memberId: 'grandparent',
      dynastyId: 'd1',
      displayName: 'GP',
      role: 'founder',
    });
    engine.addMember({ memberId: 'parent', dynastyId: 'd1', displayName: 'P', role: 'heir' });
    engine.addMember({ memberId: 'child', dynastyId: 'd1', displayName: 'C', role: 'heir' });
    engine.setParent('parent', 'grandparent', 'd1');
    engine.setParent('child', 'parent', 'd1');
    const result = engine.getAncestors({ memberId: 'child', dynastyId: 'd1' });
    expect(isAncestorQuery(result)).toBe(true);
    if (!isAncestorQuery(result)) return;
    const gen1 = result.ancestors.find((a) => a.memberId === 'parent');
    expect(gen1?.generation).toBe(1);
    const gen2 = result.ancestors.find((a) => a.memberId === 'grandparent');
    expect(gen2?.generation).toBe(2);
  });

  it('respects maxGenerations limit', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'gp', dynastyId: 'd1', displayName: 'GP', role: 'founder' });
    engine.addMember({ memberId: 'p', dynastyId: 'd1', displayName: 'P', role: 'heir' });
    engine.addMember({ memberId: 'c', dynastyId: 'd1', displayName: 'C', role: 'heir' });
    engine.setParent('p', 'gp', 'd1');
    engine.setParent('c', 'p', 'd1');
    const result = engine.getAncestors({ memberId: 'c', dynastyId: 'd1', maxGenerations: 1 });
    expect(isAncestorQuery(result)).toBe(true);
    if (!isAncestorQuery(result)) return;
    expect(result.ancestors).toHaveLength(1);
    expect(result.ancestors[0]?.memberId).toBe('p');
  });
});

// ─── getDescendants ───────────────────────────────────────────────────

describe('getDescendants', () => {
  it('returns error for unknown member', () => {
    const { engine } = makeEngine();
    const result = engine.getDescendants({ memberId: 'ghost', dynastyId: 'd1' });
    expect(typeof result).toBe('string');
  });

  it('returns empty for leaf member', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'm1', dynastyId: 'd1', displayName: 'Leaf', role: 'heir' });
    const result = engine.getDescendants({ memberId: 'm1', dynastyId: 'd1' });
    expect(isDescendantQuery(result)).toBe(true);
    if (!isDescendantQuery(result)) return;
    expect(result.descendants).toHaveLength(0);
  });

  it('returns children at generation 1', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'root', dynastyId: 'd1', displayName: 'Root', role: 'founder' });
    engine.addMember({ memberId: 'child1', dynastyId: 'd1', displayName: 'C1', role: 'heir' });
    engine.addMember({ memberId: 'child2', dynastyId: 'd1', displayName: 'C2', role: 'heir' });
    engine.setParent('child1', 'root', 'd1');
    engine.setParent('child2', 'root', 'd1');
    const result = engine.getDescendants({ memberId: 'root', dynastyId: 'd1' });
    expect(isDescendantQuery(result)).toBe(true);
    if (!isDescendantQuery(result)) return;
    expect(result.descendants).toHaveLength(2);
    const ids = result.descendants.map((d) => d.memberId);
    expect(ids).toContain('child1');
    expect(ids).toContain('child2');
  });

  it('respects maxGenerations limit', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'a', dynastyId: 'd1', displayName: 'A', role: 'founder' });
    engine.addMember({ memberId: 'b', dynastyId: 'd1', displayName: 'B', role: 'heir' });
    engine.addMember({ memberId: 'c', dynastyId: 'd1', displayName: 'C', role: 'heir' });
    engine.setParent('b', 'a', 'd1');
    engine.setParent('c', 'b', 'd1');
    const result = engine.getDescendants({ memberId: 'a', dynastyId: 'd1', maxGenerations: 1 });
    expect(isDescendantQuery(result)).toBe(true);
    if (!isDescendantQuery(result)) return;
    expect(result.descendants).toHaveLength(1);
    expect(result.descendants[0]?.memberId).toBe('b');
  });
});

// ─── getSiblings ──────────────────────────────────────────────────────

describe('getSiblings', () => {
  it('returns empty for member with no parents', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'm1', dynastyId: 'd1', displayName: 'Root', role: 'founder' });
    expect(engine.getSiblings('m1', 'd1')).toHaveLength(0);
  });

  it('returns siblings (children of same parent)', () => {
    const { engine } = makeEngine();
    engine.addMember({
      memberId: 'parent',
      dynastyId: 'd1',
      displayName: 'Parent',
      role: 'founder',
    });
    engine.addMember({ memberId: 's1', dynastyId: 'd1', displayName: 'Sibling 1', role: 'heir' });
    engine.addMember({ memberId: 's2', dynastyId: 'd1', displayName: 'Sibling 2', role: 'heir' });
    engine.addMember({ memberId: 's3', dynastyId: 'd1', displayName: 'Sibling 3', role: 'heir' });
    engine.setParent('s1', 'parent', 'd1');
    engine.setParent('s2', 'parent', 'd1');
    engine.setParent('s3', 'parent', 'd1');
    const siblings = engine.getSiblings('s1', 'd1');
    expect(siblings).toHaveLength(2);
    const ids = siblings.map((s) => s.memberId);
    expect(ids).toContain('s2');
    expect(ids).toContain('s3');
    expect(ids).not.toContain('s1');
  });

  it('returns empty for unknown member', () => {
    const { engine } = makeEngine();
    expect(engine.getSiblings('ghost', 'd1')).toHaveLength(0);
  });
});

// ─── getCommonAncestor ────────────────────────────────────────────────

describe('getCommonAncestor', () => {
  it('returns null commonAncestorId for unrelated members', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'a', dynastyId: 'd1', displayName: 'A', role: 'founder' });
    engine.addMember({ memberId: 'b', dynastyId: 'd1', displayName: 'B', role: 'founder' });
    const result = engine.getCommonAncestor('a', 'b', 'd1');
    expect(result.commonAncestorId).toBeNull();
  });

  it('finds direct parent as common ancestor of siblings', () => {
    const { engine } = makeEngine();
    engine.addMember({
      memberId: 'parent',
      dynastyId: 'd1',
      displayName: 'Parent',
      role: 'founder',
    });
    engine.addMember({ memberId: 's1', dynastyId: 'd1', displayName: 'S1', role: 'heir' });
    engine.addMember({ memberId: 's2', dynastyId: 'd1', displayName: 'S2', role: 'heir' });
    engine.setParent('s1', 'parent', 'd1');
    engine.setParent('s2', 'parent', 'd1');
    const result = engine.getCommonAncestor('s1', 's2', 'd1');
    expect(result.commonAncestorId).toBe('parent');
    expect(result.generationsFromA).toBe(1);
    expect(result.generationsFromB).toBe(1);
  });

  it('finds grandparent as common ancestor of cousins', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'gp', dynastyId: 'd1', displayName: 'GP', role: 'founder' });
    engine.addMember({ memberId: 'p1', dynastyId: 'd1', displayName: 'P1', role: 'heir' });
    engine.addMember({ memberId: 'p2', dynastyId: 'd1', displayName: 'P2', role: 'heir' });
    engine.addMember({ memberId: 'c1', dynastyId: 'd1', displayName: 'C1', role: 'heir' });
    engine.addMember({ memberId: 'c2', dynastyId: 'd1', displayName: 'C2', role: 'heir' });
    engine.setParent('p1', 'gp', 'd1');
    engine.setParent('p2', 'gp', 'd1');
    engine.setParent('c1', 'p1', 'd1');
    engine.setParent('c2', 'p2', 'd1');
    const result = engine.getCommonAncestor('c1', 'c2', 'd1');
    expect(result.commonAncestorId).toBe('gp');
    expect(result.generationsFromA).toBe(2);
    expect(result.generationsFromB).toBe(2);
  });

  it('returns zero generations when no common ancestor found', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'a', dynastyId: 'd1', displayName: 'A', role: 'founder' });
    engine.addMember({ memberId: 'b', dynastyId: 'd1', displayName: 'B', role: 'founder' });
    const result = engine.getCommonAncestor('a', 'b', 'd1');
    expect(result.generationsFromA).toBe(0);
    expect(result.generationsFromB).toBe(0);
  });
});

// ─── getStats ─────────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at zero', () => {
    const { engine } = makeEngine();
    const stats = engine.getStats();
    expect(stats.totalMembers).toBe(0);
    expect(stats.totalDynasties).toBe(0);
    expect(stats.totalParentRelationships).toBe(0);
    expect(stats.deepestTree).toBe(0);
  });

  it('counts members across dynasties', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'm1', dynastyId: 'd1', displayName: 'A', role: 'founder' });
    engine.addMember({ memberId: 'm2', dynastyId: 'd1', displayName: 'B', role: 'heir' });
    engine.addMember({ memberId: 'm3', dynastyId: 'd2', displayName: 'C', role: 'founder' });
    const stats = engine.getStats();
    expect(stats.totalMembers).toBe(3);
    expect(stats.totalDynasties).toBe(2);
  });

  it('counts parent relationships', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'p', dynastyId: 'd1', displayName: 'Parent', role: 'founder' });
    engine.addMember({ memberId: 'c1', dynastyId: 'd1', displayName: 'C1', role: 'heir' });
    engine.addMember({ memberId: 'c2', dynastyId: 'd1', displayName: 'C2', role: 'heir' });
    engine.setParent('c1', 'p', 'd1');
    engine.setParent('c2', 'p', 'd1');
    const stats = engine.getStats();
    expect(stats.totalParentRelationships).toBe(2);
  });

  it('computes deepest tree depth', () => {
    const { engine } = makeEngine();
    engine.addMember({ memberId: 'gp', dynastyId: 'd1', displayName: 'GP', role: 'founder' });
    engine.addMember({ memberId: 'p', dynastyId: 'd1', displayName: 'P', role: 'heir' });
    engine.addMember({ memberId: 'c', dynastyId: 'd1', displayName: 'C', role: 'heir' });
    engine.setParent('p', 'gp', 'd1');
    engine.setParent('c', 'p', 'd1');
    const stats = engine.getStats();
    expect(stats.deepestTree).toBe(2);
  });
});
