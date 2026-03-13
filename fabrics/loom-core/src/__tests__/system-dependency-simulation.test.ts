import { describe, expect, it } from 'vitest';
import { createSystemDependencyGraph } from '../system-dependency.js';

describe('system-dependency simulation', () => {
  it('simulates dependency registration, ordering, cycle detection, and graph mutation', () => {
    let now = 1_000_000;
    const graph = createSystemDependencyGraph({
      clock: { nowMicroseconds: () => (now += 1_000) },
    });

    graph.register({ systemId: 'input' });
    graph.register({ systemId: 'physics', dependsOn: ['input'] });
    graph.register({ systemId: 'ai', dependsOn: ['input'] });
    graph.register({ systemId: 'render', dependsOn: ['physics', 'ai'] });

    const order = graph.getExecutionOrder();
    graph.register({ systemId: 'cycle-a', dependsOn: ['cycle-b'] });
    graph.register({ systemId: 'cycle-b', dependsOn: ['cycle-a'] });
    const hasCycle = graph.hasCycle();
    graph.unregister('cycle-a');
    graph.unregister('cycle-b');

    expect(order).toBeDefined();
    expect(order?.indexOf('input')).toBeLessThan(order?.indexOf('physics') ?? -1);
    expect(order?.indexOf('input')).toBeLessThan(order?.indexOf('ai') ?? -1);
    expect(hasCycle).toBe(true);
    expect(graph.getStats().totalSystems).toBe(4);
  });
});
