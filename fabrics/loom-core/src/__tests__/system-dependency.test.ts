import { describe, it, expect } from 'vitest';
import { createSystemDependencyGraph } from '../system-dependency.js';
import type { SystemDependencyDeps } from '../system-dependency.js';

function makeDeps(): SystemDependencyDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('SystemDependencyGraph — registration', () => {
  it('registers a system', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    expect(graph.register({ systemId: 'physics' })).toBe(true);
    expect(graph.getStats().totalSystems).toBe(1);
  });

  it('rejects duplicate registration', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    graph.register({ systemId: 'physics' });
    expect(graph.register({ systemId: 'physics' })).toBe(false);
  });

  it('registers with dependencies', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    graph.register({ systemId: 'input' });
    graph.register({ systemId: 'physics', dependsOn: ['input'] });
    expect(graph.getDependencies('physics')).toEqual(['input']);
  });

  it('unregisters a system', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    graph.register({ systemId: 'physics' });
    expect(graph.unregister('physics')).toBe(true);
    expect(graph.getStats().totalSystems).toBe(0);
  });

  it('returns false for unknown unregister', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    expect(graph.unregister('unknown')).toBe(false);
  });

  it('retrieves node by id', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    graph.register({ systemId: 'render' });
    expect(graph.getNode('render')?.systemId).toBe('render');
  });
});

describe('SystemDependencyGraph — queries', () => {
  it('gets dependents of a system', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    graph.register({ systemId: 'input' });
    graph.register({ systemId: 'physics', dependsOn: ['input'] });
    graph.register({ systemId: 'ai', dependsOn: ['input'] });
    expect(graph.getDependents('input')).toHaveLength(2);
  });

  it('returns empty for no dependents', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    graph.register({ systemId: 'render' });
    expect(graph.getDependents('render')).toHaveLength(0);
  });
});

describe('SystemDependencyGraph — execution order', () => {
  it('computes valid execution order', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    graph.register({ systemId: 'input' });
    graph.register({ systemId: 'physics', dependsOn: ['input'] });
    graph.register({ systemId: 'render', dependsOn: ['physics'] });
    const order = graph.getExecutionOrder();
    expect(order).toBeDefined();
    expect(order).toHaveLength(3);
    const inputIdx = order?.indexOf('input') ?? -1;
    const physIdx = order?.indexOf('physics') ?? -1;
    const renderIdx = order?.indexOf('render') ?? -1;
    expect(inputIdx).toBeLessThan(physIdx);
    expect(physIdx).toBeLessThan(renderIdx);
  });

  it('returns undefined for cyclic dependencies', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    graph.register({ systemId: 'a', dependsOn: ['b'] });
    graph.register({ systemId: 'b', dependsOn: ['a'] });
    expect(graph.getExecutionOrder()).toBeUndefined();
  });

  it('detects cycles', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    graph.register({ systemId: 'a', dependsOn: ['b'] });
    graph.register({ systemId: 'b', dependsOn: ['a'] });
    expect(graph.hasCycle()).toBe(true);
  });

  it('reports no cycle for valid graph', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    graph.register({ systemId: 'a' });
    graph.register({ systemId: 'b', dependsOn: ['a'] });
    expect(graph.hasCycle()).toBe(false);
  });
});

describe('SystemDependencyGraph — stats', () => {
  it('starts with zero stats', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    const stats = graph.getStats();
    expect(stats.totalSystems).toBe(0);
    expect(stats.totalEdges).toBe(0);
    expect(stats.maxDepth).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const graph = createSystemDependencyGraph(makeDeps());
    graph.register({ systemId: 'input' });
    graph.register({ systemId: 'physics', dependsOn: ['input'] });
    graph.register({ systemId: 'render', dependsOn: ['physics'] });
    const stats = graph.getStats();
    expect(stats.totalSystems).toBe(3);
    expect(stats.totalEdges).toBe(2);
    expect(stats.maxDepth).toBe(2);
  });
});
