import { describe, expect, it } from 'vitest';
import { createSceneGraphSystem, type Transform } from '../scene-graph.js';

function t(x: number, y: number, z: number): Transform {
  return { x, y, z, rotX: 0, rotY: 0, rotZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1 };
}

describe('scene-graph simulation', () => {
  it('simulates hierarchical transforms, reparenting, and subtree removal', () => {
    let now = 1_000_000n;
    const graph = createSceneGraphSystem({
      clock: { nowUs: () => now++ },
      idGen: { generate: () => 'unused' },
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    graph.addNode('root', 'Root', null, t(10, 0, 0));
    graph.addNode('a', 'A', 'root', t(1, 0, 0));
    graph.addNode('b', 'B', 'root', t(5, 0, 0));
    graph.addNode('leaf', 'Leaf', 'a', t(2, 0, 0));

    graph.reparent('leaf', 'b');
    const leafAfter = graph.getNode('leaf');
    const removed = graph.removeNode('b');

    expect(leafAfter?.worldTransform.x).toBe(17);
    expect(removed).toEqual({ success: true, removedCount: 2 });
    expect(graph.getNode('leaf')).toBeUndefined();
    expect(graph.getStats().totalNodes).toBe(2);
  });
});
