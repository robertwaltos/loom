/**
 * Scene Graph System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSceneGraphSystem,
  type SceneGraphSystem,
  type Transform,
  type SceneError,
} from '../scene-graph.js';

class TestClock {
  private currentUs = 1_000_000_000n;
  nowUs(): bigint {
    return this.currentUs;
  }
  advance(deltaUs: bigint): void {
    this.currentUs = this.currentUs + deltaUs;
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

const IDENTITY: Transform = {
  x: 0,
  y: 0,
  z: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
};

function makeTransform(x: number, y: number, z: number): Transform {
  return { x, y, z, rotX: 0, rotY: 0, rotZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1 };
}

describe('SceneGraph — addNode', () => {
  let graph: SceneGraphSystem;

  beforeEach(() => {
    const clock = new TestClock();
    const idGen = new TestIdGenerator();
    const logger = new TestLogger();
    graph = createSceneGraphSystem({ clock, idGen, logger });
  });

  it('adds a root node successfully', () => {
    const result = graph.addNode('root', 'Root Node', null, IDENTITY);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.nodeId).toBe('root');
    expect(result.label).toBe('Root Node');
    expect(result.parentId).toBeNull();
    expect(result.childIds).toHaveLength(0);
  });

  it('sets worldTransform equal to localTransform for root nodes', () => {
    const local = makeTransform(5, 10, 15);
    const result = graph.addNode('root', 'Root', null, local);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.worldTransform.x).toBe(5);
    expect(result.worldTransform.y).toBe(10);
    expect(result.worldTransform.z).toBe(15);
  });

  it('adds a child node with correct parentId', () => {
    graph.addNode('root', 'Root', null, IDENTITY);
    const result = graph.addNode('child', 'Child', 'root', makeTransform(1, 2, 3));
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.parentId).toBe('root');
  });

  it('returns already-exists for duplicate nodeId', () => {
    graph.addNode('node1', 'Node 1', null, IDENTITY);
    const result = graph.addNode('node1', 'Duplicate', null, IDENTITY);
    expect(result).toBe('already-exists' satisfies SceneError);
  });

  it('returns parent-not-found when parentId does not exist', () => {
    const result = graph.addNode('child', 'Child', 'nonexistent', IDENTITY);
    expect(result).toBe('parent-not-found' satisfies SceneError);
  });

  it('composes world transform from parent', () => {
    graph.addNode('root', 'Root', null, makeTransform(10, 0, 0));
    const result = graph.addNode('child', 'Child', 'root', makeTransform(5, 0, 0));
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.worldTransform.x).toBe(15);
  });

  it('updates parent childIds when child is added', () => {
    graph.addNode('root', 'Root', null, IDENTITY);
    graph.addNode('child', 'Child', 'root', IDENTITY);
    const root = graph.getNode('root');
    expect(root?.childIds).toContain('child');
  });
});

describe('SceneGraph — removeNode', () => {
  let graph: SceneGraphSystem;

  beforeEach(() => {
    graph = createSceneGraphSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
  });

  it('removes a leaf node and returns count 1', () => {
    graph.addNode('root', 'Root', null, IDENTITY);
    graph.addNode('leaf', 'Leaf', 'root', IDENTITY);
    const result = graph.removeNode('leaf');
    expect(result).toEqual({ success: true, removedCount: 1 });
    expect(graph.getNode('leaf')).toBeUndefined();
  });

  it('removes a subtree recursively', () => {
    graph.addNode('root', 'Root', null, IDENTITY);
    graph.addNode('child', 'Child', 'root', IDENTITY);
    graph.addNode('grandchild', 'Grandchild', 'child', IDENTITY);
    const result = graph.removeNode('child');
    expect(result).toEqual({ success: true, removedCount: 2 });
    expect(graph.getNode('child')).toBeUndefined();
    expect(graph.getNode('grandchild')).toBeUndefined();
    expect(graph.getNode('root')).toBeDefined();
  });

  it('returns node-not-found for unknown nodeId', () => {
    const result = graph.removeNode('ghost');
    expect(result).toEqual({ success: false, error: 'node-not-found' });
  });

  it('detaches removed node from parent childIds', () => {
    graph.addNode('root', 'Root', null, IDENTITY);
    graph.addNode('child', 'Child', 'root', IDENTITY);
    graph.removeNode('child');
    const root = graph.getNode('root');
    expect(root?.childIds).not.toContain('child');
  });
});

describe('SceneGraph — reparent', () => {
  let graph: SceneGraphSystem;

  beforeEach(() => {
    graph = createSceneGraphSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    graph.addNode('root', 'Root', null, makeTransform(0, 0, 0));
    graph.addNode('A', 'A', 'root', makeTransform(1, 0, 0));
    graph.addNode('B', 'B', 'root', makeTransform(10, 0, 0));
  });

  it('reparents a node to a new parent', () => {
    const result = graph.reparent('A', 'B');
    expect(result).toEqual({ success: true });
    const a = graph.getNode('A');
    expect(a?.parentId).toBe('B');
  });

  it('updates world transform after reparent', () => {
    graph.reparent('A', 'B');
    const a = graph.getNode('A');
    // B world x=10, A local x=1 → world x=11
    expect(a?.worldTransform.x).toBe(11);
  });

  it('returns circular-reference when reparenting to own descendant', () => {
    graph.addNode('child', 'Child', 'A', makeTransform(0, 0, 0));
    const result = graph.reparent('A', 'child');
    expect(result).toEqual({ success: false, error: 'circular-reference' });
  });

  it('returns node-not-found for unknown nodeId', () => {
    const result = graph.reparent('ghost', 'root');
    expect(result).toEqual({ success: false, error: 'node-not-found' });
  });

  it('returns parent-not-found for unknown newParentId', () => {
    const result = graph.reparent('A', 'ghost');
    expect(result).toEqual({ success: false, error: 'parent-not-found' });
  });

  it('reparents to root (null parent)', () => {
    const result = graph.reparent('A', null);
    expect(result).toEqual({ success: true });
    const a = graph.getNode('A');
    expect(a?.parentId).toBeNull();
    expect(a?.worldTransform.x).toBe(1);
  });
});

describe('SceneGraph — setLocalTransform', () => {
  let graph: SceneGraphSystem;

  beforeEach(() => {
    graph = createSceneGraphSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    graph.addNode('root', 'Root', null, makeTransform(0, 0, 0));
    graph.addNode('child', 'Child', 'root', makeTransform(1, 0, 0));
    graph.addNode('grandchild', 'Grandchild', 'child', makeTransform(1, 0, 0));
  });

  it('updates localTransform on the node', () => {
    graph.setLocalTransform('child', makeTransform(5, 0, 0));
    const child = graph.getNode('child');
    expect(child?.localTransform.x).toBe(5);
  });

  it('propagates world transform to descendants', () => {
    graph.setLocalTransform('child', makeTransform(5, 0, 0));
    const grandchild = graph.getNode('grandchild');
    expect(grandchild?.worldTransform.x).toBe(6);
  });

  it('returns node-not-found for unknown nodeId', () => {
    const result = graph.setLocalTransform('ghost', IDENTITY);
    expect(result).toEqual({ success: false, error: 'node-not-found' });
  });
});

describe('SceneGraph — getAncestors', () => {
  let graph: SceneGraphSystem;

  beforeEach(() => {
    graph = createSceneGraphSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    graph.addNode('root', 'Root', null, IDENTITY);
    graph.addNode('mid', 'Mid', 'root', IDENTITY);
    graph.addNode('leaf', 'Leaf', 'mid', IDENTITY);
  });

  it('returns ancestors ordered from direct parent to root', () => {
    const ancestors = graph.getAncestors('leaf');
    expect(ancestors.map((n) => n.nodeId)).toEqual(['mid', 'root']);
  });

  it('returns empty array for root node', () => {
    expect(graph.getAncestors('root')).toHaveLength(0);
  });

  it('returns empty array for unknown nodeId', () => {
    expect(graph.getAncestors('ghost')).toHaveLength(0);
  });
});

describe('SceneGraph — getStats', () => {
  it('returns zero stats for empty graph', () => {
    const graph = createSceneGraphSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    const stats = graph.getStats();
    expect(stats.totalNodes).toBe(0);
    expect(stats.maxDepth).toBe(0);
    expect(stats.rootCount).toBe(0);
  });

  it('counts multiple roots', () => {
    const graph = createSceneGraphSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    graph.addNode('r1', 'R1', null, IDENTITY);
    graph.addNode('r2', 'R2', null, IDENTITY);
    expect(graph.getStats().rootCount).toBe(2);
  });

  it('reports maxDepth correctly for a three-level tree', () => {
    const graph = createSceneGraphSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    graph.addNode('root', 'Root', null, IDENTITY);
    graph.addNode('mid', 'Mid', 'root', IDENTITY);
    graph.addNode('leaf', 'Leaf', 'mid', IDENTITY);
    expect(graph.getStats().maxDepth).toBe(2);
  });
});
