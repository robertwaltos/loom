/**
 * Simulation tests — dependency-graph
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createDependencyGraphSystem,
  type DependencyGraphSystemDeps,
} from '../dependency-graph.js';

let t = 1_000_000_000n;
let seq = 0;

function makeDeps(): DependencyGraphSystemDeps {
  return {
    clock: { nowMicroseconds: () => (t += 1000n) },
    idGen: { next: () => `dg-${++seq}` },
    logger: { info: vi.fn(), warn: vi.fn() },
  };
}

describe('dependency-graph — service registration', () => {
  it('registers a service successfully', () => {
    const sys = createDependencyGraphSystem(makeDeps());
    const result = sys.registerService('svc-a', 'Service A', '1.0.0');
    expect(result).toMatchObject({ serviceId: 'svc-a', name: 'Service A' });
  });

  it('returns error for duplicate service', () => {
    const sys = createDependencyGraphSystem(makeDeps());
    sys.registerService('svc-a', 'Service A', '1.0.0');
    const result = sys.registerService('svc-a', 'Service A', '1.0.0');
    expect(result).toBe('already-exists');
  });

  it('getService returns undefined for unknown service', () => {
    const sys = createDependencyGraphSystem(makeDeps());
    expect(sys.getService('ghost')).toBeUndefined();
  });
});

describe('dependency-graph — dependencies', () => {
  it('adds a dependency between two services', () => {
    const sys = createDependencyGraphSystem(makeDeps());
    sys.registerService('svc-a', 'Service A', '1.0.0');
    sys.registerService('svc-b', 'Service B', '1.0.0');
    const dep = sys.addDependency('svc-a', 'svc-b', true);
    expect(dep).toMatchObject({ fromServiceId: 'svc-a', toServiceId: 'svc-b' });
  });

  it('getDependencies returns dependencies for a service', () => {
    const sys = createDependencyGraphSystem(makeDeps());
    sys.registerService('svc-a', 'Service A', '1.0.0');
    sys.registerService('svc-b', 'Service B', '1.0.0');
    sys.addDependency('svc-a', 'svc-b', false);
    expect(sys.getDependencies('svc-a').length).toBeGreaterThan(0);
  });

  it('getDependents returns dependents for a service', () => {
    const sys = createDependencyGraphSystem(makeDeps());
    sys.registerService('svc-a', 'Service A', '1.0.0');
    sys.registerService('svc-b', 'Service B', '1.0.0');
    sys.addDependency('svc-a', 'svc-b', false);
    expect(sys.getDependents('svc-b').length).toBeGreaterThan(0);
  });

  it('detectCycles returns empty array for acyclic graph', () => {
    const sys = createDependencyGraphSystem(makeDeps());
    sys.registerService('svc-a', 'Service A', '1.0.0');
    sys.registerService('svc-b', 'Service B', '1.0.0');
    sys.addDependency('svc-a', 'svc-b', true);
    expect(sys.detectCycles()).toEqual([]);
  });

  it('prevents a cycle — addDependency returns circular-dependency', () => {
    const sys = createDependencyGraphSystem(makeDeps());
    sys.registerService('svc-a', 'Service A', '1.0.0');
    sys.registerService('svc-b', 'Service B', '1.0.0');
    sys.addDependency('svc-a', 'svc-b', true);
    const result = sys.addDependency('svc-b', 'svc-a', true);
    expect(result).toBe('circular-dependency');
    expect(sys.detectCycles()).toEqual([]);
  });
});

describe('dependency-graph — health and stats', () => {
  it('updateHealth returns success', () => {
    const sys = createDependencyGraphSystem(makeDeps());
    sys.registerService('svc-a', 'Service A', '1.0.0');
    const result = sys.updateHealth('svc-a', 'DEGRADED');
    expect(result).toMatchObject({ success: true });
  });

  it('getStats returns graph statistics', () => {
    const sys = createDependencyGraphSystem(makeDeps());
    const stats = sys.getStats();
    expect(typeof stats.totalServices).toBe('number');
    expect(typeof stats.totalDependencies).toBe('number');
  });
});
